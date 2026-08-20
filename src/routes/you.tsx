/* ══════════════════════════════════════════════════════════════
   you.tsx — YOU tab (legacy renderYou port, L1-L5).
   Identity card · 6 accordions (ese_prof_exp_v1) · theme picker ·
   install/backup/reset/cloud · shortcuts · export/import wired for
   the first time (L4) · rest-day bank writer (L5).
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from 'react'
import { useSnapshot, state, commit, setTheme, setNav, onBack } from '../lib/state'
import * as S from '../lib/storage'
import { ACHIEVEMENTS, achMetrics, achProgress, nextAchievement, checkAchievements } from '../lib/achievements'
import { computeStreak, cd, ESE_DATE } from '../lib/stats'
import { computeSessionStreak, isRestToday, findTodayIndex } from '../lib/schedule'
import { toggleLoop } from '../lib/pomodoro'
import { playSound } from '../lib/sound'
import {
  notifOn,
  toggleNotif,
  dailyRemindersOn,
  toggleDailyReminders,
  missedFocusRemindersOn,
  missedFocusSettings,
  toggleMissedFocusReminders,
  askNotifPermission,
  type MissedFocusSettings
} from '../lib/inbox'
import { APP_VERSION } from '../lib/storage'
import { isNative } from '../lib/bridge'
import { celebrateBadgeFrom } from '../components/celebration'
import { toast } from 'sonner'
import { ScreenHeader } from '../components/screen-header'
import { Dialog, DialogContent } from '../components/ui/dialog'
import {
  BarChart3,
  Clock,
  ExternalLink,
  Settings,
  Lock,
  Trophy,
  TriangleAlert,
  ChevronRight
} from 'lucide-react'

/* ── accordion persistence (legacy ese_prof_exp_v1) ── */
const profExp = new Map<string, boolean>(Object.entries(S.loadJSON<Record<string, boolean>>(S.PROF_EXP_KEY, {})))

function fmtUnlockDate(iso?: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return (
      ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][d.getMonth()] +
      ' ' +
      d.getDate() +
      ', ' +
      d.getFullYear()
    )
  } catch {
    return ''
  }
}

/* ── shared confirm dialog (WebView suppresses window.confirm) ── */
function ConfirmDialog({
  open,
  title,
  sub,
  yesLabel,
  onYes,
  onClose
}: {
  open: boolean
  title: string
  sub?: string
  yesLabel?: string
  onYes: () => void
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="nt-overlay-card max-w-sm" aria-describedby={undefined}>
        <div style={{ padding: '16px 10px 6px' }}>
          <div className="nt-overlay-title" style={{ fontSize: 18, lineHeight: 1.3 }}>
            {title}
          </div>
          {sub ? <div className="nt-overlay-sub" style={{ marginTop: 8 }}>{sub}</div> : null}
          <div className="nt-overlay-actions">
            <button className="nt-overlay-key ghost press" onClick={onClose} aria-label="Cancel">
              Cancel
            </button>
            <button
              className="nt-overlay-key primary press"
              onClick={() => {
                onClose()
                onYes()
              }}
              aria-label={yesLabel || 'Delete'}
            >
              {yesLabel || 'Delete'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── guide sheet (C6: guideSheet port) ── */
function GuideDialog({ open, title, body, onClose }: { open: boolean; title: string; body: React.ReactNode; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="nt-overlay-card max-w-md" aria-describedby={undefined}>
        <div style={{ padding: '16px 10px 6px' }}>
          <div className="nt-overlay-eyebrow" style={{ marginBottom: 6 }}>Guide</div>
          <div className="nt-overlay-title" style={{ fontSize: 20 }}>{title}</div>
          <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.65, color: 'var(--ink-2)' }}>{body}</div>
          <button className="nt-overlay-key primary press" style={{ width: '100%', marginTop: 18 }} onClick={onClose} aria-label="Got it">
            Got it
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function GStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, margin: '10px 0' }}>
      <span
        style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'var(--acc-dim)',
          color: 'var(--acc)',
          fontWeight: 800,
          fontSize: 11,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {n}
      </span>
      <span>{children}</span>
    </div>
  )
}
function GHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontWeight: 800, color: 'var(--ink)', margin: '16px 0 2px', fontSize: 13.5 }}>{children}</div>
  )
}
function GNote({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--card-2)', borderRadius: 12, padding: '10px 14px', margin: '10px 0', fontSize: 12, color: 'var(--ink-3)' }}>
      {children}
    </div>
  )
}

