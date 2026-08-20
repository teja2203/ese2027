/* ══════════════════════════════════════════════════════════════
   storage.ts — the FROZEN persistence contract.
   Ported verbatim from legacy/js/app.v63.js. Key names, shapes,
   defaults, normalizePomo, the backup payload and the merge policy
   must stay byte-identical to the legacy app — the same
   localStorage keys hold years of real study data.
   Pure module: no React, no zustand, no DOM (Node-testable).
   ══════════════════════════════════════════════════════════════ */

import { SCHED } from '../data'

export const APP_VERSION = '1.3.0'

/* ── keys (identical names — do not rename) ── */
export const STORAGE_KEY = 'ese_planner_checked_v3'
export const IDX_KEY = 'ese_planner_index_v9'
export const NAV_KEY = 'ese_planner_nav_v1'
export const POMO_KEY = 'ese_planner_pomo_v5'
export const LOG_KEY = 'ese_planner_log_v1'
export const THEME_KEY = 'THEME'
export const EXP_KEY = 'expandedSessions'
export const ACH_KEY = 'ese_achievements_v1'
export const CELEB_KEY = 'ese_celebrated_days_v1'
export const NOTIF_KEY = 'ese_notif_v1'
export const BLOCK_KEY = 'ese_block_v1'
export const MOCK_KEY = 'ese_mocks_v1'
export const SHAKY_KEY = 'ese_shaky_v1'
export const RATE_KEY = 'ese_ratings_v1'
export const FREEZE_KEY = 'ese_freeze_v1'
export const BKUP_KEY = 'ese_last_backup_v1'
export const SOUND_KEY = 'ese_sound_v1'
export const REST_KEY = 'ese_rest_v1'
export const RESTED_KEY = 'ese_rested_v1'
export const HABIT_KEY = 'ese_habits_v1'
export const HABIT_LOG_KEY = 'ese_habit_log_v1'
export const DOMAIN_BLOCKS_KEY = 'ese_domain_blocks_v1'
export const DOMAIN_PLANS_KEY = 'ese_domain_plans_v1'
export const INBOX_KEY = 'ese_in_app_notifications_v1'
export const FOCUS_CONTEXT_KEY = 'ese_focus_context_v1'
export const PROF_EXP_KEY = 'ese_prof_exp_v1'
export const SLOT_NOTIF_KEY = 'ese_slot_notified_v1'
export const SOUND_MODE_KEY = 'ese_sound_mode'
export const SOUND_VOL_KEY = 'ese_sound_vol'
export const QUOTE_IDX_KEY = 'ese_quote_idx'

/* ── types (shapes match legacy storage exactly) ── */
export interface DayLog {
  sessions: number
  minutes: number
  slotHits?: Record<number, boolean>
  distract?: number
}
export type LogMap = Record<string, DayLog>

export interface PomoState {
  phase: 'work' | 'break'
  running: boolean
  targetTs: number | null
  timeLeft: number
  workMins: number
  breakMins: number
  loop: boolean
  logged: number
  docked: boolean
  paused?: boolean
}
export interface MockRec {
  name: string
  score: number
  max: number
  neg: number
  note: string
  date: string
}
export interface ShakyRec {
  t: string
  subj: string
  d: string
}
export interface BlockState {
  strict: boolean
  [key: string]: unknown
}
export interface Habit {
  id: string
  name: string
}
export interface RestDay {
  d: string
  i: number
}
export interface AchievementRec {
  at: string
}

/* id table for normalizing legacy Array<AchievementRec> → Record form */
const ACHIEVEMENT_IDS_LOCAL: string[] = [
  'first_session', 'first_day', 'sessions10', 'sessions50', 'sessions150',
  'streak3', 'streak7', 'streak30', 'streak60', 'streak100',
  'sstreak3', 'sstreak7', 'sstreak21',
  'hours10', 'hours50', 'hours100', 'hours250', 'hours500',
  'tasks100', 'tasks500', 'tasks1000', 'tasks2000',
  'days10', 'days50', 'days100',
  'mock1', 'mock5', 'mock15',
  'subject1', 'subject3'
]

export interface AppState {
  nav: string
  index: number
  checked: Record<string, boolean>
  pomo: PomoState
  log: LogMap
  theme: string
  expandedSessions: Record<string, boolean>
  achievements: Record<string, AchievementRec>
  celebratedDays: Record<string, boolean>
  notif: boolean
  block: BlockState
  mocks: MockRec[]
  shaky: Record<string, ShakyRec>
  ratings: Record<string, number | null>
  freeze: Record<string, boolean>
  sound: boolean
  restDayBank: number
  restedDays: RestDay[]
  habits: Habit[]
  habitLog: Record<string, Record<string, boolean>>
}

