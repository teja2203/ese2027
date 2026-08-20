/* ══════════════════════════════════════════════════════════════
   flip-clock.tsx — fullscreen split-flap focus clock (legacy wfc).
   Split-flap animation is DOM-driven (CSS folds); digits update on
   the 500ms pomodoro tick. Back/Pause/Stop are hold-to-confirm in
   strict mode, plain taps otherwise.
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react'
import { useUi, leaveClock } from '../lib/ui-state'
import { usePomoTick, getRemainingPomo, fmt, toggleRunning, resetPomo } from '../lib/pomodoro'
import { useSnapshot, onBack } from '../lib/state'
import { playSound } from '../lib/sound'
import { onRitual } from '../lib/rituals'
import { fxSignalLine } from '../lib/celebrate-fx'
import { HoldButton } from './hold-button'

declare global {
  interface HTMLDivElement {
    _shown?: string
    _t1?: ReturnType<typeof setTimeout> | null
    _t2?: ReturnType<typeof setTimeout> | null
  }
}

function FlipCard({ val, id }: { val: string; id: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const card = ref.current
    if (!card) return
    if (card._shown === val) return
    const top = card.querySelector('.wfc-top span')
    const bottom = card.querySelector('.wfc-bottom span')
    const ft = card.querySelector('.wfc-flip.top span')
    const fb = card.querySelector('.wfc-flip.bottom span')
    if (!top || !bottom || !ft || !fb) return
    const shown = card._shown
    if (!card._t1 && !card._t2 && shown !== undefined) {
      /* normal flip: animate the fold */
      ft.textContent = shown
      fb.textContent = val
      card.classList.remove('go')
      void card.offsetWidth
      card.classList.add('go')
      playSound('flip')
      card._t1 = setTimeout(() => {
        top.textContent = val
        card._t1 = null
      }, 300)
      card._t2 = setTimeout(() => {
        bottom.textContent = val
        card.classList.remove('go')
        card._t2 = null
      }, 620)
      card._shown = val
    } else {
      /* first paint or mid-air → snap without fold */
      if (card._t1) {
        clearTimeout(card._t1)
        card._t1 = null
      }
      if (card._t2) {
        clearTimeout(card._t2)
        card._t2 = null
      }
      card.classList.remove('go')
      card._shown = val
      top.textContent = val
      bottom.textContent = val
    }
  }, [val, id])

  useEffect(() => {
    const card = ref.current
    return () => {
      if (card) {
        if (card._t1) clearTimeout(card._t1)
        if (card._t2) clearTimeout(card._t2)
        card._t1 = null
        card._t2 = null
      }
    }
  }, [])

  return (
    <div className="wfc" id={id} ref={ref}>
      <div className="wfc-top">
        <span />
      </div>
      <div className="wfc-bottom">
        <span />
      </div>
      <div className="wfc-flip top">
        <span />
      </div>
      <div className="wfc-flip bottom">
        <span />
      </div>
      <div className="wfc-seam" />
    </div>
  )
}

export function FlipClock() {
  const ui = useUi()
  const pomo = useSnapshot((s) => s.pomo)
  usePomoTick()

  const [flashKey, setFlashKey] = useState(0)

  /* pomodoro-complete ritual: digits flash red once (SPEC §2) */
  useEffect(() => {
    return onRitual((r) => {
      if (r.type !== 'pomo') return
      setFlashKey((k) => k + 1)
      playSound('thock')
      fxSignalLine()
    })
  }, [])

  const remain = getRemainingPomo()
  const phaseTxt = pomo.phase === 'work' ? 'FOCUS' : 'BREAK'
  const subTxt = pomo.running ? (pomo.loop ? 'AUTO LOOP ON' : 'SINGLE SESSION') : 'PAUSED'

  /* back press closes the clock */
  useEffect(() => {
    if (!ui.clockOn) return
    return onBack(() => {
      leaveClock()
      return true
    })
  }, [ui.clockOn])

  if (!ui.clockOn) return null

  return (
    <div className="wfc-overlay active" role="dialog" aria-label="Focus clock" id="wfcOverlay">
      <HoldButton
        secs={5}
        onHold={leaveClock}
        label="Hold…"
        className="wfc-end press"
        title="Back to app"
      >
        ← BACK
      </HoldButton>
      <div className="wfc-state">
        <div className="phase">{phaseTxt}</div>
        <div className="sub">{subTxt}</div>
      </div>
      <div className="wfc-clock">
        <div key={flashKey || 'idle'} className={'wfc-flash' + (flashKey ? ' on' : '')} aria-hidden="true" />
        <FlipCard val={fmt(Math.floor(remain / 60))} id="wfcMin" />
        <div className="wfc-colon">
          <i />
          <i />
        </div>
        <FlipCard val={fmt(remain % 60)} id="wfcSec" />
      </div>
      <div className="wfc-btns">
        <HoldButton
          secs={5}
          onHold={() => toggleRunning()}
          label="Hold…"
          className="wfc-end press wfc-stop"
          title="Pause timer"
        >
          {pomo.running ? 'PAUSE' : 'RESUME'}
        </HoldButton>
        <HoldButton
          secs={5}
          onHold={() => {
            leaveClock()
            resetPomo()
          }}
          label="Hold…"
          className="wfc-end press wfc-pause"
          title="Stop timer"
        >
          STOP
        </HoldButton>
      </div>
    </div>
  )
}