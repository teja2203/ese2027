/* Verify the frozen storage contract (P0 gate).
   - every localStorage key name matches the legacy app
   - defaults identical
   - normalizePomo / merge / applyBackupPayload policies byte-identical
   - backup payload round-trips without loss
   Runs in Node (type stripping); window + localStorage are shimmed. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/* â”€â”€ shims â”€â”€ */
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
}
globalThis.window = {}
globalThis.console = console

const S = await import('../src/lib/storage.ts')

let failures = 0
function check(name, cond) {
  if (cond) console.log(`  âœ“ ${name}`)
  else {
    failures++
    console.error(`  âœ— ${name}`)
  }
}

/* â”€â”€ 1. key-name parity with legacy â”€â”€ */
console.log('1. key-name parity vs legacy/js/app.v63.js')
const legacySrc = readFileSync(path.join(root, 'legacy', 'app.v63.js'), 'utf8')
const legacyKeys = new Set()
const keyRe = /(?:const|,)\s*(\w+)\s*=\s*"(ese_[\w]+|THEME|expandedSessions)"/g
let m
while ((m = keyRe.exec(legacySrc))) legacyKeys.add(m[2])
const newKeyValues = new Set(
  Object.entries(S)
    .filter(([, v]) => typeof v === 'string' && (v.startsWith('ese_') || v === 'THEME' || v === 'expandedSessions'))
    .map(([, v]) => v)
)
for (const k of legacyKeys) check(`legacy key ${k} exists in storage.ts`, newKeyValues.has(k))

/* â”€â”€ 2. defaults with empty storage â”€â”€ */
console.log('2. defaults (empty localStorage)')
const empty = S.createInitialState()
check('nav default "today"', empty.nav === 'today')
check('index default 0', empty.index === 0)
check('pomo default 50/10 work', empty.pomo.workMins === 50 && empty.pomo.breakMins === 10 && empty.pomo.phase === 'work' && empty.pomo.docked === true)
check('notif default true', empty.notif === true)
check('sound default true', empty.sound === true)
check('restDayBank default 7', empty.restDayBank === 7)
check('block default {strict:false}', empty.block.strict === false)
check('theme default ember', empty.theme === 'ember')

/* â”€â”€ 3. load existing legacy-shaped data â”€â”€ */
console.log('3. read existing legacy data')
const J = JSON.stringify
const legacyData = {
  'ese_planner_checked_v3': J({ '5-0-0': true, '5-1-2': true }),
  'ese_planner_index_v9': J(12),
  'ese_planner_nav_v1': J('focus'),
  'ese_planner_pomo_v5': JSON.stringify({ phase: 'break', running: true, targetTs: 1750000000000, timeLeft: 600, workMins: 25, breakMins: 5, loop: false, logged: 12, docked: false }),
  'ese_planner_log_v1': JSON.stringify({ '2026-08-10': { sessions: 3, minutes: 120, slotHits: { 0: true, 2: true }, distract: 1 } }),
  THEME: J('lime'),
  expandedSessions: JSON.stringify({ '2-0': true }),
  'ese_achievements_v1': JSON.stringify({ sessions_1: { at: '2026-08-01T10:00:00Z' } }),
  'ese_celebrated_days_v1': JSON.stringify({ '2026-08-01': '2026-08-01T22:00:00Z' }),
  'ese_notif_v1': J(false),
  'ese_block_v1': JSON.stringify({ strict: true }),
  'ese_mocks_v1': JSON.stringify([{ name: 'GT-3', score: 142, max: 200, neg: 4, note: 'timing', date: '2026-08-11' }]),
  'ese_shaky_v1': JSON.stringify({ '12-1-0': { t: 'Root locus', subj: 'Controls', d: 'Jul 12' } }),
  'ese_ratings_v1': JSON.stringify({ '2026-08-11': 4 }),
  'ese_freeze_v1': JSON.stringify({ '2026-08-09': '2026-08-09T22:00:00Z' }),
  'ese_sound_v1': J(false),
  'ese_rest_v1': J(5),
  'ese_rested_v1': JSON.stringify([{ d: '2026-08-05', i: 0 }]),
  'ese_habits_v1': JSON.stringify([{ id: 'h1720000000000', name: 'MEDITATE' }]),
  'ese_habit_log_v1': JSON.stringify({ '2026-08-11': { h1720000000000: true } })
}
for (const [k, v] of Object.entries(legacyData)) store.set(k, v)
const loaded = S.createInitialState()
check('checked parsed', JSON.stringify(loaded.checked) === JSON.stringify({ '5-0-0': true, '5-1-2': true }))
check('index 12', loaded.index === 12)
check('nav focus', loaded.nav === 'focus')
check('pomo merged (keeps legacy fields)', loaded.pomo.workMins === 25 && loaded.pomo.phase === 'break' && loaded.pomo.docked === false)
check('log parsed', loaded.log['2026-08-10'].minutes === 120 && loaded.log['2026-08-10'].distract === 1)
check('theme lime', loaded.theme === 'lime')
check('notif false (boolean)', loaded.notif === false)
check('strict true', loaded.block.strict === true)
check('mocks parsed', loaded.mocks[0].name === 'GT-3')
check('ratings 4', loaded.ratings['2026-08-11'] === 4)
check('habits parsed', loaded.habits[0].name === 'MEDITATE')
check('habitLog parsed', loaded.habitLog['2026-08-11']['h1720000000000'] === true)

