/* ══════════════════════════════════════════════════════════════
   schedule.ts — day/task statistics + slot detection (ported).
   ══════════════════════════════════════════════════════════════ */

import type { AppState } from './storage'
import { fmt, todayKey } from './storage'
import { SLOTS, SCHED, MON } from '../data'
import { computeStreak } from './stats'

export function todayDateLabel(): string {
  const d = new Date()
  return MON[d.getMonth()] + ' ' + d.getDate()
}

export function parsePlanDate(s: string): Date {
  const p = s.split(' ')
  const mi = MON.indexOf(p[0])
  const y = mi >= 6 ? 2026 : 2027
  return new Date(y, mi, parseInt(p[1], 10))
}

/* rest days shift the remaining plan forward (non-destructive) */
export function effDateLabel(state: AppState, i: number): string {
  const b = parsePlanDate(SCHED[i].date)
  const sh = state.restedDays.filter((r) => r.i <= i).length
  b.setDate(b.getDate() + sh)
  return MON[b.getMonth()] + ' ' + b.getDate()
}

export function isRestToday(state: AppState): boolean {
  return state.restedDays.some((r) => r.d === todayKey())
}

export function findTodayIndex(state: AppState): number {
  const t = todayDateLabel()
  for (let i = 0; i < SCHED.length; i++) {
    if (effDateLabel(state, i) === t) return i
  }
  return -1
}

export function dayStats(state: AppState, i: number) {
  const d = SCHED[i]
  if (!d) return { tot: 0, dn: 0, pct: 0 }
  const tot = d.sessions.reduce((a: number, s: { tasks: unknown[] }) => a + s.tasks.length, 0)
  const dn = d.sessions.reduce(
    (a: number, s: { tasks: unknown[] }, si: number) =>
      a + s.tasks.filter((_, ti: number) => state.checked[`${i}-${si}-${ti}`]).length,
    0
  )
  return { tot, dn, pct: tot ? Math.round((dn / tot) * 100) : 0 }
}

export function overall(state: AppState) {
  const tot = SCHED.reduce((a: number, d: { sessions: Array<{ tasks: unknown[] }> }) => a + d.sessions.reduce((b, s) => b + s.tasks.length, 0), 0)
  const dn = Object.values(state.checked).filter(Boolean).length
  return { tot, dn, pct: tot ? Math.round((dn / tot) * 100) : 0 }
}

export function doneDaysCount(state: AppState): number {
  let n = 0
  for (let i = 0; i < SCHED.length; i++) {
    const st = dayStats(state, i)
    if (st.tot && st.dn === st.tot) n++
  }
  return n
}

/* ── slot detection (drives Today hero + slot streaks) ── */
let _slotStarts: Array<number | null> | null = null
export function slotStarts(): Array<number | null> {
  if (_slotStarts) return _slotStarts
  let prev = -1
  _slotStarts = SLOTS.map((s: { time?: string }) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(s.time || '')
    if (!m) return null
    let t = +m[1] * 60 + +m[2]
    while (t <= prev) t += 720 /* times ascend through the day + am/pm rollover */
    prev = t
    return t
  })
  return _slotStarts
}

let _slotEnds: Array<number | null> | null = null
export function slotEnds(): Array<number | null> {
  if (_slotEnds) return _slotEnds
  const starts = slotStarts()
  _slotEnds = SLOTS.map((s: { time?: string }, i: number) => {
    const st = starts[i]
    if (st == null) return null
    const m = /[—–](\d{1,2}):(\d{2})/.exec(s.time || '')
    if (!m) return st + 120
    let t = +m[1] * 60 + +m[2]
    while (t <= st) t += 720
    return t
  })
  return _slotEnds
}

/* which scheduled slot are we inside right now? -1 if none (15 min grace after end) */
export function currentSlotIndex(): number {
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  const st = slotStarts()
  const en = slotEnds()
  for (let i = 0; i < SLOTS.length; i++) {
    if (st[i] != null && mins >= st[i]! && mins < en[i]! + 15) return i
  }
  return -1
}

/* per-slot streak — consecutive days with this slot hit */
export function slotStreak(state: AppState, si: number): number {
  let streak = 0
  const d = new Date()
  for (;;) {
    const k = `${d.getFullYear()}-${fmt(d.getMonth() + 1)}-${fmt(d.getDate())}`
    const e = state.log[k]
    const hit = e && e.slotHits && e.slotHits[si]
    if (hit) streak++
    else if (streak === 0 && k === todayKey()) {
      /* today's slot may still be ahead */
    } else break
    d.setDate(d.getDate() - 1)
  }
  return streak
}

/* session streak — consecutive days with a focus session completed INSIDE a slot window */
export function computeSessionStreak(state: AppState): number {
  let streak = 0
  const d = new Date()
  for (;;) {
    const k = `${d.getFullYear()}-${fmt(d.getMonth() + 1)}-${fmt(d.getDate())}`
    const e = state.log[k]
    const hit = e && e.slotHits && Object.keys(e.slotHits).length > 0
    if (hit) streak++
    else if (streak === 0 && k === todayKey()) {
      /* today's window may still be ahead */
    } else break
    d.setDate(d.getDate() - 1)
  }
  return streak
}

/* today's stats for the Today hero: fixed to the day found by date label,
   falling back to state.index when the label misses (rolled over). */
export function todayFocus(state: AppState) {
  const label = todayDateLabel()
  let idx = SCHED.findIndex((d: { date: string }) => d.date === label)
  const focusIdx = idx >= 0 ? idx : state.index
  const fd = SCHED[focusIdx]
  const st = dayStats(state, focusIdx)
  const tlog = state.log[todayKey()] || { sessions: 0, minutes: 0 }
  const streakObj = computeStreak(state)
  return { focusIdx, fd, st, tlog, streakObj }
}