/* Backup payload = AppState fields + domain records, under the same key
   names the legacy export used (notifications/blocking/plans/…). */
export interface BackupPayload {
  version: string
  exportedAt: string
  checked: Record<string, boolean>
  log: LogMap
  pomo: PomoState
  theme: string
  achievements: Record<string, AchievementRec> | AchievementRec[]
  celebratedDays: Record<string, boolean>
  mocks: MockRec[]
  shaky: Record<string, ShakyRec>
  ratings: Record<string, number | null>
  freeze: Record<string, boolean>
  habits: Habit[]
  habitLog: Record<string, Record<string, boolean>>
  restDayBank: number
  restedDays: RestDay[]
  sound: boolean
  notifications: boolean
  blocking: BlockState
  plans: unknown[]
  focusSessions: unknown[]
  inAppNotifications: unknown[]
}

/* ── primitives ── */
export function loadJSON<T>(k: string, fallback: T): T {
  try {
    const r = localStorage.getItem(k)
    return r === null ? fallback : (JSON.parse(r) as T)
  } catch {
    return fallback
  }
}

let autoBackupTimer: ReturnType<typeof setTimeout> | null = null

/* the live app state, bound by state.ts so auto-backup snapshots are real.
   storage.ts stays pure/Node-testable: the getter defaults to null. */
let stateGetter: () => AppState | null = () => null
export function bindStateGetter(fn: () => AppState | null): void {
  stateGetter = fn
}

export function autoBackupPayload(state: AppState | null) {
  if (!state) return null
  return {
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    checked: state.checked,
    log: state.log,
    pomo: state.pomo,
    theme: state.theme,
    achievements: state.achievements,
    celebratedDays: state.celebratedDays,
    mocks: state.mocks,
    shaky: state.shaky,
    ratings: state.ratings,
    freeze: state.freeze,
    habits: state.habits,
    habitLog: state.habitLog,
    restDayBank: state.restDayBank,
    restedDays: state.restedDays,
    sound: state.sound,
    notifications: state.notif,
    blocking: state.block,
    plans: getDomainPlans(),
    focusSessions: getDomainFocusSessions(),
    inAppNotifications: notificationRecords()
  }
}

export function queueAutoBackup(state: AppState | null) {
  if (!window.AndroidESE) return
  const native = window.AndroidESE
  if (autoBackupTimer) clearTimeout(autoBackupTimer)
  autoBackupTimer = setTimeout(() => {
    const payload = autoBackupPayload(state ?? stateGetter())
    if (payload && native.saveBackup) {
      native.saveBackup(JSON.stringify(payload))
    }
    if (window.eseRequestCloudSync) window.eseRequestCloudSync()
  }, 900)
}

export function saveJSON(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v))
    queueAutoBackup(stateGetter())
  } catch (e) {
    console.error('saveJSON failed for key=' + k, e)
  }
}

/* ── pomo normalization (identical default + merge) ── */
export const PRESETS = [
  { label: '25 · 5', work: 25, brk: 5 },
  { label: '50 · 10', work: 50, brk: 10 },
  { label: '90 · 20', work: 90, brk: 20 }
]

export function normalizePomo(p: Partial<PomoState> | null | undefined): PomoState {
  const d: PomoState = {
    phase: 'work',
    running: false,
    targetTs: null,
    timeLeft: 50 * 60,
    workMins: 50,
    breakMins: 10,
    loop: true,
    logged: 0,
    docked: true
  }
  if (!p || typeof p !== 'object') return d
  return Object.assign(d, p)
}

/* ── theme suits ── */
export interface ThemeSpec {
  id: string
  name: string
  desc: string
  meta: string
  sw: string[]
}
export const THEMES: ThemeSpec[] = [
  { id: 'ember', name: 'Mono Black', desc: 'OLED black · red signal', meta: '#000000', sw: ['#D71921', '#000000', '#0A0A0A', '#F5F5F2'] },
  { id: 'lime', name: 'Glyph Lime', desc: 'Black · lime signal', meta: '#000000', sw: ['#9EEB3B', '#000000', '#0A0A0A', '#F5F5F2'] },
  { id: 'ice', name: 'Arctic Ice', desc: 'Black · ice-blue signal', meta: '#000000', sw: ['#7FB8D9', '#000000', '#0A0A0A', '#F5F5F2'] },
  { id: 'paper', name: 'Mono White', desc: 'Ceramic white · red signal', meta: '#F0EEE9', sw: ['#C11218', '#F0EEE9', '#FAF9F6', '#1A1A18'] }
]
export const THEME_IDS = THEMES.map((t) => t.id)