/* ── add-mock sheet (C1) ── */
function AddMockDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [score, setScore] = useState('')
  const [max, setMax] = useState('200')
  const [neg, setNeg] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const save = () => {
    const nm = name.trim()
    const sc = parseFloat(score)
    const mx = parseFloat(max) || 200
    const ng = parseFloat(neg) || 0
    if (!nm || isNaN(sc)) {
      setErr('Name and marks are required')
      return
    }
    state.mocks.push({ name: nm, score: sc, max: mx, neg: ng, note: note.trim(), date: S.todayKey() })
    S.saveJSON(S.MOCK_KEY, state.mocks)
    commit()
    onClose()
    toast('Mock logged')
    checkAchievements(state, celebrateBadgeFrom)
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="nt-overlay-card max-w-sm" aria-describedby={undefined}>
        <div style={{ padding: '16px 10px 6px' }}>
          <div className="nt-overlay-eyebrow" style={{ marginBottom: 6 }}>Assessment</div>
          <div className="nt-overlay-title" style={{ fontSize: 20 }}>Log mock score</div>
          <input
            className="nt-overlay-input"
            style={{ marginTop: 12 }}
            placeholder="Mock name (e.g. GT-3 Full Syllabus)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <input className="nt-overlay-input" placeholder="Marks scored" inputMode="decimal" type="number" value={score} onChange={(e) => setScore(e.target.value)} />
            <input className="nt-overlay-input" placeholder="Out of (e.g. 200)" inputMode="decimal" type="number" value={max} onChange={(e) => setMax(e.target.value)} />
          </div>
          <input className="nt-overlay-input" style={{ marginTop: 10 }} placeholder="Marks lost to negatives (optional)" inputMode="decimal" type="number" value={neg} onChange={(e) => setNeg(e.target.value)} />
          <input className="nt-overlay-input" style={{ marginTop: 10 }} placeholder="Weak areas noted (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div style={{ fontSize: 12, color: 'var(--acc)', marginTop: 8, minHeight: 15 }}>{err}</div>
          <div className="nt-overlay-actions">
            <button className="nt-overlay-key ghost press" onClick={onClose} aria-label="Cancel">
              Cancel
            </button>
            <button className="nt-overlay-key primary press" onClick={save} aria-label="Save">
              Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── accordion body builders ── */
function AchievementsBody() {
  const s = useSnapshot((x) => x)
  const m = achMetrics(s)
  const nx = nextAchievement(s)
  const grid = ACHIEVEMENTS.map((a) => {
    const rec = s.achievements[a.id]
    const on = !!rec
    const have = achProgress(a, m)
    const pct = Math.round((have / a.goal) * 100)
    const isNext = nx && nx.a.id === a.id
    const fresh = on && rec && rec.at && Date.now() - new Date(rec.at as unknown as string).getTime() < 8000
    return (
      <div key={a.id} className={'achwrap ' + (on ? 'on' : 'locked') + (isNext ? ' next' : '') + (fresh ? ' fresh' : '')} title={a.desc}>
        <div className="achicon">{a.icon}</div>
        <div className="achtitle">{a.title}</div>
        {on ? (
          <div className="achdate">{fmtUnlockDate(rec?.at as string)}</div>
        ) : isNext ? (
          <div className="achprog">
            <div className="nt-seg achseg">
              <i className={pct >= 25 ? 'on' : ''} />
              <i className={pct >= 50 ? 'on' : ''} />
              <i className={pct >= 75 ? 'on' : ''} />
              <i className={pct >= 100 ? 'on' : ''} />
            </div>
            <div className="achpc">
              {have} / {a.goal}
            </div>
          </div>
        ) : (
          <div className="achdate locked">
            {have} / {a.goal}
          </div>
        )}
      </div>
    )
  })
  return <div className="nt-achgrid">{grid}</div>
}

function MocksBody({ onAdd }: { onAdd: () => void }) {
  const s = useSnapshot((x) => x)
  const last = s.mocks.slice(-8)
  const pcts = last.map((m) => Math.round((m.score / m.max) * 100))
  const mmax = Math.max(...pcts, 1)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-acc press" style={{ padding: '8px 16px', fontSize: 12, borderRadius: 8, cursor: 'pointer' }} onClick={onAdd}>
          + Log mock
        </button>
      </div>
      {s.mocks.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', textAlign: 'center', padding: '8px 0 4px' }}>
          No mocks logged yet.
          <br />
          Score every mock — the trend tells you more than the hours do.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 70, marginBottom: 10 }}>
            {last.map((m, i) => {
              const h = Math.max(6, Math.round((pcts[i] / mmax) * 64))
              const up = i > 0 && pcts[i] >= pcts[i - 1]
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }} title={m.name + ' · ' + m.score + '/' + m.max}>
                  <span className="mono" style={{ fontSize: 9, fontWeight: 800, color: up ? 'var(--acc)' : 'var(--ink-3)' }}>
                    {pcts[i]}%
                  </span>
                  <div
                    style={{
                      width: '100%',
                      height: h,
                      borderRadius: '6px 6px 3px 3px',
                      background: up ? 'var(--acc)' : 'var(--ink-4)',
                      opacity: i === last.length - 1 ? 1 : 0.55
                    }}
                  />
                </div>
              )
            })}
          </div>
          {(() => {
            const lastM = s.mocks[s.mocks.length - 1]
            const trend = s.mocks.length > 1 ? pcts[pcts.length - 1] - pcts[pcts.length - 2] : 0
            return (
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>
                Latest: <b style={{ color: 'var(--ink)' }}>{lastM.name}</b> — {lastM.score}/{lastM.max}
                {lastM.neg ? ` · ${lastM.neg} lost to negatives` : ''}
                {s.mocks.length > 1 ? (
                  <>
                    {' '}
                    ·{' '}
                    <b style={{ color: trend >= 0 ? 'var(--acc)' : 'var(--ink-2)' }}>
                      {trend >= 0 ? '+' : ''}
                      {trend}%
                    </b>{' '}
                    vs previous
                  </>
                ) : null}
              </div>
            )
          })()}
          <div style={{ marginTop: 10, maxHeight: 130, overflowY: 'auto' }}>
            {s.mocks
              .slice()
              .reverse()
              .map((m, ri) => {
                const i = s.mocks.length - 1 - ri
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: '1px solid var(--line)', fontSize: 12 }}>
                    <span className="mono" style={{ color: 'var(--ink-4)', fontSize: 10 }}>
                      {m.date.slice(5)}
                    </span>
                    <span style={{ flex: 1, color: 'var(--ink-2)', fontWeight: 600 }}>{m.name}</span>
                    <span className="mono" style={{ fontWeight: 800, color: 'var(--ink)' }}>
                      {m.score}/{m.max}
                    </span>
                    <button
                      className="press"
                      style={{ border: 'none', background: 'none', color: 'var(--ink-4)', cursor: 'pointer', fontSize: 13 }}
                      aria-label={'Delete mock ' + m.name}
                      onClick={() => {
                        if (window.confirm('Delete this mock entry?')) {
                          state.mocks.splice(i, 1)
                          S.saveJSON(S.MOCK_KEY, state.mocks)
                          commit()
                        }
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
          </div>
        </>
      )}
    </div>
  )
}

