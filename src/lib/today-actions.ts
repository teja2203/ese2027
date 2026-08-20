/* ══════════════════════════════════════════════════════════════
   today-actions.ts — Today screen mutations (ported verbatim).
   ══════════════════════════════════════════════════════════════ */

import { toast } from 'sonner'
import * as S from './storage'
import { state, commit } from './state'
import { SCHED, RANKER_QUOTES } from '../data'
import { dayStats } from './schedule'
import { checkAchievements } from './achievements'
import { celebrateBadgeFrom, celebrateDayOf } from '../components/celebration'
import { playSound } from './sound'
import { fxFlash } from './celebrate-fx'

/* ── task toggling + undo ── */
interface LastToggle {
  key: string
  prev: boolean
  ts: number
}
let lastToggle: LastToggle | null = null

export function toggleTask(si: number, ti: number) {
  const k = `${state.index}-${si}-${ti}`
  const wasOn = !!state.checked[k]
  lastToggle = { key: k, prev: wasOn, ts: Date.now() }
  if (wasOn) delete state.checked[k]
  else {
    state.checked[k] = true
    playSound('thock')
    fxFlash()
  }
  S.saveJSON(S.STORAGE_KEY, state.checked)
  const session = SCHED[state.index].sessions[si]
  const completed = session.tasks.every((_, x) => state.checked[`${state.index}-${si}-${x}`])
  if (completed) {
    state.expandedSessions[`${state.index}-${si}`] = false
    try {
      navigator.vibrate && navigator.vibrate(40)
    } catch {}
  }
  S.saveJSON(S.EXP_KEY, state.expandedSessions)
  commit()
  const day = dayStats(state, state.index)
  if (day.tot && day.dn === day.tot && !state.celebratedDays[state.index]) {
    state.celebratedDays[state.index] = true
    S.saveJSON(S.CELEB_KEY, state.celebratedDays)
    setTimeout(() => celebrateDayOf(), 350)
  } else {
    checkAchievements(state, celebrateBadgeFrom)
  }
}

export function undoLast() {
  if (!lastToggle || Date.now() - lastToggle.ts > 8000) {
    toast('Nothing to undo')
    return
  }
  if (lastToggle.prev) state.checked[lastToggle.key] = true
  else delete state.checked[lastToggle.key]
  S.saveJSON(S.STORAGE_KEY, state.checked)
  lastToggle = null
  commit()
  toast('Undone')
}

export function toggleShaky(si: number, ti: number) {
  const k = `${state.index}-${si}-${ti}`
  if (state.shaky[k]) delete state.shaky[k]
  else {
    const task = String(SCHED[state.index].sessions[si].tasks[ti])
    const subj = String(SCHED[state.index].subject)
    const d = String(SCHED[state.index].date)
    state.shaky[k] = { t: task, subj, d }
  }
  S.saveJSON(S.SHAKY_KEY, state.shaky)
  toast(state.shaky[k] ? 'Marked shaky — added to revision queue' : 'Removed from revision queue')
  commit()
}

/* ── quote cycling ── */
export function nextQuote() {
  state.quoteIdx = (state.quoteIdx + 1) % RANKER_QUOTES.length
  S.saveJSON(S.QUOTE_IDX_KEY, state.quoteIdx)
  commit()
}

/* ── pixel burst (task check feedback) ── */
export function ntPixelBurst(x: number, y: number) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const N = 16
  for (let i = 0; i < N; i++) {
    const s = document.createElement('span')
    s.className = 'nt-spark'
    s.style.left = x + 'px'
    s.style.top = y + 'px'
    document.body.appendChild(s)
    const ang = Math.PI * 2 * (i / N) + (Math.random() * 0.4 - 0.2)
    const vel = 48 + Math.random() * 58
    const dx = Math.cos(ang) * vel
    const dy = Math.sin(ang) * vel - 18
    s.animate(
      [
        { transform: 'translate(-50%,-50%)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 88}px))`, opacity: 0 }
      ],
      { duration: 560 + Math.random() * 260, easing: 'cubic-bezier(.2,.7,.2,1)' }
    )
    setTimeout(() => s.remove(), 880)
  }
}

/* ── ice-shatter showcase (frozen flame → crack → fire) ── */
export function iceShatterShowcase(iconEl: HTMLElement | null, opts: { backToIce?: boolean } = {}) {
  if (!iconEl) return
  playSound('shatter')
  iconEl.style.position = iconEl.style.position || 'relative'
  iconEl.style.display = 'inline-block'
  iconEl.querySelectorAll('.ice-shard').forEach((s) => s.remove())
  iconEl.classList.remove('ice-shatter', 'fire-glow', 'frost-flame', 'ice-fly-in')
  void iconEl.offsetWidth
  iconEl.classList.add('frost-flame', 'ice-fly-in')
  setTimeout(() => {
    iconEl.classList.remove('ice-fly-in', 'frost-flame')
    void iconEl.offsetWidth
    iconEl.classList.add('ice-shatter')
    ;[-45, 0, 45, 90, 135, 180, 225, 270, 315].forEach((a) => {
      const s = document.createElement('span')
      s.className = 'ice-shard'
      const rad = (a * Math.PI) / 180
      const dist = 24 + Math.random() * 22
      s.style.setProperty('--dx', (Math.cos(rad) * dist).toFixed(1) + 'px')
      s.style.setProperty('--dy', (Math.sin(rad) * dist).toFixed(1) + 'px')
      s.style.setProperty('--rot', (Math.random() * 200 - 100).toFixed(0) + 'deg')
      s.style.animationDuration = (0.45 + Math.random() * 0.3).toFixed(2) + 's'
      s.style.animationDelay = (Math.random() * 0.1).toFixed(2) + 's'
      iconEl.appendChild(s)
      setTimeout(() => s.remove(), 1300)
    })
    setTimeout(() => {
      iconEl.classList.remove('ice-shatter')
      iconEl.innerHTML = ''
      iconEl.classList.add(opts.backToIce ? 'frost-flame' : 'fire-glow')
      if (!opts.backToIce) toast('Ice shattered — streak continues')
    }, 820)
  }, 1050)
}

export { lastToggle }