/* migrate the old binary dark/light preference */
export function loadTheme(): string {
  const v = loadJSON<string>(THEME_KEY, 'ember')
  if (v === 'dark') return 'ember'
  if (v === 'light') return 'paper'
  return THEME_IDS.includes(v) ? v : 'ember'
}
export function themeMeta(id: string): string {
  const t = THEMES.find((x) => x.id === id)
  return t ? t.meta : '#000000'
}
export function isLightTheme(id: string): boolean {
  return id === 'paper'
}

/* ── dates ── */
export function fmt(n: number): string {
  return String(n).padStart(2, '0')
}
export function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${fmt(d.getMonth() + 1)}-${fmt(d.getDate())}`
}

/* ── domain records (native bridge or web fallback) ── */
export function parseDomain<T>(value: string | null | undefined, fallback: T): T {
  try {
    return (JSON.parse(value || '') as T) || fallback
  } catch {
    return fallback
  }
}

export function getDomainPlans(): unknown[] {
  if (window.AndroidESE?.getPlans) {
    return Array.isArray(parseDomain(window.AndroidESE.getPlans(), [])) ? (parseDomain(window.AndroidESE.getPlans(), []) as unknown[]) : []
  }
  return (loadJSON<unknown[]>(DOMAIN_PLANS_KEY, []) as Array<{ deletedAt?: unknown }>).filter((plan) => !plan.deletedAt)
}
export function getDomainFocusSessions(): unknown[] {
  if (window.AndroidESE?.getFocusSessions) {
    return Array.isArray(parseDomain(window.AndroidESE.getFocusSessions(), [])) ? (parseDomain(window.AndroidESE.getFocusSessions(), []) as unknown[]) : []
  }
  return []
}
export function toDateTimeLocal(value: number): string {
  const d = new Date(value - Date.now() + Date.now() - new Date().getTimezoneOffset() * 60000)
  return d.toISOString().slice(0, 16)
}

interface InAppNotificationRec {
  deletedAt?: unknown
  createdAt?: number
  readAt?: number
}
export function notificationRecords(): InAppNotificationRec[] {
  if (window.AndroidESE?.getInAppNotifications) {
    const value = parseDomain<unknown>(window.AndroidESE.getInAppNotifications(), [])
    return Array.isArray(value) ? (value as InAppNotificationRec[]) : []
  }
  return (loadJSON<InAppNotificationRec[]>(INBOX_KEY, []) as InAppNotificationRec[])
    .filter((item) => !item.deletedAt)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}
export function unreadNotificationCount(): number {
  if (window.AndroidESE?.getUnreadNotificationCount) return Number(window.AndroidESE.getUnreadNotificationCount()) || 0
  return notificationRecords().filter((item) => !item.readAt).length
}

/* ── cloud snapshot + merge policy (byte-identical to legacy) ── */
export function snap(state: AppState) {
  return {
    checked: state.checked,
    log: state.log,
    pomo: state.pomo,
    theme: state.theme,
    achievements: state.achievements,
    celebratedDays: state.celebratedDays,
    mocks: state.mocks,
    shaky: state.shaky,
    ratings: state.ratings,
    freeze: state.freeze,
    habits: state.habits,
    habitLog: state.habitLog,
    restDayBank: state.restDayBank,
    restedDays: state.restedDays,
    sound: state.sound,
    notifications: state.notif,
    blocking: state.block
  }
}

/* Mutates `state` in place and persists the changed keys. */
export function merge(cloud: Partial<AppState> | null | undefined, state: AppState) {
  if (!cloud) return
  function mergeObj<T extends Record<string, unknown>>(local: T, remote: unknown): T {
    if (!remote || typeof remote !== 'object') return local
    return Object.assign({}, remote, local)
  }
  if (cloud.log && typeof cloud.log === 'object') {
    const mergedLog = Object.assign({}, cloud.log)
    Object.keys(state.log).forEach((k) => {
      mergedLog[k] = state.log[k]
    })
    state.log = mergedLog
    saveJSON(LOG_KEY, state.log)
  }
  if (cloud.ratings && typeof cloud.ratings === 'object') {
    const mergedRatings = Object.assign({}, cloud.ratings)
    Object.keys(state.ratings).forEach((k) => {
      mergedRatings[k] = state.ratings[k]
    })
    state.ratings = mergedRatings
    saveJSON(RATE_KEY, state.ratings)
  }
  if (cloud.habitLog && typeof cloud.habitLog === 'object') {
    const mergedHL: Record<string, Record<string, boolean>> = Object.assign({}, cloud.habitLog)
    Object.keys(state.habitLog).forEach((k) => {
      mergedHL[k] = Object.assign({}, cloud.habitLog![k] || {}, state.habitLog[k])
    })
    state.habitLog = mergedHL
    saveJSON(HABIT_LOG_KEY, state.habitLog)
  }
  if (cloud.checked && typeof cloud.checked === 'object') {
    state.checked = mergeObj(state.checked, cloud.checked)
    saveJSON(STORAGE_KEY, state.checked)
  }
  if (cloud.shaky && typeof cloud.shaky === 'object') {
    state.shaky = mergeObj(state.shaky, cloud.shaky)
    saveJSON(SHAKY_KEY, state.shaky)
  }
  if (cloud.freeze && typeof cloud.freeze === 'object') {
    state.freeze = mergeObj(state.freeze, cloud.freeze)
    saveJSON(FREEZE_KEY, state.freeze)
  }
  if (cloud.celebratedDays && typeof cloud.celebratedDays === 'object') {
    state.celebratedDays = mergeObj(state.celebratedDays, cloud.celebratedDays)
    saveJSON(CELEB_KEY, state.celebratedDays)
  }
  if (cloud.achievements && Array.isArray(cloud.achievements) && Object.keys(state.achievements).length === 0) {
    /* normalize Array<AchievementRec> → Record<string, AchievementRec>.
       Cloud legacy backups stored achievements as a parallel array aligned
       to the ACHIEVEMENTS table; newer backups use the Record form. */
    const rec = {} as Record<string, AchievementRec>
    const arr = cloud.achievements as AchievementRec[]
    arr.forEach((entry, i) => {
      const id = ACHIEVEMENT_IDS_LOCAL[i]
      if (id && entry) rec[id] = entry
    })
    state.achievements = rec
    saveJSON(ACH_KEY, rec)
  }
  if (cloud.mocks && Array.isArray(cloud.mocks) && !state.mocks.length) {
    state.mocks = cloud.mocks
    saveJSON(MOCK_KEY, state.mocks)
  }
  if (cloud.habits && Array.isArray(cloud.habits) && !state.habits.length) {
    state.habits = cloud.habits
    saveJSON(HABIT_KEY, state.habits)
  }
  /* pomo: restore the timer SETTINGS (preset, loop, docked) but never
     clobber a live local timer — running state stays on this device */
  if (cloud.pomo && typeof cloud.pomo === 'object') {
    const cur = state.pomo
    const cp = cloud.pomo
    if (typeof cp.workMins === 'number') cur.workMins = cp.workMins
    if (typeof cp.breakMins === 'number') cur.breakMins = cp.breakMins
    if (typeof cp.loop === 'boolean') cur.loop = cp.loop
    if (typeof cp.docked === 'boolean') cur.docked = cp.docked
    saveJSON(POMO_KEY, cur)
  }
  /* rest-day bank: only fill in when the local bank is untouched (default 7) */
  if (typeof cloud.restDayBank === 'number' && state.restDayBank === 7) {
    state.restDayBank = cloud.restDayBank
    saveJSON(REST_KEY, state.restDayBank)
  }
  /* rested days: union — never double-count a taken rest day */
  if (Array.isArray(cloud.restedDays)) {
    const fresh = cloud.restedDays.filter(
      (r) => r && !state.restedDays.some((l) => l.d === r.d && l.i === r.i)
    )
    if (fresh.length) {
      state.restedDays = state.restedDays.concat(fresh)
      saveJSON(RESTED_KEY, state.restedDays)
    }
  }
  /* sound / notifications / blocking / theme are per-device preferences —
     local always wins, same policy as theme. */
}

/* ── import/restore (mutates `state`, persists everything) ── */
export function restoreDomainRecords(d: Partial<BackupPayload>) {
  if (!window.AndroidESE) {
    if (Array.isArray(d.plans)) saveJSON(DOMAIN_PLANS_KEY, d.plans)
    if (Array.isArray(d.inAppNotifications)) saveJSON(INBOX_KEY, d.inAppNotifications)
    return
  }
  const native = window.AndroidESE
  ;(Array.isArray(d.plans) ? d.plans : []).forEach((plan: unknown) => {
    try {
      native.savePlan!(JSON.stringify(plan))
    } catch (_) {}
  })
  ;(Array.isArray(d.focusSessions) ? d.focusSessions : []).forEach((session: unknown) => {
    try {
      native.restoreFocusSession!(JSON.stringify(session))
    } catch (_) {}
  })
  ;(Array.isArray(d.inAppNotifications) ? d.inAppNotifications : []).forEach((item: unknown) => {
    try {
      native.createInAppNotification!(JSON.stringify(item))
    } catch (_) {}
  })
}

export function applyBackupPayload(d: Partial<BackupPayload>, state: AppState) {
  if (!d || typeof d !== 'object') throw new Error('Invalid backup')
  if (d.checked) state.checked = d.checked
  if (d.log) state.log = d.log
  if (d.pomo) state.pomo = { ...state.pomo, ...d.pomo, running: false, paused: false }
  if (d.theme) state.theme = d.theme
  if (d.achievements) {
    /* normalize legacy array form → Record form */
    state.achievements = Array.isArray(d.achievements)
      ? d.achievements.reduce((acc, entry, i) => {
          const id = ACHIEVEMENT_IDS_LOCAL[i]
          if (id && entry) acc[id] = entry
          return acc
        }, {} as Record<string, AchievementRec>)
      : d.achievements
  }
  if (d.celebratedDays) state.celebratedDays = d.celebratedDays
  if (d.mocks) state.mocks = d.mocks
  if (d.shaky) state.shaky = d.shaky
  if (d.ratings) state.ratings = d.ratings
  if (d.freeze) state.freeze = d.freeze
  if (d.habits && Array.isArray(d.habits)) state.habits = d.habits
  if (d.habitLog && typeof d.habitLog === 'object') state.habitLog = d.habitLog
  if (Array.isArray(d.restedDays)) state.restedDays = d.restedDays
  /* settings + banks — previously dropped on restore, causing silent data loss */
  if (typeof d.restDayBank === 'number') state.restDayBank = d.restDayBank
  if (d.sound !== undefined) state.sound = d.sound
  if (d.notifications !== undefined) state.notif = d.notifications
  if (d.blocking !== undefined && typeof d.blocking === 'object') state.block = d.blocking
  saveJSON(STORAGE_KEY, state.checked)
  saveJSON(LOG_KEY, state.log)
  saveJSON(THEME_KEY, state.theme)
  saveJSON(ACH_KEY, state.achievements)
  saveJSON(CELEB_KEY, state.celebratedDays)
  saveJSON(MOCK_KEY, state.mocks)
  saveJSON(SHAKY_KEY, state.shaky)
  saveJSON(RATE_KEY, state.ratings)
  saveJSON(FREEZE_KEY, state.freeze)
  saveJSON(HABIT_KEY, state.habits)
  saveJSON(HABIT_LOG_KEY, state.habitLog)
  saveJSON(RESTED_KEY, state.restedDays)
  saveJSON(REST_KEY, state.restDayBank)
  saveJSON(SOUND_KEY, state.sound)
  saveJSON(NOTIF_KEY, state.notif)
  saveJSON(BLOCK_KEY, state.block)
  restoreDomainRecords(d)
}

/* ── initial state (defaults identical to legacy `state` object) ── */
export function createInitialState(): AppState {
  const s: AppState = {
    nav: loadJSON<string>(NAV_KEY, 'today'),
    index: Math.min(Math.max(loadJSON<number>(IDX_KEY, 0), 0), SCHED.length - 1),
    checked: loadJSON<Record<string, boolean>>(STORAGE_KEY, {}),
    pomo: normalizePomo(loadJSON<Partial<PomoState> | null>(POMO_KEY, null)),
    log: loadJSON<LogMap>(LOG_KEY, {}),
    theme: loadTheme(),
    expandedSessions: loadJSON<Record<string, boolean>>(EXP_KEY, {}),
    achievements: loadJSON<Record<string, AchievementRec>>(ACH_KEY, {}),
    celebratedDays: loadJSON<Record<string, boolean>>(CELEB_KEY, {}),
    notif: loadJSON<boolean>(NOTIF_KEY, true),
    block: loadJSON<BlockState>(BLOCK_KEY, { strict: false }),
    mocks: loadJSON<MockRec[]>(MOCK_KEY, []),
    shaky: loadJSON<Record<string, ShakyRec>>(SHAKY_KEY, {}),
    ratings: loadJSON<Record<string, number | null>>(RATE_KEY, {}),
    freeze: loadJSON<Record<string, boolean>>(FREEZE_KEY, {}),
    sound: loadJSON<boolean>(SOUND_KEY, true),
    restDayBank: loadJSON<number>(REST_KEY, 7),
    restedDays: loadJSON<RestDay[]>(RESTED_KEY, []),
    habits: loadJSON<Habit[]>(HABIT_KEY, []),
    habitLog: loadJSON<Record<string, Record<string, boolean>>>(HABIT_LOG_KEY, {})
  }
  return s
}
