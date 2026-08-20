/* ══════════════════════════════════════════════════════════════
   timer-dock.tsx — floating timer dock (legacy #timerDock) + the
   quick-customization drawer (legacy #timerDockDrawer).
   Visible on every screen except Focus; tap to expand the overlay.
   The drawer is now reachable via a gear button on the dock (the
   legacy dead #dockCustom query is fixed here).
   ══════════════════════════════════════════════════════════════ */

import { Play, Pause, Maximize2, X } from 'lucide-react'
import { useUi, expandFocusOverlay, toggleDockDrawer, closeDockDrawer } from '../lib/ui-state'
import { usePomoTick, getRemainingPomo, fmtTime, toggleRunning, applyPreset, adjustDuration, toggleLoop, setPhase, PRESETS } from '../lib/pomodoro'
import { useSnapshot, state } from '../lib/state'
import { useSoundMode, setFocusSoundMode } from '../lib/sound'
import { SCHED } from '../data'

export function TimerDock() {
  const ui = useUi()
  const nav = useSnapshot((s) => s.nav)
  const pomo = useSnapshot((s) => s.pomo)
  const checked = useSnapshot((s) => s.checked)
  const sound = useSoundMode()
  usePomoTick()

  if (nav === 'focus') return null
  if (pomo.docked === false) return null

  const remain = getRemainingPomo()
  const phaseLabel = pomo.phase === 'work' ? 'FOCUS' : 'BREAK'
  let taskTitle = 'Study session'
  try {
    const fd = SCHED[state.index]
    if (fd && fd.sessions) {
      const cur = fd.sessions.find((_: unknown, si: number) =>
        !fd.sessions[si].tasks.every((__: unknown, ti: number) => checked[`${state.index}-${si}-${ti}`])
      )
      if (cur && cur.title) taskTitle = String(cur.title).split('—')[0].trim()
      else if (fd.subject) taskTitle = String(fd.subject).split('—')[0].trim()
    }
  } catch {
    /* default title */
  }

  return (
    <>
      <div className="timer-dock show" id="timerDock">
        <button className="dtime-box press" onClick={expandFocusOverlay} aria-label="Expand focus overlay">
          <div className="dtime">{fmtTime(remain)}</div>
          <div className="dphase">{phaseLabel}</div>
        </button>
        <button className="dmeta press" onClick={expandFocusOverlay} aria-label="Expand focus overlay">
          <div className="dtask">{taskTitle}</div>
        </button>
        <button
          className="dicon-btn press"
          aria-label="Timer settings"
          title="Timer settings"
          onClick={toggleDockDrawer}
        >
          <span className={ui.dockDrawerOpen ? 'gear-open' : ''}>⚙</span>
        </button>
        <button
          className="dbtn main press"
          id="dockPlayPause"
          aria-label={pomo.running ? 'Pause timer' : 'Start timer'}
          onClick={(e) => {
            e.stopPropagation()
            toggleRunning()
          }}
        >
          {pomo.running ? <Pause className="size-5" /> : <Play className="size-5" />}
        </button>
      </div>

      {ui.dockDrawerOpen && (
        <div className="ddrawer card" id="timerDockDrawer">
          <div className="ddrawer-header">
            <span className="ddrawer-title">QUICK TIMER CUSTOMIZATION</span>
            <button className="ddrawer-close press" aria-label="Close timer settings" onClick={closeDockDrawer}>
              <X className="size-3.5" />
            </button>
          </div>
          <div className="ddrawer-presets">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                className={`dpreset-chip press${pomo.workMins === p.work && pomo.breakMins === p.brk ? ' active' : ''}`}
                onClick={() => applyPreset(p.work, p.brk)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="ddrawer-grid">
            <div className="ddrawer-box">
              <span className="ddrawer-lbl">
                Focus: <b>{pomo.workMins}m</b>
              </span>
              <div>
                <button className="ddrawer-btn press" onClick={() => adjustDuration('work', -5)}>
                  −5m
                </button>
                <button className="ddrawer-btn press" onClick={() => adjustDuration('work', 5)}>
                  +5m
                </button>
              </div>
            </div>
            <div className="ddrawer-box">
              <span className="ddrawer-lbl">
                Break: <b>{pomo.breakMins}m</b>
              </span>
              <div>
                <button className="ddrawer-btn press" onClick={() => adjustDuration('break', -5)}>
                  −5m
                </button>
                <button className="ddrawer-btn press" onClick={() => adjustDuration('break', 5)}>
                  +5m
                </button>
              </div>
            </div>
          </div>
          <div className="ddrawer-actions">
            <button className={`ddrawer-action press${pomo.loop ? ' active' : ''}`} onClick={toggleLoop}>
              Loop: {pomo.loop ? 'ON' : 'OFF'}
            </button>
            <button
              className="ddrawer-action press"
              onClick={() => setPhase(pomo.phase === 'work' ? 'break' : 'work')}
            >
              {pomo.phase === 'work' ? 'Focus Phase' : 'Break Phase'}
            </button>
            <button
              className="ddrawer-action press"
              title="Expand Full Screen"
              onClick={() => {
                closeDockDrawer()
                expandFocusOverlay()
              }}
            >
              <Maximize2 className="size-3.5" /> Overlay
            </button>
          </div>
          <div className="ddrawer-sound">
            <div className="ddrawer-sound-head">
              <span>AMBIENT FOCUS AUDIO</span>
              <span className="ddrawer-sound-mode">{sound.mode.toUpperCase()}</span>
            </div>
            <div className="ddrawer-sound-grid">
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
      )}
    </>
  )
}