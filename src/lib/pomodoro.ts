/* ══════════════════════════════════════════════════════════════
   pomodoro.ts — the timer engine (D1–D14). Byte-faithful port of the
   legacy engine: targetTs-based countdown, minute-by-minute banking,
   phase completion chain (toast/vibrate/sound/notify/loop), native
   timer handoff (startNativeFocus), wake lock, fullscreen.
   React side: usePomoTick() re-renders subscribers every 500ms while
   running; getRemainingPomo() is derived at render time.
   ══════════════════════════════════════════════════════════════ */

import * as S from './storage'
import { state, commit } from './state'
import { toast } from 'sonner'
import { playSound, soundMode, soundVolume } from './sound'
import { notify, logDistraction, setNativeFocusStarted } from './inbox'
import { currentSlotIndex } from './schedule'
import { SLOTS } from '../data'
import { useSyncExternalStore } from 'react'
import { checkAchievements } from './achievements'
import { celebrateBadgeFrom } from '../components/celebration'
import { requestAppFullscreen, exitAppFullscreen } from './fullscreen'
import { enterClock, leaveClock } from './ui-state'
import { emitRitual } from './rituals'

/* ── phases / presets (verbatim legacy) ── */
export const PRESETS = [
  { label: '25 · 5', work: 25, brk: 5 },
  { label: '50 · 10', work: 50, brk: 10 },
  { label: '90 · 20', work: 90, brk: 20 }
]

export function phaseSecs(): number {
  return (state.pomo.phase === 'work' ? state.pomo.workMins : state.pomo.breakMins) * 60
}

export function getRemainingPomo(): number {
  if (state.pomo.running && state.pomo.targetTs)
    return Math.max(0, Math.round((state.pomo.targetTs - Date.now()) / 1000))
  return Math.min(state.pomo.timeLeft ?? phaseSecs(), phaseSecs())
}

export function fmt(n: number): string {
  return String(n).padStart(2, '0')
}
export function fmtTime(s: number): string {
  return `${fmt(Math.floor(s / 60))}:${fmt(s % 60)}`
}

/* ── the 500ms tick — only while running ── */
let pomoInterval: ReturnType<typeof setInterval> | null = null
let tickVersion = 0
const tickListeners = new Set<() => void>()
export function usePomoTick(): number {
  return useSyncExternalStore(
    (l) => {
      tickListeners.add(l)
      return () => tickListeners.delete(l)
    },
    () => tickVersion
  )
}
function startPomoInterval() {
  stopPomoInterval()
  pomoInterval = setInterval(tick, 500)
}
function stopPomoInterval() {
  if (pomoInterval) {
    clearInterval(pomoInterval)
    pomoInterval = null
  }
}
function tick() {
  const r = getRemainingPomo()
  if (r <= 0) {
    completePhase()
    return
  }
  bankProgress()
  tickVersion++
  tickListeners.forEach((l) => l())
}

/* ── sync helpers (boot / visibility) ── */
export function syncPomoState() {
  if (state.pomo.running) {
    const r = getRemainingPomo()
    if (r <= 0) completePhase()
    else startPomoInterval()
    startNativeFocusIfAvailable()
  }
}

/* ── banking: minutes logged as earned, not on completion ── */
export function addMinutes(mins: number) {
  if (mins <= 0) return
  const k = S.todayKey()
  const e = state.log[k] || { sessions: 0, minutes: 0 }
  e.minutes += mins
  const si = currentSlotIndex()
  if (si >= 0) {
    e.slotHits = e.slotHits || {}
    e.slotHits[si] = true
  }
  state.log[k] = e
  S.saveJSON(S.LOG_KEY, state.log)
}
export function bankProgress() {
  if (state.pomo.phase !== 'work') return
  const secs = phaseSecs()
  const remain = getRemainingPomo()
  const elapsed = Math.floor(Math.max(0, secs - remain) / 60)
  const delta = elapsed - (state.pomo.logged || 0)
  if (delta > 0) {
    addMinutes(delta)
    state.pomo.logged = elapsed
    S.saveJSON(S.POMO_KEY, state.pomo)
  }
}
export function logSession(mins: number) {
  const k = S.todayKey()
  const e = state.log[k] || { sessions: 0, minutes: 0 }
  e.sessions += 1
  const remainder = mins - (state.pomo.logged || 0)
  if (remainder > 0) e.minutes += remainder
  const si = currentSlotIndex()
  if (si >= 0) {
    e.slotHits = e.slotHits || {}
    e.slotHits[si] = true
  }
  state.log[k] = e
  S.saveJSON(S.LOG_KEY, state.log)
  state.pomo.logged = 0
}

