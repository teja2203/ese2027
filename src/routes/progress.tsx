/* ══════════════════════════════════════════════════════════════
   progress.tsx — PROGRESS tab (legacy renderProgress).
   Overall % · counters · streaks · achievements grid · 35-day
   heatmap · 7-day bars · session quality · habits · subjects.
   ══════════════════════════════════════════════════════════════ */

import { useRef, useState } from 'react'
import { useSnapshot, state, commit } from '../lib/state'
import * as S from '../lib/storage'
import { SCHED, WD, MON, baseSubj } from '../data'
import { overall, doneDaysCount, computeSessionStreak } from '../lib/schedule'
import { computeStreak } from '../lib/stats'
import { ACHIEVEMENTS, achMetrics, achProgress, nextAchievement } from '../lib/achievements'

const NSEG_OVERALL = 28
const NSEG_SUBJ = 16

function fmtDateKey(d: Date): string {
  return `${d.getFullYear()}-${S.fmt(d.getMonth() + 1)}-${S.fmt(d.getDate())}`
}

function OverallHeader() {
  const s = useSnapshot((x) => x)
  const ov = overall(s)
  const onSeg = Math.round((ov.pct / 100) * NSEG_OVERALL)
  return (
    <div className="nt-phead">
      <div className="phrow">
        <span className="pk">OVERALL COMPLETE</span>
        <span className="pv">{ov.dn} / {ov.tot} TASKS</span>
      </div>
      <div className="pbig">{ov.pct}<span className="pc">%</span></div>
      <div className="nt-seg phseg">
        {Array.from({ length: NSEG_OVERALL }, (_, i) => (
          <i key={i} className={i < onSeg ? 'on' : ''} />
        ))}
      </div>
    </div>
  )
}

function CountersGrid() {
  const s = useSnapshot((x) => x)
  const entries = Object.values(s.log)
  const totSessions = entries.reduce((a, e) => a + (e.sessions || 0), 0)
  const totHours = Math.floor(entries.reduce((a, e) => a + (e.minutes || 0), 0) / 60)
  const ov = overall(s)
  return (
    <div className="nt-pgrid">
      <div className="pcell"><div className="n">{doneDaysCount(s)}</div><div className="l">Days cleared</div></div>
      <div className="pcell"><div className="n">{ov.dn}</div><div className="l">Tasks done</div></div>
      <div className="pcell"><div className="n">{totSessions}</div><div className="l">Total sessions</div></div>
      <div className="pcell"><div className="n">{totHours}<i>H</i></div><div className="l">Total hours</div></div>
    </div>
  )
}

function StreakCells() {
  const s = useSnapshot((x) => x)
  const pStreakObj = computeStreak(s)
  const pIsFrozen = pStreakObj.hasFrozen && (s.log[S.todayKey()] || { minutes: 0 }).minutes === 0
  return (
    <div className="nt-pstreak">
      <div className={`pstk${pIsFrozen ? ' frozen' : ''}`}>
        <div className="sk">{pIsFrozen ? 'FROZEN STREAK' : 'DAY STREAK'}</div>
        <div className="sn">{pStreakObj.count}<i>D</i></div>
        <div className="ss">{pIsFrozen ? 'PROTECTED BY FREEZE' : 'CONSECUTIVE DAYS'}</div>
      </div>
      <div className="pstk">
        <div className="sk acc">SESSION STREAK</div>
        <div className="sn acc">{computeSessionStreak(s)}</div>
        <div className="ss">IN-SLOT FOCUS</div>
      </div>
    </div>
  )
}