function ShakyBody() {
  const s = useSnapshot((x) => x)
  const keys = Object.keys(s.shaky)
  if (keys.length === 0) {
    return (
      <div style={{ fontSize: 12.5, color: 'var(--ink-3)', textAlign: 'center', padding: '8px 0 4px' }}>
        Nothing flagged. Tap ! on any task in the Plan to queue it for revision.
      </div>
    )
  }
  return (
    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
      {keys.map((k) => {
        const sk = s.shaky[k]
        return (
          <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderTop: '1px solid var(--line)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600, lineHeight: 1.4 }}>{sk.t}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2, fontWeight: 600 }}>
                {sk.subj} · {sk.d}
              </div>
            </div>
            <button
              className="press"
              style={{ border: '1px solid var(--line-2)', background: 'var(--card-2)', color: 'var(--ink-2)', borderRadius: 9, padding: '5px 10px', cursor: 'pointer', fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}
              onClick={() => {
                delete state.shaky[k]
                S.saveJSON(S.SHAKY_KEY, state.shaky)
                commit()
                toast('Cleared — well recovered')
              }}
            >
              Solid now
            </button>
          </div>
        )
      })}
    </div>
  )
}

/* ── You screen ── */
export function YouScreen() {
  const s = useSnapshot((x) => x)
  const [mockOpen, setMockOpen] = useState(false)
  const [confirm, setConfirm] = useState<{ title: string; sub?: string; yesLabel?: string; onYes: () => void } | null>(null)
  const [guide, setGuide] = useState<{ title: string; body: React.ReactNode } | null>(null)
  const [policyOpen, setPolicyOpen] = useState(false)

  const streak = computeStreak(s).count
  const sstreak = computeSessionStreak(s)
  const unlockedCount = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length
  const ese = cd(ESE_DATE)
  const totMin = Object.values(s.log).reduce((a, e) => a + (e.minutes || 0), 0)

  /* Android back closes the topmost overlay first */
  useEffect(() => {
    if (!mockOpen && !confirm && !guide && !policyOpen) return
    return onBack(() => {
      if (mockOpen) setMockOpen(false)
      else if (confirm) setConfirm(null)
      else if (guide) setGuide(null)
      else if (policyOpen) setPolicyOpen(false)
      return true
    })
  }, [mockOpen, confirm, guide, policyOpen])

  const isStandalone = useMemo(
    () => matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true,
    []
  )

  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set([...profExp.keys()].filter((k) => profExp.get(k))))
  const accOpen = (id: string) => openIds.has(id)
  const toggleAcc = (id: string) => {
    const next = new Set(openIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setOpenIds(next)
    try {
      const raw: Record<string, boolean> = {}
      next.forEach((k) => {
        raw[k] = true
      })
      S.saveJSON(S.PROF_EXP_KEY, raw)
    } catch {
      /* ignore */
    }
  }

  const acc = (id: string, icon: React.ReactNode, title: string, badge: string, build: () => React.ReactNode) => {
    const open = accOpen(id)
    return (
      <div className="nt-acc">
        <button className="acchead press" onClick={() => toggleAcc(id)}>
          <span className="ai">{icon}</span>
          <span className="at">{title}</span>
          {badge ? <span className="ab">{badge}</span> : null}
          <span className={'acar' + (open ? ' open' : '')}>
            <ChevronRight size={14} aria-hidden="true" />
          </span>
        </button>
        {open ? <div className="accbody">{build()}</div> : null}
      </div>
    )
  }

  const row = (label: string, desc: string, right: React.ReactNode, onClick?: () => void, id?: string) => (
    <button className={'nt-setrow press' + (onClick ? '' : ' static')} onClick={onClick} id={id}>
      <div className="sl">
        <div className="slt">{label}</div>
        {desc ? <div className="sld">{desc}</div> : null}
      </div>
      <div className="sr">
        {right}
      </div>
    </button>
  )

  const swUI = (on: boolean) => <span className={'nt-sw' + (on ? ' on' : '')}><i /></span>

  const backupStatus = (): string => {
    if (!window.AndroidESE?.getBackupStatus) return 'LOCAL'
    try {
      const raw = window.AndroidESE.getBackupStatus()
      const st = S.parseDomain<{ count?: number; has_backup?: unknown; hasBackup?: unknown }>(typeof raw === 'string' ? raw : JSON.stringify(raw), {})
      const count = Number(st.count)
      const hasRaw = st.has_backup ?? st.hasBackup
      const hasBackup = hasRaw === true || hasRaw === 1 || hasRaw === 'true' || hasRaw === '1' || (Number.isFinite(count) && count > 0)
      if (!hasBackup) return '0 saved'
      return Number.isFinite(count) && count >= 0 ? count + ' saved' : 'SAVED'
    } catch {
      return 'ON'
    }
  }

  const restoreLatestAutomaticBackup = () => {
    if (!window.AndroidESE?.readLatestBackup) {
      toast('No native backup is available')
      return
    }
    setConfirm({
      title: 'Restore the latest automatic backup?',
      sub: 'Current local values may be replaced.',
      yesLabel: 'Restore',
      onYes: () => {
        try {
          const raw = window.AndroidESE?.readLatestBackup?.()
          if (!raw) {
            toast('No automatic backup found')
            return
          }
          S.applyBackupPayload(JSON.parse(raw), state)
          commit()
          toast('Latest backup restored')
        } catch {
          toast('Automatic backup could not be restored')
        }
      }
    })
  }

  const resetProgress = () => {
    setConfirm({
      title: 'Reset ALL task progress?',
      sub: 'Clears every checked task — cannot be undone.',
      yesLabel: 'Reset',
      onYes: () => {
        state.checked = {}
        S.saveJSON(S.STORAGE_KEY, state.checked)
        commit()
        toast('Progress reset')
      }
    })
  }

  const signedIn = !!window.eseSyncUser && window.eseSyncUser()

  const takeRestDay = () => {
    const bank = s.restDayBank
    if (bank <= 0) {
      toast('No rest days left in your bank')
      return
    }
    if (isRestToday(s)) return
    const di = findTodayIndex(s)
    setConfirm({
      title: 'Take today as a rest day?',
      sub: 'Your plan shifts forward by one day. Bank: ' + bank + ' left.',
      yesLabel: 'Rest today',
      onYes: () => {
        state.restedDays.push({ i: di >= 0 ? di : state.index, d: S.todayKey() })
        state.restDayBank = bank - 1
        S.saveJSON(S.RESTED_KEY, state.restedDays)
        S.saveJSON(S.REST_KEY, state.restDayBank)
        commit()
        toast('Rest day taken — health first. Plan shifted.')
      }
    })
  }

  const notifPermission = (): string => {
    if (window.AndroidESE?.notificationPermission) return window.AndroidESE.notificationPermission()
    if (notifOn()) return 'granted'
    if (typeof Notification !== 'undefined') return Notification.permission
    return 'unsupported'
  }

  const toggleStrict = () => {
    if (!s.block.strict) {
      setConfirm({
        title: 'Enable strict mode?',
        sub: 'During a focus session, Stop/Pause/Back require a 5-second hold. Leaving the app mid-session is counted as a distraction.',
        yesLabel: 'Arm',
        onYes: () => {
          state.block.strict = true
          S.saveJSON(S.BLOCK_KEY, state.block)
          commit()
          toast('Strict mode armed')
        }
      })
    } else {
      state.block.strict = false
      S.saveJSON(S.BLOCK_KEY, state.block)
      commit()
      toast('Strict mode disarmed')
    }
  }

  const policy = missedFocusSettings()

  return (
    <div className="screen view" role="tabpanel" aria-label="You">
      <div className="stagger">
        <ScreenHeader title="Profile & Settings" sub="Mastery Dashboard" />

        <div className="nt-you">
          <div className="ytop">
            <div className="yav">T</div>
            <div className="ymeta">
              <div className="yname">TEJA</div>
              <div className="ysub">ESE 2027 ASPIRANT · {ese.d}D TO GO</div>
            </div>
          </div>
          <div className="ystats">
            <div className="yst">
              <div key={streak} className={'n stamp' + (streak >= 100 ? ' led100' : '')}>{streak}</div>
              <div className="l">Streak</div>
            </div>
            <div className="yst">
              <div className="n">{sstreak}</div>
              <div className="l">Sessions</div>
            </div>
            <div className="yst">
              <div className="n">
                {Math.floor(totMin / 60)}
                <i>H</i>
              </div>
              <div className="l">Studied</div>
            </div>
            <div className="yst">
              <div className="n">{unlockedCount}</div>
              <div className="l">Badges</div>
            </div>
          </div>
        </div>

        {acc(
          'badges',
          <Trophy size={16} aria-hidden="true" />,
          'Achievements',
          `${unlockedCount} / ${ACHIEVEMENTS.length}`,
          () => <AchievementsBody />
        )}
        {acc('mocks', <BarChart3 size={16} aria-hidden="true" />, 'Mock scores', s.mocks.length ? `${s.mocks.length} logged` : '', () => <MocksBody onAdd={() => setMockOpen(true)} />)}
        {acc(
          'shaky',
          <TriangleAlert size={16} aria-hidden="true" />,
          'Revision queue',
          Object.keys(s.shaky).length ? `${Object.keys(s.shaky).length} shaky` : '',
          () => <ShakyBody />
        )}
        {acc('timer', <Clock size={16} aria-hidden="true" />, 'Timer & notifications', '', () => (
          <div>
            {row('Auto loop', 'Cycle focus → break automatically', swUI(s.pomo.loop), () => {
              toggleLoop()
              commit()
            })}
            {row('Sounds', 'Chimes for session completion & achievements', swUI(s.sound), () => {
              state.sound = !state.sound
              S.saveJSON(S.SOUND_KEY, state.sound)
              if (state.sound) playSound('complete')
              commit()
            })}
            {row('Session completion alerts', 'Notify when a focus session or break ends', swUI(notifOn()), toggleNotif)}
            {isNative()
              ? row('Daily study reminders', 'Optional reminders at the five planned study slots', swUI(dailyRemindersOn()), toggleDailyReminders)
              : null}
            {isNative()
              ? row('Missed-focus follow-ups', 'Supportive reminders for unfinished Blocks and no-focus days', swUI(missedFocusRemindersOn()), toggleMissedFocusReminders)
              : null}
            {isNative() && missedFocusRemindersOn()
              ? row(
                  'Follow-up policy',
                  `${policy.delayMinutes} min delay · max ${policy.dailyLimit}/day · quiet ${String(policy.quietStartHour).padStart(2, '0')}:00–${String(policy.quietEndHour).padStart(2, '0')}:00`,
                  'EDIT',
                  () => setPolicyOpen(true)
                )
              : null}
            {row(
              'Notification status',
              `App ${APP_VERSION} · permission: ${notifPermission()} · session alerts: ${notifOn() ? 'on' : 'off'}`,
              'ⓘ',
              () => {
                if (!notifOn() && notifPermission() === 'granted') {
                  toast('Enable session completion alerts first')
                  return
                }
                if (notifPermission() === 'granted') {
                  toast('Test notification sent')
                  return
                }
                if (window.AndroidESE?.openNotificationSettings) {
                  window.AndroidESE.openNotificationSettings()
                  toast('Opening Android notification settings')
                  return
                }
                if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
                  setGuide({
                    title: 'Unblock notifications',
                    body: (
                      <>
                        <GNote>Android is blocking notifications for this app — the in-app switch can&apos;t override it.</GNote>
                        <GHead>If installed as an app (APK)</GHead>
                        <GStep n={1}>Long-press the ESE2027 icon → App info (ⓘ)</GStep>
                        <GStep n={2}>Notifications → turn <b>ON</b> and allow all</GStep>
                        <GStep n={3}>
                          Also open Chrome → ⋮ → Settings → Site settings → Notifications → find your vercel.app URL →{' '}
                          <b>Allow</b> (a TWA app follows Chrome&apos;s site permission)
                        </GStep>
                        <GStep n={4}>Reopen this app and toggle Session notifications on</GStep>
                        <GHead>If using in the browser</GHead>
                        <GStep n={1}>Tap the lock icon in the address bar → Permissions → Notifications → Allow</GStep>
                      </>
                    )
                  })
                  return
                }
                if (typeof Notification !== 'undefined') {
                  void askNotifPermission().then(() => {
                    commit()
                    toast('Permission dialog requested')
                  })
                }
              }
            )}
          </div>
        ))}
        {acc('blocking', <Lock size={16} aria-hidden="true" />, 'Blocking & strict mode', s.block.strict ? 'armed' : '', () => (
          <div>
            {row(
              'Strict focus lock',
              'During focus: Stop / Pause / Back need a 5-second hold, Esc is blocked, leaving the app is logged as a distraction',
              swUI(s.block.strict),
              toggleStrict
            )}
            <div
              className="press"
              style={{ marginTop: 10, fontSize: 11.5, color: 'var(--ink-3)', textAlign: 'center', padding: 10, background: 'var(--card-2)', borderRadius: 10, cursor: 'pointer' }}
              onClick={() => setNav('blocks')}
            >
              <b>Manage blocked apps &amp; sites</b> ↗
            </div>
          </div>
        ))}
        {acc('app', <Settings size={16} aria-hidden="true" />, 'App & data', '', () => (
          <div>
            <div className="nt-themerow">
              <div className="ntl">THEME SUIT</div>
              <div className="ntd">Choose a palette — applies instantly everywhere.</div>
              <div className="theme-grid">
                {S.THEMES.map((t) => (
                  <button
                    key={t.id}
                    className={'theme-card press' + (s.theme === t.id ? ' on' : '')}
                    data-id={t.id}
                    onClick={() => setTheme(t.id)}
                  >
                    <div className="swatch">
                      {t.sw.map((c, i) => (
                        <i key={i} style={{ background: c }} />
                      ))}
                    </div>
                    <span className="tname">{t.name}</span>
                    <span className="tdesc">{t.desc}</span>
                    <span className="tick">✓</span>
                  </button>
                ))}
              </div>
            </div>
            {isStandalone ? (
              row('Installed as app', 'Running standalone · offline ready', 'ON')
            ) : (
              row('Install app', 'Add to home screen — full screen, offline, notifications', '⬇', () =>
                setGuide({
                  title: 'Install the app',
                  body: (
                    <>
                      <GNote>This build ships as an Android APK — install ESE2027 from the APK for the full experience.</GNote>
                      <GHead>In the browser</GHead>
                      <GStep n={1}>Open the browser menu (⋮) and choose “Install app” / “Add to Home screen”</GStep>
                      <GNote>Install requires the app to be served over https or localhost — not from a file:// path.</GNote>
                    </>
                  )
                })
              )
            )}
            {row('Automatic backups', 'Versioned local snapshots are created in the ESE2027 backup folder after every change', backupStatus())}
            {isNative() ? row('Restore latest backup', 'Restore the most recent automatic snapshot from the backup folder', <ExternalLink size={14} aria-hidden="true" />, restoreLatestAutomaticBackup) : null}
            {row('Reset progress', 'Clears every checked task — cannot be undone', '', resetProgress)}
            {signedIn
              ? row(
                  'Cloud sync',
                  'Signed in',
                  'CLOUD',
                  () =>
                    setConfirm({
                      title: 'Sign out from cloud sync?',
                      sub: 'Your progress stays on this device.',
                      yesLabel: 'Sign out',
                      onYes: () => {
                        try {
                          if (window.sbAuth?.signOut) void window.sbAuth.signOut()
                        } catch {
                          /* ignore */
                        }
                        try {
                          window.AndroidESE?.signOutSupabase?.()
                        } catch {
                          /* ignore */
                        }
                        toast('Signed out — still saved on this device')
                        commit()
                      }
                    }),
                  'cloud-sync-row'
                )
              : row('Cloud sync', 'Optional — sign in to back up across devices', 'OFF', () => {
                  if (window.eseRequestCloudSync) window.eseRequestCloudSync()
                  else toast('Cloud sync is available in the Android app')
                })}
            {row(
              'Rest-day bank',
              `${s.restDayBank} left — taking a rest day shifts your plan forward`,
              isRestToday(s) ? 'TODAY RESTED' : 'TAKE',
              isRestToday(s) ? undefined : takeRestDay
            )}
            {row('Shortcuts', '1–6 tabs · T theme · Z undo · Space timer · Esc clock', '')}
          </div>
        ))}

        <div className="nt-youfoot">
          ESE<span className="sl">//</span>2027 STUDY OS · {APP_VERSION}
          <br />
          BUILT FOR ONE GOAL — JAN 31 2027
        </div>
      </div>

      <AddMockDialog open={mockOpen} onClose={() => setMockOpen(false)} />
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title || ''}
        sub={confirm?.sub}
        yesLabel={confirm?.yesLabel}
        onYes={() => confirm?.onYes()}
        onClose={() => setConfirm(null)}
      />
      {guide ? <GuideDialog open title={guide.title} body={guide.body} onClose={() => setGuide(null)} /> : null}
      {policyOpen ? (
        <MissedFocusPolicyDialog
          initial={policy}
          onClose={() => setPolicyOpen(false)}
        />
      ) : null}
    </div>
  )
}