/* ── phase completion ── */
export function completePhase() {
  stopPomoInterval()
  const wasWork = state.pomo.phase === 'work'
  if (wasWork) {
    const preHits = (state.log[S.todayKey()] || {}).slotHits || {}
    const preCount = Object.keys(preHits).length
    logSession(state.pomo.workMins)
    const postHits = (state.log[S.todayKey()] || {}).slotHits || {}
    if (Object.keys(postHits).length > preCount) {
      const si = currentSlotIndex()
      const slot = SLOTS[si] || { label: 'slot' }
      setTimeout(() => toast(`${slot.label} secured — session streak alive`), 600)
    }
  }
  try {
    navigator.vibrate && navigator.vibrate([120, 60, 120])
  } catch {
    /* headless/unsupported */
  }
  playSound(wasWork ? 'complete' : 'break')
  emitRitual(wasWork ? { type: 'session' } : { type: 'pomo' })
  notify(
    wasWork ? 'Focus session complete' : 'Break over',
    wasWork
      ? `${state.pomo.workMins} min of deep work logged.${state.pomo.loop ? ` ${state.pomo.breakMins} min break starts now.` : ' Take a breather.'}`
      : `Time to get back to focus${state.pomo.loop ? ` — ${state.pomo.workMins} min session starting.` : '.'}`,
    'focus-phase'
  )
  if (state.pomo.loop) {
    state.pomo.phase = wasWork ? 'break' : 'work'
    state.pomo.targetTs = Date.now() + phaseSecs() * 1000
    state.pomo.timeLeft = phaseSecs()
    state.pomo.running = true
    startPomoInterval()
    toast(wasWork ? 'Break time — you earned it' : 'Back to focus')
  } else {
    state.pomo.running = false
    state.pomo.targetTs = null
    state.pomo.phase = wasWork ? 'break' : 'work'
    state.pomo.timeLeft = phaseSecs()
    leaveClock()
    exitAppFullscreen()
    toast(wasWork ? 'Session complete' : 'Break over')
  }
  S.saveJSON(S.POMO_KEY, state.pomo)
  commit()
  if (wasWork) {
    checkAchievements(state, celebrateBadgeFrom)
  }
}

/* ── native timer handoff ── */
let nativeFocusStarted = false
export function startNativeFocusIfAvailable() {
  if (nativeFocusStarted) return
  nativeFocusStarted = true
  setNativeFocusStarted(true)
  if (window.AndroidESE?.startNativeFocus) {
    window.AndroidESE.startNativeFocus(
      state.pomo.workMins,
      state.pomo.breakMins,
      state.pomo.loop,
      !!state.block.strict,
      soundMode(),
      soundVolume(),
      Math.round(getRemainingPomo())
    )
  }
}

/* ── wake lock ── */
let wakeLock: WakeLockSentinel | null = null
async function acquireWakeLock() {
  if (!('wakeLock' in navigator) || wakeLock) return
  try {
    wakeLock = await navigator.wakeLock.request('screen')
    wakeLock.addEventListener('release', () => {
      wakeLock = null
    })
  } catch {
    wakeLock = null
  }
}
function releaseWakeLock() {
  if (!wakeLock) return
  try {
    wakeLock.release()
  } catch {
    /* already released */
  }
  wakeLock = null
}
export function syncWakeLock() {
  if (state.pomo.running && document.visibilityState === 'visible') void acquireWakeLock()
  else releaseWakeLock()
}

/* ── fullscreen ── */
/* fullscreen moved to fullscreen.ts */

/* ── strict mode ── */
export function strictActive(): boolean {
  return !!state.block.strict && state.pomo.running && state.pomo.phase === 'work'
}

/* ── core controls ── */
export function toggleRunning() {
  if (state.pomo.running) {
    bankProgress()
    state.pomo.timeLeft = getRemainingPomo()
    state.pomo.running = false
    state.pomo.targetTs = null
    stopPomoInterval()
    if (window.AndroidESE?.pauseNativeFocus) window.AndroidESE.pauseNativeFocus()
    nativeFocusStarted = false
    setNativeFocusStarted(false)
    playSound('stop')
  } else {
    state.pomo.docked = true
    state.pomo.running = true
    state.pomo.targetTs = Date.now() + getRemainingPomo() * 1000
    startPomoInterval()
    startNativeFocusIfAvailable()
    playSound('start')
    requestAppFullscreen()
    enterClock()
  }
  S.saveJSON(S.POMO_KEY, state.pomo)
  commit()
}

