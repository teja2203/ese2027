/* ══════════════════════════════════════════════════════════════
   achievements.ts — the 30-badge system (ported verbatim).
   ══════════════════════════════════════════════════════════════ */

import type { AppState } from './storage'
import * as S from './storage'
import { SCHED, baseSubj } from '../data'
import { computeStreak } from './stats'
import { computeSessionStreak, doneDaysCount } from './schedule'

export interface Achievement {
  id: string
  icon: string
  title: string
  desc: string
  goal: number
  type: 'sessions' | 'days' | 'streak' | 'sstreak' | 'hours' | 'tasks' | 'mocks' | 'subjects'
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_session', icon: '01', title: 'First Focus Session', desc: 'Complete your first timed session', goal: 1, type: 'sessions' },
  { id: 'first_day', icon: 'D1', title: 'Day One Done', desc: 'Clear every task of a day', goal: 1, type: 'days' },
  { id: 'sessions10', icon: '10', title: '10 Sessions', desc: 'Ten focus sessions in the bank', goal: 10, type: 'sessions' },
  { id: 'sessions50', icon: '50', title: '50 Sessions', desc: 'Fifty rounds of deep work', goal: 50, type: 'sessions' },
  { id: 'sessions150', icon: '150', title: '150 Sessions', desc: 'A hundred and fifty battles fought', goal: 150, type: 'sessions' },
  { id: 'streak3', icon: '3D', title: '3-Day Streak', desc: 'Study three days in a row', goal: 3, type: 'streak' },
  { id: 'streak7', icon: '7D', title: '7-Day Streak', desc: 'A full week without breaking', goal: 7, type: 'streak' },
  { id: 'streak30', icon: '30D', title: '30-Day Streak', desc: 'One month of pure discipline', goal: 30, type: 'streak' },
  { id: 'streak60', icon: '60D', title: '60-Day Streak', desc: 'Two months. Relentless', goal: 60, type: 'streak' },
  { id: 'streak100', icon: '100', title: '100-Day Streak', desc: 'Triple digits of consistency', goal: 100, type: 'streak' },
  { id: 'sstreak3', icon: 'S3', title: 'On Schedule · 3', desc: '3-day session streak — in-slot focus', goal: 3, type: 'sstreak' },
  { id: 'sstreak7', icon: 'S7', title: 'On Schedule · 7', desc: 'A week of hitting your slots', goal: 7, type: 'sstreak' },
  { id: 'sstreak21', icon: 'S21', title: 'Slot Sniper', desc: '21 days of in-slot discipline', goal: 21, type: 'sstreak' },
  { id: 'hours10', icon: '10H', title: '10 Study Hours', desc: 'Ten hours of tracked focus', goal: 10, type: 'hours' },
  { id: 'hours50', icon: '50H', title: '50 Study Hours', desc: 'Fifty hours — serious momentum', goal: 50, type: 'hours' },
  { id: 'hours100', icon: '100', title: '100 Study Hours', desc: 'Triple digits. Elite territory', goal: 100, type: 'hours' },
  { id: 'hours250', icon: '250', title: '250 Study Hours', desc: 'A quarter-thousand hours deep', goal: 250, type: 'hours' },
  { id: 'hours500', icon: '500', title: '500 Study Hours', desc: 'Half a thousand. Rank material', goal: 500, type: 'hours' },
  { id: 'tasks100', icon: '100', title: '100 Tasks Done', desc: 'A hundred boxes ticked', goal: 100, type: 'tasks' },
  { id: 'tasks500', icon: '500', title: '500 Tasks Done', desc: 'Five hundred steps closer', goal: 500, type: 'tasks' },
  { id: 'tasks1000', icon: '1K', title: '1000 Tasks Done', desc: 'A thousand. Unstoppable', goal: 1000, type: 'tasks' },
  { id: 'tasks2000', icon: '2K', title: '2000 Tasks Done', desc: 'Two thousand. Monumental', goal: 2000, type: 'tasks' },
  { id: 'days10', icon: '10D', title: '10 Days Cleared', desc: 'Ten perfect days', goal: 10, type: 'days' },
  { id: 'days50', icon: '50D', title: '50 Days Cleared', desc: 'Fifty flawless days', goal: 50, type: 'days' },
  { id: 'days100', icon: '100', title: '100 Days Cleared', desc: 'One hundred perfect days', goal: 100, type: 'days' },
  { id: 'mock1', icon: 'M1', title: 'First Mock Logged', desc: 'Face the scoreboard once', goal: 1, type: 'mocks' },
  { id: 'mock5', icon: 'M5', title: '5 Mocks Logged', desc: 'Five honest data points', goal: 5, type: 'mocks' },
  { id: 'mock15', icon: 'M15', title: '15 Mocks Logged', desc: 'Fifteen tests faced head-on', goal: 15, type: 'mocks' },
  { id: 'subject1', icon: 'S//1', title: 'First Subject Mastered', desc: 'Finish 100% of any subject', goal: 1, type: 'subjects' },
  { id: 'subject3', icon: 'S//3', title: 'Three Subjects Down', desc: 'Master three full subjects', goal: 3, type: 'subjects' }
]