function fmtUnlockDate(iso: string): string {
  try {
    const d = new Date(iso)
    return `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
  } catch {
    return ''
  }
}

function AchievementsBlock() {
  const s = useSnapshot((x) => x)
  const m = achMetrics(s)
  const nx = nextAchievement(s)
  const unlocked = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length
  return (
    <div className="nt-pach">
      <div className="pachhd">
        <span className="t">ACHIEVEMENTS</span>
        <span className="c">{unlocked} / {ACHIEVEMENTS.length}</span>
      </div>
      <div className="nt-achgrid">
        {ACHIEVEMENTS.map((a) => {
          const rec = s.achievements[a.id]
          const on = !!rec
          const have = achProgress(a, m)
          const pct = Math.round((have / a.goal) * 100)
          const isNext = nx?.a.id === a.id
          const fresh = on && !!rec.at && Date.now() - new Date(rec.at).getTime() < 8000
          return (
            <div
              key={a.id}
              className={`achwrap ${on ? 'on' : 'locked'} ${isNext ? 'next' : ''} ${fresh ? 'fresh' : ''}`}
              title={a.desc}
            >
              <div className="achicon">{a.icon}</div>
              <div className="achtitle">{a.title}</div>
              {on ? (
                <div className="achdate">{fmtUnlockDate(rec.at)}</div>
              ) : isNext ? (
                <div className="achprog">
                  <div className="nt-seg achseg">
                    <i className={pct >= 25 ? 'on' : ''} />
                    <i className={pct >= 50 ? 'on' : ''} />
                    <i className={pct >= 75 ? 'on' : ''} />
                    <i className={pct >= 100 ? 'on' : ''} />
                  </div>
                  <div className="achpc">{have} / {a.goal}</div>
                </div>
              ) : (
                <div className="achdate locked">{have} / {a.goal}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Heatmap() {
  const s = useSnapshot((x) => x)
  const tk = S.todayKey()
  const cells: { k: string; m: number; lvl: number; isToday: boolean; delay: number }[] = []
  for (let i = 34; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const k = fmtDateKey(d)
    const m = (s.log[k] || { minutes: 0 }).minutes
    let lvl = 0
    if (m > 0) lvl = 1
    if (m >= 120) lvl = 2
    if (m >= 300) lvl = 3
    if (m >= 480) lvl = 4
    cells.push({ k, m, lvl, isToday: k === tk, delay: i * 9 })
  }
  const hrsTxt = (m: number) => (m === 0 ? '0h (No study)' : `${Math.floor(m / 60)}h ${m % 60}m`)
  return (
    <div className="nt-pcard">
      <div className="pch">CONSISTENCY · LAST 5 WEEKS</div>
      <div className="heatgrid">
        {cells.map((c) => (
          <div
            key={c.k}
            className={`hcell l${c.lvl}${c.isToday ? ' today' : ''}`}
            title={`${c.k} · ${hrsTxt(c.m)}`}
            style={{ animationDelay: `${c.delay}ms` }}
          />
        ))}
      </div>
      <div className="heatleg">
        <span>0H</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={`hkey l${l}`} />
        ))}
        <span>8H+</span>
      </div>
    </div>
  )
}

function SevenDayBars() {
  const s = useSnapshot((x) => x)
  const days: { e: { minutes: number }; isT: boolean; dow: number; d: Date }[] = []
  let maxM = 1
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const k = fmtDateKey(d)
    const e = s.log[k] || { minutes: 0 }
    maxM = Math.max(maxM, e.minutes)
    days.push({ e, isT: i === 0, dow: d.getDay(), d })
  }
  return (
    <div className="nt-pcard">
      <div className="pch">STUDY TIME · LAST 7 DAYS</div>
      <div className="barrow">
        {days.map(({ e, isT, dow, d }) => {
          const h = Math.max(4, Math.round((e.minutes / maxM) * 72))
          const lbl =
            e.minutes >= 60
              ? Math.floor(e.minutes / 60) + 'h' + (e.minutes % 60 ? S.fmt(e.minutes % 60) : '')
              : e.minutes > 0
                ? e.minutes + 'm'
                : ''
          return (
            <div key={fmtDateKey(d)} className="barcol" title={`${fmtDateKey(d)} · ${e.minutes} min`}>
              <span className={`bv ${e.minutes ? (isT ? 'on' : '') : 'z'}`}>{lbl || '·'}</span>
              <div
                className={`bcap ${e.minutes ? (isT ? 'on' : 'dim') : 'z'}`}
                style={{ height: `${h}px` }}
              />
              <span className={`bd ${isT ? 'on' : ''}`}>{WD[dow]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SessionQuality() {
  const s = useSnapshot((x) => x)
  const entries: { k: string; r: number; m: number; isT: boolean }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const k = fmtDateKey(d)
    const r = s.ratings[k]
    entries.push({ k, r: typeof r === 'number' ? r : 0, m: (s.log[k] || { minutes: 0 }).minutes, isT: i === 0 })
  }
  const rated = Object.keys(s.ratings).filter((k) => typeof s.ratings[k] === 'number')
  if (!rated.length) return null
  const avg = rated.reduce((sum, k) => sum + (s.ratings[k] as number), 0) / rated.length
  let hiM = 0, hiN = 0, loM = 0, loN = 0
  rated.forEach((k) => {
    const m = (s.log[k] || { minutes: 0 }).minutes
    const r = s.ratings[k] as number
    if (r >= 4) { hiM += m; hiN++ } else if (r <= 2) { loM += m; loN++ }
  })
  const hrs = (m: number) => Math.round((m / 60) * 10) / 10
  let insight = 'RATE EVERY EVENING — THE PATTERN WILL SURFACE'
  if (hiN && loN) insight = `GOOD DAYS AVERAGE ${hrs(hiM / hiN)}H · ROUGH DAYS ${hrs(loM / loN)}H`
  else if (hiN) insight = `YOUR ${rated.length > 1 ? avg.toFixed(1) : '5.0'}★ FORM RUNS ON ${hrs(hiM / hiN)}H DAYS`
  return (
    <div className="nt-pcard">
      <div className="pch">SESSION QUALITY · SELF-RATED</div>
      <div className="qrow">
        <div className="qavg">
          <span className="qn">{avg.toFixed(1)}</span>
          <span className="qd">AVG · {rated.length} DAYS RATED</span>
        </div>
        <div className="qtrace">
          {entries.map(({ k, r, m, isT }) => (
            <div
              key={k}
              className={`qcol${isT ? ' today' : ''}`}
              title={`${k} · ${r ? r + '/5' : 'not rated'}${m ? ' · ' + Math.floor(m / 60) + 'h' + (m % 60 ? m % 60 : '') : ''}`}
            >
              {[5, 4, 3, 2, 1].map((l) => (
                <i key={l} className={`${r >= l ? 'on' : ''} ${r >= 4 && r >= l ? 'hi' : ''}`} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="qinsight">{insight}</div>
    </div>
  )
}

function HabitsBlock() {
  const s = useSnapshot((x) => x)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  const toggleExpanded = (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  const habitStreak = (id: string): number => {
    let streak = 0
    for (let i = 1; i <= 365; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const k = fmtDateKey(d)
      if (s.habitLog[k] && s.habitLog[k][id] === true) streak++
      else break
    }
    if (s.habitLog[S.todayKey()] && s.habitLog[S.todayKey()][id] === true) streak++
    return streak
  }

  const toggleHabit = (id: string, checked: boolean) => {
    const tk = S.todayKey()
    if (!state.habitLog[tk]) state.habitLog[tk] = {}
    state.habitLog[tk][id] = !checked
    S.saveJSON(S.HABIT_LOG_KEY, state.habitLog)
    commit()
  }

  const deleteHabit = (id: string) => {
    state.habits = state.habits.filter((h) => h.id !== id)
    S.saveJSON(S.HABIT_KEY, state.habits)
    commit()
  }

  const addHabit = () => {
    const name = (inputRef.current?.value || '').trim()
    if (!name) return
    state.habits.push({ id: 'h' + Date.now(), name: name.toUpperCase() })
    S.saveJSON(S.HABIT_KEY, state.habits)
    if (inputRef.current) inputRef.current.value = ''
    commit()
  }

  const tk = S.todayKey()

  return (
    <div className="nt-pcard">
      <div className="pch">HABITS · DAILY CHECKLIST</div>
      <div className="hbt-body">
        {!state.habits.length && <div className="hbt-empty">No habits yet — add your first one below.</div>}
        {state.habits.map((h) => {
          const checked = !!(state.habitLog[tk] && state.habitLog[tk][h.id])
          const streak = habitStreak(h.id)
          const isExpanded = expanded.has(h.id)
          return (
            <div key={h.id}>
              <div className={`hbt-row ${checked ? 'hbt-done' : ''} ${isExpanded ? 'hbt-expanded' : ''}`}>
                <button
                  className="hbt-check press"
                  aria-label={checked ? `Uncheck ${h.name}` : `Check ${h.name}`}
                  onClick={() => toggleHabit(h.id, checked)}
                >
                  <span className="hbt-box">{checked ? '▫' : '▪'}</span>
                </button>
                <span className="hbt-name" onClick={() => toggleExpanded(h.id)}>{h.name}</span>
                <span className="hbt-streak">{streak > 0 ? streak + 'D' : ''}</span>
                <button
                  className="hbt-exp press"
                  aria-label={`Toggle history for ${h.name}`}
                  onClick={() => toggleExpanded(h.id)}
                >
                  {isExpanded ? '▴' : '▾'}
                </button>
                <button className="hbt-del press" aria-label={`Delete habit ${h.name}`} title="Remove" onClick={() => deleteHabit(h.id)}>
                  ✕
                </button>
              </div>
              {isExpanded && (
                <div className="hbt-hist">
                  <div className="hbt-hist-grid">
                    {Array.from({ length: 28 }, (_, ii) => {
                      const i = 27 - ii
                      const d = new Date()
                      d.setDate(d.getDate() - i)
                      const k = fmtDateKey(d)
                      const log = state.habitLog[k]
                      const val = log ? log[h.id] : undefined
                      const cls = val === true ? 'done' : val === false ? 'miss' : 'none'
                      return <span key={k} className={`hbt-hd ${cls}${i === 0 ? ' today-dot' : ''}`} title={k} />
                    })}
                  </div>
                  <div className="hbt-hist-stats">{histStats(h.id)}</div>
                </div>
              )}
            </div>
          )
        })}
        <div className="hbt-addrow">
          <input
            ref={inputRef}
            className="hbt-input"
            placeholder="NEW HABIT NAME"
            maxLength={40}
            autoComplete="off"
            onKeyDown={(e) => { if (e.key === 'Enter') addHabit() }}
          />
          <button className="btn btn-acc hbt-add press" onClick={addHabit}>ADD</button>
        </div>
      </div>
    </div>
  )

  function histStats(id: string): string {
    let done = 0, logged = 0
    for (let i = 27; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const k = fmtDateKey(d)
      const log = state.habitLog[k]
      const val = log ? log[id] : undefined
      if (val !== undefined) { logged++; if (val) done++ }
    }
    const pct = logged > 0 ? Math.round((done / logged) * 100) : 0
    return `28D · ${done}/${logged} DONE · ${pct}%`
  }
}

function SubjectsBlock() {
  const s = useSnapshot((x) => x)
  const bySubj: Record<string, { tot: number; dn: number }> = {}
  SCHED.forEach((d, i) => {
    const b = baseSubj(d.subject)
    if (!bySubj[b]) bySubj[b] = { tot: 0, dn: 0 }
    d.sessions.forEach((sess, si) => {
      bySubj[b].tot += sess.tasks.length
      sess.tasks.forEach((_, ti) => {
        if (s.checked[`${i}-${si}-${ti}`]) bySubj[b].dn++
      })
    })
  })
  const rows = Object.keys(bySubj)
    .map((name) => ({ name, e: bySubj[name] }))
    .filter(({ e }) => e.tot > 0)
  return (
    <div className="nt-pcard">
      <div className="pch">SUBJECT COMPLETION</div>
      <div className="subjlist">
        {rows.map(({ name, e }) => {
          const pc = Math.round((e.dn / e.tot) * 100)
          if (pc === 0 && e.tot < 20) return null
          const son = Math.round((pc / 100) * NSEG_SUBJ)
          return (
            <div key={name} className={`subj${pc === 100 ? ' full' : ''}`}>
              <div className="srow">
                <span className="sn">{name}</span>
                <span className="sp">{pc}<i>%</i></span>
              </div>
              <div className="nt-seg sseg">
                {Array.from({ length: NSEG_SUBJ }, (_, i) => (
                  <i key={i} className={i < son ? 'on' : ''} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ProgressScreen() {
  return (
    <div className="screen view" role="tabpanel" aria-label="Progress">
      <div className="stagger">
        <div className="nt-flabel"><span className="t">PROGRESS</span><span className="s">MASTERY BREAKDOWN</span></div>
        <OverallHeader />
        <CountersGrid />
        <StreakCells />
        <AchievementsBlock />
        <Heatmap />
        <SevenDayBars />
        <SessionQuality />
        <HabitsBlock />
        <SubjectsBlock />
      </div>
    </div>
  )
}
