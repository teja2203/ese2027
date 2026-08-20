/* ══════════════════════════════════════════════════════════════
   stats.ts — streak / countdown helpers (ported from legacy).
   ══════════════════════════════════════════════════════════════ */

import type { AppState } from './storage'
import { fmt, todayKey, saveJSON, FREEZE_KEY } from './storage'

export const APT_DATE = new Date('2026-08-22T09:00:00')
export const ESE_DATE = new Date('2027-01-31T09:00:00')

export interface Countdown {
  d: number
  h: number
  m: number
}

export function cd(t: number | Date): Countdown {
  const d = +t - Date.now()
  if (d <= 0) return { d: 0, h: 0, m: 0 }
  return { d: Math.floor(d / 864e5), h: Math.floor((d % 864e5) / 36e5), m: Math.floor((d % 36e5) / 6e4) }
}

export function computeStreak(state: AppState): { count: number; hasFrozen: boolean } {
  let streak = 0
  let frozenInStreak = false
  const d = new Date()
  for (;;) {
    const k = `${d.getFullYear()}-${fmt(d.getMonth() + 1)}-${fmt(d.getDate())}`
    const e = state.log[k]
    if (e && (e.minutes > 0 || e.sessions > 0)) streak++
    else if (state.freeze[k]) {
      streak++
      frozenInStreak = true
    } else if (streak === 0 && k === todayKey()) {
      /* today not started yet — look back */
    } else break
    d.setDate(d.getDate() - 1)
  }
  return { count: streak, hasFrozen: frozenInStreak }
}

/* one streak-freeze token per calendar month, auto-spent on a missed day */
export function maybeSpendFreeze(state: AppState, toast: (m: string) => void): void {
  const y = new Date()
  y.setDate(y.getDate() - 1)
  const yk = `${y.getFullYear()}-${fmt(y.getMonth() + 1)}-${fmt(y.getDate())}`
  const e = state.log[yk]
  if (e && (e.minutes > 0 || e.sessions > 0)) return /* yesterday was studied */
  if (state.freeze[yk]) return /* already frozen */
  const b = new Date(y)
  b.setDate(b.getDate() - 1)
  const bk = `${b.getFullYear()}-${fmt(b.getMonth() + 1)}-${fmt(b.getDate())}`
  const be = state.log[bk]
  if (!(be && (be.minutes > 0 || be.sessions > 0)) && !state.freeze[bk]) return
  const mon = yk.slice(0, 7)
  const used = Object.keys(state.freeze).some((k) => k.slice(0, 7) === mon)
  if (used) return /* token already spent this month */
  state.freeze[yk] = true
  saveJSON(FREEZE_KEY, state.freeze)
  setTimeout(() => toast('Streak freeze used for ' + yk.slice(5) + ' · one per month'), 1200)
}