export function toggleDocked() {
  state.pomo.docked = !state.pomo.docked
  S.saveJSON(S.POMO_KEY, state.pomo)
  commit()
}

export function resetPomo() {
  bankProgress()
  const hadMins = (state.pomo.logged || 0) > 0
  if (hadMins) {
    const k = S.todayKey()
    const e = state.log[k]
    if (e) {
      e.sessions += 1
      S.saveJSON(S.LOG_KEY, state.log)
    }
  }
  state.pomo.logged = 0
  const wasRunning = state.pomo.running
  state.pomo.running = false
  state.pomo.targetTs = null
  state.pomo.timeLeft = phaseSecs()
  stopPomoInterval()
  S.saveJSON(S.POMO_KEY, state.pomo)
  commit()
  if (wasRunning && window.AndroidESE?.stopNativeFocus) {
    (window.AndroidESE.stopNativeFocus as unknown as (s?: boolean) => void)(!!state.block.strict)
    nativeFocusStarted = false
    setNativeFocusStarted(false)
  }
  if (wasRunning) playSound('stop')
  if (wasRunning) {
    leaveClock()
    exitAppFullscreen()
  }
  if (hadMins) toast('Stopped - partial time logged')
}

export function skipPhase() {
  if (window.AndroidESE?.skipNativeFocus) window.AndroidESE.skipNativeFocus()
  completePhase()
}

export function setPhase(p: 'work' | 'break') {
  bankProgress()
  state.pomo.logged = 0
  state.pomo.phase = p
  state.pomo.running = false
  state.pomo.targetTs = null
  state.pomo.timeLeft = phaseSecs()
  stopPomoInterval()
  leaveClock()
  exitAppFullscreen()
  if (window.AndroidESE?.stopNativeFocus) {
    (window.AndroidESE.stopNativeFocus as unknown as (s?: boolean) => void)(false)
    nativeFocusStarted = false
    setNativeFocusStarted(false)
  }
  S.saveJSON(S.POMO_KEY, state.pomo)
  commit()
}

export function applyPreset(w: number, b: number) {
  bankProgress()
  state.pomo.logged = 0
  state.pomo.workMins = w
  state.pomo.breakMins = b
  state.pomo.running = false
  state.pomo.targetTs = null
  state.pomo.timeLeft = phaseSecs()
  stopPomoInterval()
  leaveClock()
  exitAppFullscreen()
  if (window.AndroidESE?.stopNativeFocus) {
    (window.AndroidESE.stopNativeFocus as unknown as (s?: boolean) => void)(false)
    nativeFocusStarted = false
    setNativeFocusStarted(false)
  }
  S.saveJSON(S.POMO_KEY, state.pomo)
  commit()
}

export function adjustDuration(which: 'work' | 'break', delta: number) {
  if (which === 'work') state.pomo.workMins = Math.max(5, Math.min(180, state.pomo.workMins + delta))
  else state.pomo.breakMins = Math.max(1, Math.min(60, state.pomo.breakMins + delta))
  if (!state.pomo.running) state.pomo.timeLeft = phaseSecs()
  S.saveJSON(S.POMO_KEY, state.pomo)
  commit()
}

export function toggleLoop() {
  state.pomo.loop = !state.pomo.loop
  S.saveJSON(S.POMO_KEY, state.pomo)
  commit()
}

/* ── visibilitychange (strict interruption logging) ── */
export function installVisibilitySync(): () => void {
  const onVis = () => {
    if (document.visibilityState === 'visible') {
      syncPomoState()
      commit()
    } else {
      bankProgress()
      if (strictActive()) {
        logDistraction()
        notify('Focus interrupted', "You left mid-session. It's logged. Get back in.")
      }
      releaseWakeLock()
      S.saveJSON(S.POMO_KEY, state.pomo)
      if (window.eseRequestCloudSync) window.eseRequestCloudSync()
    }
  }
  document.addEventListener('visibilitychange', onVis)
  return () => document.removeEventListener('visibilitychange', onVis)
}

/* ── boot: resume a timer that was running when the page loaded ── */
export function bootPomodoro() {
  syncPomoState()
  syncWakeLock()
  if (state.pomo.running) tickListeners.forEach((l) => l())
}