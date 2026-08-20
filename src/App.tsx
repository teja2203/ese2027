import { useEffect, useRef } from 'react'
import { AppShell } from './components/app-shell'
import { ThemedToaster } from './components/ui/sonner'
import { CelebrationRoot } from './components/celebration'
import { FlipClock } from './components/flip-clock'
import { FocusOverlay } from './components/focus-overlay'
import { TimerDock } from './components/timer-dock'
import { state, useSnapshot, setNav, installKeyboard, installRouteReceiver, handleAndroidBack, isRoute } from './lib/state'
import { applyTheme } from './lib/theme'
import { attachRipple } from './lib/ripple'
import { undoLast } from './lib/today-actions'
import { installVisibilitySync, bootPomodoro, toggleRunning, strictActive } from './lib/pomodoro'
import { installAudioUnlock } from './lib/sound'
import { installSchedulers } from './lib/schedulers'
import { EveningPrompts } from './components/evening-prompts'
import { registerUiBack, leaveClock, getUi } from './lib/ui-state'
import { toast } from 'sonner'
import { computeStreak } from './lib/stats'
import { fxStampNumber } from './lib/celebrate-fx'
import { playSound } from './lib/sound'

/* streak-milestone numeral stamp (SPEC §2: 5/10/25/50/100) */
const STREAK_MILESTONES = [5, 10, 25, 50, 100]

function StreakWatcher() {
  const prev = useRef(computeStreak(state).count)
  useEffect(() => {
    const tick = () => {
      const count = computeStreak(state).count
      const last = prev.current
      prev.current = count
      if (count > last && STREAK_MILESTONES.includes(count)) {
        fxStampNumber(String(count))
        playSound('stamp')
        try {
          navigator.vibrate && navigator.vibrate([40, 30, 80, 30, 120])
        } catch {}
      }
    }
    const id = setInterval(tick, 5000)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  return null
}

export function App() {
  const theme = useSnapshot((s) => s.theme)

  /* theme application (DOM side-effects live outside React) */
  useEffect(() => {
    applyTheme(state)
  }, [theme])

  /* boot wiring: hash route, keyboard, native bridge receivers, ripple */
  useEffect(() => {
    const hash = (location.hash || '').replace(/^#/, '')
    if (isRoute(hash)) setNav(hash)

    const offKb = installKeyboard({
      z: undoLast,
      Z: undoLast,
      ' ': () => {
        if (state.pomo.running || state.nav === 'today') {
          if (strictActive()) {
            toast('Strict mode — hold Pause on the clock')
            return
          }
          toggleRunning()
        }
      },
      Escape: () => {
        if (getUi().clockOn) leaveClock()
      }
    })
    const offRoute = installRouteReceiver()
    const offUiBack = registerUiBack()
    window.eseHandleAndroidBack = handleAndroidBack
    const offRipple = attachRipple()
    const offVis = installVisibilitySync()
    const offAudio = installAudioUnlock()
    const offSchedulers = installSchedulers()
    bootPomodoro()

    return () => {
      offKb()
      offRoute()
      offUiBack()
      delete window.eseHandleAndroidBack
      offRipple()
      offVis()
      offAudio()
      offSchedulers()
    }
  }, [])

  return (
    <>
      <AppShell />
      <CelebrationRoot />
      <TimerDock />
      <FocusOverlay />
      <FlipClock />
      <EveningPrompts />
      <StreakWatcher />
      <ThemedToaster />
    </>
  )
}