/* id table — used by storage to normalize Array<AchievementRec> → Record */
export const ACH_IDS: string[] = ACHIEVEMENTS.map((a) => a.id)

export interface AchMetrics {
  sessions: number
  hours: number
  tasks: number
  days: number
  streak: number
  subjects: number
  sstreak: number
  mocks: number
}

export function achMetrics(state: AppState): AchMetrics {
  let sessions = 0
  let minutes = 0
  Object.values(state.log).forEach((e) => {
    sessions += e.sessions || 0
    minutes += e.minutes || 0
  })
  const tasks = Object.values(state.checked).filter(Boolean).length
  const bySubj: Record<string, { tot: number; dn: number }> = {}
  SCHED.forEach((d: { subject: string; sessions: Array<{ tasks: unknown[] }> }, i: number) => {
    const b = baseSubj(d.subject)
    if (!bySubj[b]) bySubj[b] = { tot: 0, dn: 0 }
    d.sessions.forEach((s, si) => {
      bySubj[b].tot += s.tasks.length
      s.tasks.forEach((_, ti) => {
        if (state.checked[`${i}-${si}-${ti}`]) bySubj[b].dn++
      })
    })
  })
  const subjects = Object.values(bySubj).filter((e) => e.tot >= 30 && e.dn === e.tot).length
  return {
    sessions,
    hours: Math.floor(minutes / 60),
    tasks,
    days: doneDaysCount(state),
    streak: computeStreak(state).count,
    subjects,
    sstreak: computeSessionStreak(state),
    mocks: state.mocks.length
  }
}

export function achProgress(a: Achievement, m: AchMetrics): number {
  const v = m[a.type] || 0
  return Math.min(v, a.goal)
}

export function nextAchievement(state: AppState): { a: Achievement; have: number; pct: number } | null {
  const m = achMetrics(state)
  let best: Achievement | null = null
  let bestPct = -1
  for (const a of ACHIEVEMENTS) {
    if (state.achievements[a.id]) continue
    const pct = achProgress(a, m) / a.goal
    if (pct > bestPct) {
      bestPct = pct
      best = a
    }
  }
  return best ? { a: best, have: achProgress(best, m), pct: Math.round(bestPct * 100) } : null
}

/** One badge per call; celebrates the first newly-reached badge, then the
 *  chain continues on close. Returns the badge or null. */
export function checkAchievements(state: AppState, celebrateBadge: (a: Achievement) => void): Achievement | null {
  const m = achMetrics(state)
  for (const a of ACHIEVEMENTS) {
    if (state.achievements[a.id]) continue
    if ((m[a.type] || 0) >= a.goal) {
      state.achievements[a.id] = { at: new Date().toISOString() }
      S.saveJSON(S.ACH_KEY, state.achievements)
      setTimeout(() => celebrateBadge(a), 300)
      return a
    }
  }
  return null
}