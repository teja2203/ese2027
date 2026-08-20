/* ══════════════════════════════════════════════════════════════
   focus.tsx — Focus Space screen (legacy renderFocus). Big dot-matrix
   countdown, 24-seg progress, phase keys, run/reset/skip, presets,
   steppers, auto-loop switch, next-session card, today's totals.
   ══════════════════════════════════════════════════════════════ */

import { RotateCcw, Play, Pause, SkipForward, Maximize2 } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'
import { useSnapshot, state } from '../lib/state'
import { usePomoTick, getRemainingPomo, fmtTime, phaseSecs, toggleRunning, resetPomo, skipPhase, setPhase, applyPreset, adjustDuration, toggleLoop, PRESETS } from '../lib/pomodoro'
import { useUi, enterClock } from '../lib/ui-state'
import { onRitual } from '../lib/rituals'
import { fxFlash, fxSignalLine } from '../lib/celebrate-fx'
import { requestAppFullscreen } from '../lib/fullscreen'
import * as S from '../lib/storage'

export function FocusScreen() {
  const nav = useSnapshot((s) => s.nav)
  const pomo = useSnapshot((s) => s.pomo)
  const logSize = useSnapshot((s) => Object.keys(s.log).length)
  const ui = useUi()
  usePomoTick()

  const secs = phaseSecs()
  const remain = getRemainingPomo()
  const pct = secs ? ((secs - remain) / secs) * 100 : 0
  const NSEG = 24
  const onSeg = Math.round((pct / 100) * NSEG)

  const tlog = state.log[S.todayKey()] || { sessions: 0, minutes: 0 }
  const hrs = Math.floor(tlog.minutes / 60)
  const mins = tlog.minutes % 60

  /* session-complete ritual: 24-seg cascade (SPEC §2) */
  const [cascadeKey, setCascadeKey] = useState(0)
  const [firstRun, setFirstRun] = useState(() => logSize === 0)
  useEffect(() => {
    return onRitual((r) => {
      if (r.type !== 'session') return
      setCascadeKey((k) => k + 1)
      fxSignalLine()
      fxFlash()
    })
  }, [])
  useEffect(() => {
    setFirstRun(logSize === 0)
  }, [logSize])

  if (nav !== 'focus') return null

  return (
    <div className="screen view stagger">
      <div className="nt-flabel">
        <span className="t">FOCUS SPACE</span>
        <span className="s">DEEP WORK · POMODORO</span>
      </div>

      {/* phase switch — two square segmented keys */}
      <div className="nt-fphase">
        <button className={`press${pomo.phase === 'work' ? ' on' : ''}`} aria-label="Start focus session" onClick={() => setPhase('work')}>
          <span className="pl">FOCUS</span>
          <span className="pm">
            {pomo.workMins}
            <i>M</i>
          </span>
        </button>
        <button className={`press${pomo.phase === 'break' ? ' on' : ''}`} aria-label="Start break session" onClick={() => setPhase('break')}>
          <span className="pl">BREAK</span>
          <span className="pm">
            {pomo.breakMins}
            <i>M</i>
          </span>
        </button>
      </div>

      {/* the ONE readout */}
      <div className="nt-fclock">
        <div className="phase">{pomo.phase === 'work' ? 'FOCUS' : 'BREAK'}</div>
        <div className="big">{fmtTime(remain)}</div>
        <div key={cascadeKey || 'idle'} className={'nt-seg fseg' + (cascadeKey ? ' cascade' : '')}>
          {Array.from({ length: NSEG }, (_, i) => (
            <i
              key={i}
              className={i < onSeg ? 'on' : ''}
              style={{ '--i': i, '--seg-bg': i < onSeg ? 'var(--acc)' : 'transparent' } as CSSProperties}
            />
          ))}
        </div>
        {firstRun && !pomo.running ? (
          <div className="nt-fwhisper">strike the first signal</div>
        ) : null}
        <div className="loopnote">{pomo.loop ? 'AUTO LOOP ON' : 'SINGLE SESSION'}</div>
      </div>

      {/* controls */}
      <div className="nt-fctrl">
        <button className="fkey press" aria-label="Reset timer" onClick={resetPomo}>
          <RotateCcw />
        </button>
        <button className={`fkey run press${firstRun && !pomo.running ? ' pulse' : ''}`} aria-label={pomo.running ? 'Pause' : 'Start'} onClick={toggleRunning}>
          {pomo.running ? <Pause /> : <Play />}
        </button>
        <button className="fkey press" aria-label="Skip phase" onClick={skipPhase}>
          <SkipForward />
        </button>
      </div>

      {/* re-enter clock mode while running */}
      {pomo.running && !ui.clockOn && (
        <button
          className="nt-fclockbtn press"
          onClick={() => {
            enterClock()
            requestAppFullscreen()
          }}
        >
          <Maximize2 /> ENTER CLOCK MODE
        </button>
      )}

      {/* presets */}
      <div className="nt-fpresets">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            className={`fpre press${pomo.workMins === p.work && pomo.breakMins === p.brk ? ' on' : ''}`}
            onClick={() => applyPreset(p.work, p.brk)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* steppers */}
      <div className="nt-fsteppers">
        {(
          [
            ['work', 'FOCUS MIN', pomo.workMins],
            ['break', 'BREAK MIN', pomo.breakMins]
          ] as const
        ).map(([w, label, val]) => (
          <div className="fstep" key={w}>
            <div className="lab">
              <div className="k">{label}</div>
              <div className="v">{val}</div>
            </div>
            <div className="btns">
              <button className="press" onClick={() => adjustDuration(w, 5)} aria-label="+5 minutes">
                +
              </button>
              <button className="press" onClick={() => adjustDuration(w, -5)} aria-label="-5 minutes">
                −
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* loop toggle */}
      <button className={`nt-floop press${pomo.loop ? ' on' : ''}`} aria-label={pomo.loop ? 'Disable loop' : 'Enable loop'} onClick={toggleLoop}>
        <span className="lt">AUTO LOOP · FOCUS → BREAK</span>
        <span className="sw">
          <i />
        </span>
      </button>

      {/* today's totals */}
      <div className={`nt-fstats ${tlog.distract ? 'c3' : 'c2'}`}>
        <div className="fst">
          <div className="n">{tlog.sessions || 0}</div>
          <div className="l">Sessions today</div>
        </div>
        <div className="fst">
          <div className="n">
            {hrs}
            <i>h</i> {mins}
            <i>m</i>
          </div>
          <div className="l">Focus today</div>
        </div>
        {tlog.distract ? (
          <div className="fst">
            <div className="n">{tlog.distract}</div>
            <div className="l">Distractions</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}