/* â”€â”€ 4. merge policy â”€â”€ */
console.log('4. merge() policy')
store.clear()
const st = S.createInitialState()
st.log['2026-08-10'] = { sessions: 3, minutes: 120 }
st.achievements = {}
st.mocks = []
st.restDayBank = 7
S.merge(
  {
    log: { '2026-08-10': { sessions: 99, minutes: 99 }, '2026-08-09': { sessions: 1, minutes: 30 } },
    ratings: { '2026-08-09': 5 },
    achievements: { old: { at: 'x' } },
    mocks: [{ name: 'cloud mock', score: 1, max: 2, neg: 0, note: '', date: 'd' }],
    restDayBank: 3,
    restedDays: [{ d: '2026-08-05', i: 0 }, { d: '2026-08-06', i: 0 }],
    pomo: { workMins: 90, loop: false, running: true },
    checked: { '0-0-0': false }
  },
  st
)
check('log: local wins per day, cloud fills missing days', st.log['2026-08-10'].sessions === 3 && st.log['2026-08-09'].sessions === 1)
check('achievements: object-shaped cloud is never merged (legacy quirk preserved)', st.achievements.old === undefined && Object.keys(st.achievements).length === 0)
check('mocks: cloud fills only when local empty', st.mocks[0].name === 'cloud mock')
check('restDayBank: filled only when local is default 7', st.restDayBank === 3)
check('restedDays: union (no duplicate)', st.restedDays.length === 2)
check('pomo: settings merge, running never restored', st.pomo.workMins === 90 && st.pomo.running === false)
/* legacy quirk: array-shaped cloud achievements DO fill an empty local set */
const stQ = S.createInitialState()
stQ.achievements = {}
stQ.mocks = []
S.merge({ achievements: [{ at: 'x' }], mocks: [{ name: 'm', score: 1, max: 2, neg: 0, note: '', date: 'd' }] }, stQ)
check('achievements: array cloud fills when local empty', Array.isArray(stQ.achievements) && stQ.achievements[0].at === 'x')
check('mocks: non-empty local wins over array cloud', stQ.mocks.length === 1)

/* â”€â”€ 5. applyBackupPayload + payload round-trip â”€â”€ */
console.log('5. backup payload round-trip')
store.clear()
const st2 = S.createInitialState()
const backup = {
  version: '1.3.0',
  exportedAt: '2026-08-12T10:00:00.000Z',
  checked: { '1-2-3': true },
  log: { '2026-08-10': { sessions: 3, minutes: 120, slotHits: { 0: true } } },
  pomo: { phase: 'work', running: true, targetTs: 1, timeLeft: 3000, workMins: 50, breakMins: 10, loop: true, logged: 0, docked: true },
  theme: 'ember',
  achievements: { a: { at: 'x' } },
  celebratedDays: {},
  mocks: [],
  shaky: {},
  ratings: { '2026-08-10': 4 },
  freeze: {},
  habits: [{ id: 'h1', name: 'READ' }],
  habitLog: {},
  restDayBank: 7,
  restedDays: [],
  sound: true,
  notifications: true,
  blocking: { strict: false },
  plans: [],
  focusSessions: [],
  inAppNotifications: []
}
S.applyBackupPayload(backup, st2)
const payload = S.autoBackupPayload(st2)
check('payload round-trip: checked', JSON.stringify(payload.checked) === JSON.stringify(backup.checked))
check('payload round-trip: log', JSON.stringify(payload.log) === JSON.stringify(backup.log))
check('payload round-trip: pomo (running zeroed)', payload.pomo.running === false && payload.pomo.timeLeft === 3000)
check('payload round-trip: habits', JSON.stringify(payload.habits) === JSON.stringify(backup.habits))
check('payload round-trip: theme', payload.theme === 'ember')
check('payload version', payload.version === '1.3.0')
check('snap() shape', JSON.stringify(Object.keys(S.snap(st2)).sort()) === JSON.stringify(['achievements', 'blocking', 'celebratedDays', 'checked', 'freeze', 'habitLog', 'habits', 'log', 'mocks', 'notifications', 'pomo', 'ratings', 'restDayBank', 'restedDays', 'shaky', 'sound', 'theme'].sort()))

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECKS FAILED`)
process.exit(failures === 0 ? 0 : 1)
