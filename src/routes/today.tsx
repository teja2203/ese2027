import { useEffect, useRef } from 'react'
import { Headphones, Check } from 'lucide-react'
import { useSnapshot, state, setNav } from '../lib/state'
import { todayDateLabel, todayFocus } from '../lib/schedule'
import { SLOTS, RANKER_QUOTES } from '../data'
import { escapeHtml } from '../lib/safe'
import { toggleTask, toggleShaky, nextQuote, ntPixelBurst, iceShatterShowcase } from '../lib/today-actions'
import { toggleRunning } from '../lib/pomodoro'
import { expandFocusOverlay, toggleDockDrawer } from '../lib/ui-state'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Late night grind'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Night session'
}

export function TodayScreen() {
  const checked = useSnapshot((s) => s.checked)
  const shaky = useSnapshot((s) => s.shaky)
  const freeze = useSnapshot((s) => s.freeze)
  const quoteIdx = useSnapshot((s) => s.quoteIdx)

  const { focusIdx, fd, st, tlog, streakObj } = todayFocus(state)

  /* first unfinished session */
  let curSi = -1
  for (let si = 0; si < fd.sessions.length; si++) {
    const done = fd.sessions[si].tasks.every((_: unknown, ti: number) => checked[`${focusIdx}-${si}-${ti}`])
    if (!done) {
      curSi = si
      break
    }
  }
  if (curSi === -1) curSi = fd.sessions.length - 1
  const curSession = fd.sessions[curSi]
  const slot = (SLOTS[curSi] as { label?: string; time?: string; desc?: string } | undefined) || {
    label: 'Session',
    time: '',
    desc: ''
  }
  const tasksDone = curSession.tasks.filter((_: unknown, ti: number) => checked[`${focusIdx}-${curSi}-${ti}`]).length
  const total = curSession.tasks.length
  const pct = total ? Math.round((tasksDone / total) * 100) : 0
  const allDone = total > 0 && tasksDone === total

  const isFrozen = streakObj.hasFrozen && tlog.minutes === 0
  const hrs = Math.floor(tlog.minutes / 60)
  const mins = tlog.minutes % 60

  const streakRef = useRef<HTMLSpanElement>(null)

  /* one-shot ice-shatter splash when a frozen streak resumes */
  useEffect(() => {
    if (!(streakObj.hasFrozen && tlog.minutes > 0)) return
    const y = new Date()
    y.setDate(y.getDate() - 1)
    const yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
    if (freeze[yk] && !sessionStorage.getItem('shatter-' + yk)) {
      sessionStorage.setItem('shatter-' + yk, '1')
      setTimeout(() => iceShatterShowcase(streakRef.current), 650)
    }
  }, [streakObj.hasFrozen, tlog.minutes, freeze])

  const quote = RANKER_QUOTES[quoteIdx % RANKER_QUOTES.length]

  return (
    <div className="screen view stagger">
      {/* greeting — dot-matrix date, weekday in red */}
      <div className="nt-greet">
        <div className="k mono">
          {greeting()} · Teja
        </div>
        <div className="h">
          <span className="day display">{fd.day}</span> <span className="display">{todayDateLabel()}</span>
        </div>
      </div>

      {/* hero — the one subject, the one action */}
      <div className="nt-hero">
        <div className="top">
          <span className="now mono">
            <span className="live" />
            {allDone ? 'Session cleared' : 'Study now'}
          </span>
          <span className="slot mono">
            {(slot.label || 'Session').toUpperCase()}
            {slot.time ? ' · ' + slot.time : ''}
          </span>
        </div>
        <div className="body">
          <div className="subject display">{curSession.title}</div>
          <div className="desc">{slot.desc || 'Complete every task to master this session.'}</div>
          <div className="nt-seg" aria-hidden="true">
            {curSession.tasks.map((_: unknown, ti: number) => (
              <i key={ti} className={checked[`${focusIdx}-${curSi}-${ti}`] ? 'on' : ''} />
            ))}
          </div>
          <div className="nt-segrow mono">
            <span>
              Session {curSi + 1} / {fd.sessions.length}
            </span>
            <span>
              <b className="display">{tasksDone}</b> / {total} · {pct}%
            </span>
          </div>
<button
              className={`btn ${allDone ? 'btn-ghost' : 'btn-acc'} press cta`}
              id="heroStartBtn"
              aria-label={allDone ? 'Review completed session' : 'Enter Focus Space'}
              onClick={() => {
                if (!state.pomo.running) toggleRunning()
                else expandFocusOverlay()
              }}
            >
            {allDone ? 'Completed — review' : 'Enter Focus Space'}
          </button>
<button
              className="btn btn-ghost press cta audio"
              id="heroAudioBtn"
              aria-label="Toggle ambient focus audio"
              onClick={() => toggleDockDrawer()}
            >
            <Headphones className="size-4" /> Ambient Focus Sound
          </button>
        </div>
      </div>

      {/* metrics — technical 3-cell grid (streak / today / on-track) */}
      <div className="nt-metrics">
        <button
          className={`cell fire-cell press ${isFrozen ? '' : 'on-fire'}`}
          aria-label={isFrozen ? 'Frozen streak' : 'Open streak progress'}
          onClick={() => {
            if (isFrozen) iceShatterShowcase(streakRef.current, { backToIce: true })
            else setNav('progress')
          }}
        >
          <div className="n display">
            <span ref={streakRef}>{streakObj.count}</span>
            <small>D</small>
          </div>
          <div className="l mono">{isFrozen ? 'Frozen' : 'Streak'}</div>
        </button>
        <div className="cell">
          <div className="n display">
            {hrs > 0 ? hrs : mins}
            <small>{hrs > 0 ? 'H' : 'M'}</small>
            {hrs > 0 ? (
              <>
                {mins}
                <small>M</small>
              </>
            ) : null}
          </div>
          <div className="l mono">Today</div>
        </div>
        <div className="cell">
          <div className="n display">
            {st.pct}
            <small>%</small>
          </div>
          <div className="l mono">On track</div>
        </div>
      </div>

      {/* the spine — this session's checklist */}
      <div className="nt-spine">
        <div className="head">
          <span className="t">This Session</span>
          <span className="c mono">
            {tasksDone} / {total}
          </span>
        </div>
        <div className="sub mono">Tap to complete · ! to flag shaky</div>
        <div className="tasklist">
          {curSession.tasks.map((task: string, ti: number) => {
            const k = `${focusIdx}-${curSi}-${ti}`
            const on = !!checked[k]
            const shk = !!shaky[k]
            return (
              <div className={`taskrow${on ? ' done' : ''}`} key={k}>
                <button
                  className="task-toggle press"
                  aria-pressed={on ? 'true' : 'false'}
                  aria-label={`${on ? 'Mark incomplete' : 'Mark complete'}: ${escapeHtml(task)}`}
                  onClick={(e) => {
                    if (!on) {
                      const chk = e.currentTarget.querySelector('.chk') as HTMLElement | null
                      if (chk) {
                        const b = chk.getBoundingClientRect()
                        ntPixelBurst(b.left + b.width / 2, b.top + b.height / 2)
                      }
                      try {
                        navigator.vibrate && navigator.vibrate(12)
                      } catch {}
                    }
                    state.index = focusIdx
                    toggleTask(curSi, ti)
                  }}
                >
                  <span className={`chk${on ? ' on' : ''}`}>{on ? <Check className="size-3.5" /> : null}</span>
                  <span className="txt">{task}</span>
                </button>
                <button
                  className={`shakybtn press${shk ? ' on' : ''}`}
                  aria-label={shk ? 'Remove shaky flag' : 'Mark as shaky'}
                  title="Mark topic as shaky"
                  onClick={() => {
                    state.index = focusIdx
                    toggleShaky(curSi, ti)
                  }}
                >
                  !
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* whisper — motivation as a quiet mono footnote (tap to cycle) */}
      <button
        className="nt-whisper press"
        aria-label="Show next study quote"
        onClick={() => nextQuote()}
      >
        <div className="q">"{quote.q}"</div>
        <div className="a mono">— {quote.a} · tap to cycle</div>
      </button>
    </div>
  )
}