/* ══════════════════════════════════════════════════════════════
   plan.tsx — PLAN tab (legacy renderPlan).
   Phase jump · day header · session accordions · task toggles ·
   shaky flags · prev/next day nav.
   ══════════════════════════════════════════════════════════════ */

import { useSnapshot, state, commit } from '../lib/state'
import * as S from '../lib/storage'
import { SCHED, SLOTS, JUMPS } from '../data'
import { dayStats, slotStreak, findTodayIndex } from '../lib/schedule'
import { toggleTask, toggleShaky, ntPixelBurst } from '../lib/today-actions'
import { escapeHtml } from '../lib/safe'
import { ChevronLeft, ChevronRight, Flame, Check } from 'lucide-react'

function badgeTier(b: string): string {
  const HOT = ['MOCK', 'GRAND TEST', 'MOCK MARATHON', 'ESE EXAM DAY', 'APTRANSCO EXAM', 'EXAM PREP', 'APTRANSCO SPRINT', 'PYQ SPRINT']
  const REST = ['REVISION', 'RECOVERY', 'TAPER']
  if (HOT.includes(b)) return 'hot'
  if (REST.includes(b)) return 'rest'
  return 'core'
}

function scrollTopSmooth() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function jumpTo(i: number) {
  state.index = Math.max(0, Math.min(SCHED.length - 1, i))
  S.saveJSON(S.IDX_KEY, state.index)
  scrollTopSmooth()
  commit()
}

function goToday() {
  const idx = findTodayIndex(state)
  jumpTo(idx >= 0 ? idx : 0)
}

export function PlanScreen() {
  const s = useSnapshot((x) => x)
  const day = SCHED[s.index]
  const st = dayStats(s, s.index)
  const segMarks = day.sessions.map((sess, si) =>
    sess.tasks.every((_, ti) => s.checked[`${s.index}-${si}-${ti}`]) ? <i key={si} className="on" /> : <i key={si} />
  )

  return (
    <div className="screen view nt-plan" role="tabpanel" aria-label="Plan">
      <div className="stagger">
        <div className="nt-plan-head">
          <div className="t">Plan<span style={{ color: 'var(--acc)' }}>.</span></div>
          <button className="today-btn press" onClick={goToday}>TODAY</button>
        </div>

        <select
          className="nt-jump"
          aria-label="Jump to phase"
          value={JUMPS.reduce((cur, j) => (j.i <= s.index ? j.i : cur), 0)}
          onChange={(e) => jumpTo(parseInt(e.target.value, 10))}
        >
          {JUMPS.map((j) => (
            <option key={j.i} value={j.i}>{j.label} · {j.date}</option>
          ))}
        </select>

        <div className="nt-dayhdr">
          <div className="ey">{day.day} · Day {s.index + 1} / {SCHED.length}</div>
          <div className="d">{day.date}</div>
          <div className="sub">{day.subject}</div>
          {day.badge ? <span className={`badge ${badgeTier(day.badge)}`}>{day.badge}</span> : null}
          <div className="prog">
            <div className="progrow">
              <span className="n">{st.pct}<small>%</small></span>
              <span className="l">{st.dn} / {st.tot} tasks · Day complete</span>
            </div>
            <div className="nt-seg">{segMarks}</div>
          </div>
        </div>

        <div className="sesslist">
          {(() => {
            const firstNotDone = day.sessions.findIndex((sess, si) => {
              const sd = sess.tasks.filter((_, ti) => s.checked[`${s.index}-${si}-${ti}`]).length
              return sd !== sess.tasks.length
            })
            return day.sessions.map((sess, si) => {
            const sd = sess.tasks.filter((_, ti) => s.checked[`${s.index}-${si}-${ti}`]).length
            const done = sd === sess.tasks.length
            const isCurrent = si === firstNotDone
            const expKey = `${s.index}-${si}`
            const expanded = s.expandedSessions[expKey] !== undefined ? s.expandedSessions[expKey] : !done
            const slot = SLOTS[si] || { label: 'Session', time: '', icon: '•' }
            const sstreak = slotStreak(s, si)
            return (
              <div key={si} className={`sess${isCurrent ? ' now' : ''}${done ? ' done' : ''}`}>
                <button
                  className="shead press"
                  onClick={() => {
                    state.expandedSessions[expKey] = !expanded
                    S.saveJSON(S.EXP_KEY, state.expandedSessions)
                    commit()
                  }}
                >
                  <span className="count">{sd}<small>/{sess.tasks.length}</small></span>
                  <span className="meta">
                    <span className="tags">
                      <span className="mtag">{slot.label}{slot.time ? ' · ' + slot.time : ''}</span>
                      {sstreak > 0 ? <span className="mtag streak"><Flame className="w-3 h-3" /> {sstreak}</span> : null}
                      {isCurrent ? <span className="mtag now">NOW</span> : null}
                      {done ? <span className="mtag done">DONE</span> : null}
                    </span>
                    <span className="stitle">{sess.title}</span>
                  </span>
                  <span className={`caret${expanded ? ' open' : ''}`}><ChevronRight className="w-4 h-4" /></span>
                </button>
                {expanded && (
                  <div className="tl">
                    {sess.tasks.map((task, ti) => {
                      const k = `${s.index}-${si}-${ti}`
                      const on = !!s.checked[k]
                      const shk = !!s.shaky[k]
                      return (
                        <div key={ti} className={`taskrow${on ? ' done' : ''}`}>
                          <button
                            className="task-toggle press"
                            aria-pressed={on ? 'true' : 'false'}
                            aria-label={`${on ? 'Mark incomplete' : 'Mark complete'}: ${task}`}
                            onClick={(e) => {
                              if (!on) {
                                const b = e.currentTarget.querySelector('.chk') as HTMLElement | null
                                if (b) {
                                  const r = b.getBoundingClientRect()
                                  ntPixelBurst(r.left + r.width / 2, r.top + r.height / 2)
                                }
                                try { navigator.vibrate && navigator.vibrate(12) } catch { /* no-op */ }
                              }
                              toggleTask(si, ti)
                            }}
                          >
                            <span className={`chk${on ? ' on' : ''}`} style={{ color: 'var(--acc-ink)' }}>
                              {on ? <Check className="w-3.5 h-3.5" /> : null}
                            </span>
                            <span className="txt">{escapeHtml(task)}</span>
                          </button>
                          <button
                            className={`shakybtn press${shk ? ' on' : ''}`}
                            aria-label={shk ? 'Remove shaky flag' : 'Mark as shaky'}
                            title="Mark topic as shaky"
                            onClick={() => toggleShaky(si, ti)}
                          >
                            !
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
            })
          })()}
        </div>

        <div className="daynav">
          <button className="press" disabled={s.index === 0} onClick={() => jumpTo(s.index - 1)}>
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <button className="press" disabled={s.index === SCHED.length - 1} onClick={() => jumpTo(s.index + 1)}>
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