function MissedFocusPolicyDialog({ initial, onClose }: { initial: MissedFocusSettings; onClose: () => void }) {
  const [qStart, setQStart] = useState(String(initial.quietStartHour))
  const [qEnd, setQEnd] = useState(String(initial.quietEndHour))
  const [delay, setDelay] = useState(String(initial.delayMinutes))
  const [limit, setLimit] = useState(String(initial.dailyLimit))
  const save = () => {
    const qs = parseInt(qStart, 10)
    const qe = parseInt(qEnd, 10)
    const dl = parseInt(delay, 10)
    const lm = parseInt(limit, 10)
    if (isNaN(qs) || isNaN(qe) || isNaN(dl) || isNaN(lm)) {
      toast('All fields are required numbers')
      return
    }
    window.AndroidESE?.setMissedFocusSettings?.(qs, qe, Math.round(dl), Math.round(lm), initial.noFocusHour)
    toast('Missed-focus policy updated')
    onClose()
    commit()
  }
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <div style={{ padding: '18px 6px 4px' }}>
          <div className="display" style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>Follow-up policy</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            <input className="bl-input" placeholder="Quiet start hour (22)" inputMode="numeric" value={qStart} onChange={(e) => setQStart(e.target.value)} />
            <input className="bl-input" placeholder="Quiet end hour (7)" inputMode="numeric" value={qEnd} onChange={(e) => setQEnd(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <input className="bl-input" placeholder="Delay minutes (15-180)" inputMode="numeric" value={delay} onChange={(e) => setDelay(e.target.value)} />
            <input className="bl-input" placeholder="Max per day (1-4)" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <button className="btn btn-ghost press" style={{ padding: 12, fontSize: 11.5, fontWeight: 800, borderRadius: 10, cursor: 'pointer' }} onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-acc press" style={{ padding: 12, fontSize: 11.5, fontWeight: 800, borderRadius: 10, cursor: 'pointer' }} onClick={save}>
              Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
