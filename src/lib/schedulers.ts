/* ══════════════════════════════════════════════════════════════
   schedulers.ts — boot-time loops ported from legacy app.js:
   · F4  plan-slot notification pings (web only; native owns its own)
   · C2  evening self-rating prompt (≥21:00, minutes>0, unrated)
   · C3  evening habit ritual prompt (≥21:00, nothing logged today)
   · F7  Sunday week-in-review notification (≥19:00, once/day)
   · F8  rest-day 22:00 toast
   · F9  backup nudge (>7d since last, or never with >5 logged days)
   · G1  streak-freeze boot check
   The C2/C3 prompts only flip a flag in a tiny external store; the
   actual dialogs are rendered by <EveningPrompts /> in React.
   ══════════════════════════════════════════════════════════════ */

import * as S from './storage'
import { commit, state } from './state'
import { toast } from 'sonner'
import { SLOTS, SCHED } from '../data'
import { isRestToday, findTodayIndex, slotStarts } from './schedule'
import { notifOn, notify } from './inbox'
import { maybeSpendFreeze } from './stats'

/* ── tiny external store for the evening prompt flags ── */
type Listener = () => void
const ratingListeners = new Set<Listener>()
const ritualListeners = new Set<Listener>()
let ratingWanted = false
let ritualWanted = false

export function ratingPromptPending(): boolean {
  return ratingWanted
}
export function subscribeRatingPrompt(fn: Listener): () => void {
  ratingListeners.add(fn)
  return () => {
    ratingListeners.delete(fn)
  }
}
export function setRatingPrompt(v: boolean): void {
  ratingWanted = v
  ratingListeners.forEach((fn) => fn())
}
export function ritualPromptPending(): boolean {
  return ritualWanted
}
export function subscribeRitualPrompt(fn: Listener): () => void {
  ritualListeners.add(fn)
  return () => {
    ritualListeners.delete(fn)
  }
}
export function setRitualPrompt(v: boolean): void {
  ritualWanted = v
  ritualListeners.forEach((fn) => fn())
}

/* ── F4: plan slot notifications (web only, 60s loop) ── */
export function checkSlotNotifications(): void {
  if (window.AndroidESE) return
  if (!notifOn()) return
  if (isRestToday(state)) return
  const di = findTodayIndex(state)
  if (di < 0) return
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  const tk = S.todayKey()
  const fired = S.loadJSON<Record<string, unknown>>(S.SLOT_NOTIF_KEY, {})
  const day = fired._day === tk ? fired : { _day: tk }
  const starts = slotStarts()
  SCHED[di].sessions.forEach((s, si) => {
    const st = starts[si]
    if (st == null || day[si]) return
    if (mins < st || mins >= st + 60) return
    day[si] = true
    const done = s.tasks.every((_, ti) => state.checked[`${di}-${si}-${ti}`])
    if (!done) {
      const slot = SLOTS[si]
      notify(`${slot.label} · ${slot.time}`, `${s.title} — ${slot.desc}`)
    }
  })
  S.saveJSON(S.SLOT_NOTIF_KEY, day)
}

/* ── C2: evening self-rating prompt ── */
export function maybeAskRating(): void {
  const k = S.todayKey()
  if (state.ratings[k] !== undefined) return
  const e = state.log[k]
  if (!e || !e.minutes) return
  if (new Date().getHours() < 21) return
  setRatingPrompt(true)
}

/* ── C3: evening habit ritual prompt ── */
export function maybeAskHabits(): void {
  if (!state.habits.length) return
  const k = S.todayKey()
  const todayLog = state.habitLog[k]
  if (todayLog && Object.keys(todayLog).length > 0) return
  if (new Date().getHours() < 21) return
  setRitualPrompt(true)
}

/* ── F8: rest-day 22:00 toast (fire once per day, scheduled to 22:00) ── */
let restDayToastT: ReturnType<typeof setTimeout> | null = null
export function maybeRestDayToast(): void {
  const k = S.todayKey()
  const e = state.log[k]
  if (e && e.minutes && e.sessions) return
  const d = SCHED[state.index]
  if (d && d.badge !== 'RECOVERY') {
    const now = new Date()
    const target = new Date(now)
    target.setHours(22, 0, 0, 0)
    const msUntil = target.getTime() - now.getTime()
    if (msUntil > 0) {
      if (restDayToastT) clearTimeout(restDayToastT)
      restDayToastT = setTimeout(() => {
        restDayToastT = null
        if (!(state.log[S.todayKey()] || {}).sessions) {
          toast('Rest day detected — no sessions tracked. Health comes first.')
        }
      }, msUntil)
    }
  }
}

/* ── F7: Sunday week review ── */
function maybeWeekReview(): void {
  const now = new Date()
  if (now.getDay() !== 0 || now.getHours() < 19) return
  const wk = 'wksum-' + S.todayKey()
  if (S.loadJSON<boolean>(wk, false)) return
  S.saveJSON(wk, true)
  let mins = 0
  let sess = 0
  let mins2 = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const k = `${d.getFullYear()}-${S.fmt(d.getMonth() + 1)}-${S.fmt(d.getDate())}`
    const e = state.log[k] || {}
    mins += e.minutes || 0
    sess += e.sessions || 0
  }
  for (let i = 7; i < 14; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const k = `${d.getFullYear()}-${S.fmt(d.getMonth() + 1)}-${S.fmt(d.getDate())}`
    mins2 += (state.log[k] || {}).minutes || 0
  }
  const diff = mins - mins2
  const h = Math.floor(mins / 60)
  setTimeout(
    () =>
      notify(
        'Week in review',
        `${h}h ${mins % 60}m across ${sess} sessions — ${diff >= 0 ? 'up' : 'down'} ${Math.abs(
          Math.round(diff / 60 / 10) * 10
        )}h vs last week. ${diff >= 0 ? 'Keep the slope.' : 'Reset tomorrow morning.'}`,
        'progress'
      ),
    8000
  )
}

/* ── F9: backup nudge ── */
function maybeBackupNudge(): void {
  const last = S.loadJSON<string | null>(S.BKUP_KEY, null)
  if (last) {
    const days = (Date.now() - new Date(last).getTime()) / 864e5
    if (days > 7) setTimeout(() => toast(`Last backup was ${Math.floor(days)} days ago — You › Export my data`), 6000)
  } else if (Object.keys(state.log).length > 5) {
    setTimeout(() => toast('No backup yet — You › Export my data'), 6000)
  }
}

/* ── boot: install every loop once ── */
export function installSchedulers(): () => void {
  checkSlotNotifications()
  const slotIv = setInterval(checkSlotNotifications, 60000)
  maybeSpendFreeze(state, (m) => toast(m))
  setTimeout(maybeAskRating, 4000)
  const ratingIv = setInterval(maybeAskRating, 10 * 60000)
  setTimeout(maybeAskHabits, 9000)
  const ritualIv = setInterval(maybeAskHabits, 10 * 60000)
  maybeRestDayToast()
  maybeBackupNudge()
  maybeWeekReview()
  commit()
  return () => {
    clearInterval(slotIv)
    clearInterval(ratingIv)
    clearInterval(ritualIv)
  }
}
