/* ══════════════════════════════════════════════════════════════
   focus-overlay.tsx — fullscreen focus mode (legacy #focusOverlay).
   The legacy breathing SVG ring is replaced by a Nothing 24-segment
   bar (the last ring in the app — closed 2026-08-19).
   ══════════════════════════════════════════════════════════════ */

import { useEffect } from 'react'
import { Pause, Play, SkipForward, Square } from 'lucide-react'
import { useUi, collapseFocusOverlay } from '../lib/ui-state'
import { usePomoTick, getRemainingPomo, fmtTime, phaseSecs, toggleRunning, skipPhase, resetPomo, setPhase, applyPreset, adjustDuration, toggleLoop, PRESETS } from '../lib/pomodoro'
import { useSnapshot, state, onBack, setNav } from '../lib/state'
import { useSoundMode, setFocusSoundMode } from '../lib/sound'
import { trapFocusIn } from '../lib/focus-trap'
import { escapeHtml } from '../lib/safe'
import { SCHED } from '../data'

export function FocusOverlay() {
  const ui = useUi()
  const pomo = useSnapshot((s) => s.pomo)
  const checked = useSnapshot((s) => s.checked)
  const sound = useSoundMode()
  usePomoTick()

  const remain = getRemainingPomo()
  const secs = phaseSecs()
  const pct = secs ? Math.round((1 - remain / secs) * 100) : 0
  const NSEG = 24
  const onSeg = Math.round((pct / 100) * NSEG)

  /* current task title (legacy parity) */
  let taskTitle = 'Study session'
  {
    const idx = state.index
    const day = SCHED[idx]
    if (day && day.sessions) {
      const cur = day.sessions.find((_: unknown, si: number) =>
        !day.sessions[si].tasks.every((__: unknown, ti: number) => checked[`${idx}-${si}-${ti}`])
      )
      if (cur && cur.title) taskTitle = String(cur.title).split('—')[0].trim()
      else if (day.subject) taskTitle = String(day.subject).split('—')[0].trim()
    }
  }

  /* focus trap + back press */
  useEffect(() => {
    if (!ui.overlayOpen) return
    const detrap = trapFocusIn(document.getElementById('focusOverlay') as HTMLElement)
    const offBack = onBack(() => {
      collapseFocusOverlay()
      return true
    })
    return () => {
      detrap()
      offBack()
    }
  }, [ui.overlayOpen])

  if (!ui.overlayOpen) return null

  return (
    <div className="foverlay-wrap" id="focusOverlay" role="dialog" aria-modal="true" aria-label="Focus session">
      <div className="foverlay-stack">
        <div className="foverlay-header">
          <button
            className="fbtn-sub press"
            onClick={() => {
              collapseFocusOverlay()
              setNav('focus')
            }}
          >
            Full Focus View
          </button>
          <button className="fexit press" aria-label="Close focus overlay" onClick={collapseFocusOverlay}>
            Done ✕
          </button>
        </div>

        <button
          className="fchip press"
          title="Switch Focus/Break"
          onClick={() => setPhase(pomo.phase === 'work' ? 'break' : 'work')}
        >
          {pomo.phase === 'work' ? 'FOCUS' : 'BREAK'}
        </button>

        {/* Nothing identity: 24-segment bar instead of the breathing ring */}
        <div className="fseg-wrap" aria-hidden="true">
          <div className="nt-seg fseg big">
            {Array.from({ length: NSEG }, (_, i) => (
              <i key={i} className={i < onSeg ? 'on' : ''} />
            ))}
          </div>
        </div>
        <div className="bignum">{fmtTime(remain)}</div>
        <div className="bigsub">{pomo.phase === 'work' ? 'MINUTES FOCUS' : 'MINUTES BREAK'}</div>

        <div className="ftask">
          <div className="fk">CURRENT TASK</div>
          <div className="ft">{escapeHtml(taskTitle)}</div>
        </div>

        <div className="fctrl">
          <button className="fbtn press" title="Skip phase" onClick={skipPhase}>
            <SkipForward className="size-4" />
          </button>
          <button className="fbtn main press" title="Play/Pause" onClick={toggleRunning}>
            {pomo.running ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>
          <button className="fbtn press" title="Reset timer" onClick={resetPomo}>
            <Square className="size-4" />
          </button>
        </div>

        <div className="fcustom-panel">
          <div className="fcustom-title">CUSTOMIZE SESSION TIMING</div>
          <div className="fpresets-row">
            {PRESETS.map((p) => {
              const active = pomo.workMins === p.work && pomo.breakMins === p.brk
              return (
                <button
                  key={p.label}
                  className={`fpreset-chip press${active ? ' active' : ''}`}
                  onClick={() => applyPreset(p.work, p.brk)}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
          <div className="fsteppers-grid">
            <div className="fstepper-box">
              <span>{pomo.workMins}m Focus</span>
              <div>
                <button className="fstep-btn press" onClick={() => adjustDuration('work', -5)}>
                  −5m
                </button>
                <button className="fstep-btn press" onClick={() => adjustDuration('work', 5)}>
                  +5m
                </button>
              </div>
            </div>
            <div className="fstepper-box">
              <span>{pomo.breakMins}m Break</span>
              <div>
                <button className="fstep-btn press" onClick={() => adjustDuration('break', -5)}>
                  −5m
                </button>
                <button className="fstep-btn press" onClick={() => adjustDuration('break', 5)}>
                  +5m
                </button>
              </div>
            </div>
          </div>
          <button className={`floop-btn press${pomo.loop ? ' on' : ''}`} onClick={toggleLoop}>
            Auto Loop: {pomo.loop ? 'ON' : 'OFF'}
          </button>
          <div className="fambient-row">
            {(['off', 'brown', 'pink', 'sol528'] as const).map((m) => (
              <button
                key={m}
                className={`dsound-btn press${sound.mode === m ? ' active' : ''}`}
                onClick={() => setFocusSoundMode(m)}
              >
                {m === 'off' ? 'Off' : m === 'sol528' ? '528Hz' : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}