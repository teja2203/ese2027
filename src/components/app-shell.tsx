import { useEffect, useRef, useState } from 'react'
import { useSnapshot, setNav, onBack, isRoute, type Route } from '../lib/state'
import { TopDeck } from './top-deck'
import { Nav } from './nav'
import { NotificationPanel } from './notification-panel'
import { TodayScreen } from '../routes/today'
import { PlanScreen } from '../routes/plan'
import { FocusScreen } from '../routes/focus'
import { ProgressScreen } from '../routes/progress'
import { BlocksScreen } from '../routes/blocks'
import { YouScreen } from '../routes/you'

export function AppShell() {
  const nav = useSnapshot((s) => s.nav)
  const [displayNav, setDisplayNav] = useState<Route>(isRoute(nav) ? nav : 'today')
  const [inboxOpen, setInboxOpen] = useState(false)
  const viewRef = useRef<HTMLDivElement>(null)
  const first = useRef(true)

  /* route change → legacy fade-swap (150ms opacity/translate, scroll to top) */
  useEffect(() => {
    if (nav === displayNav) return
    const el = viewRef.current
    if (el) {
      el.style.transition = 'opacity .15s ease, transform .15s ease'
      el.style.opacity = '0'
      el.style.transform = 'translateY(8px)'
    }
    const t = setTimeout(() => {
      setDisplayNav(nav as Route)
      window.scrollTo(0, 0)
      requestAnimationFrame(() => {
        if (el) {
          el.style.opacity = '1'
          el.style.transform = 'translateY(0)'
        }
      })
    }, 150)
    return () => clearTimeout(t)
  }, [nav, displayNav])

  /* Android back: close the inbox first, then the shell fallback (→ Today)
     in state.ts handles the rest. Registered once; reads a ref. */
  const inboxRef = useRef(false)
  inboxRef.current = inboxOpen
  useEffect(() => {
    const off = onBack(() => {
      if (inboxRef.current) {
        setInboxOpen(false)
        return true
      }
      return false
    })
    return off
  }, [])

  useEffect(() => {
    if (!first.current) return
    first.current = false
    const hash = (location.hash || '').replace(/^#/, '')
    if (isRoute(hash) && hash !== nav) setNav(hash)
  }, [nav])

  return (
    <>
      <TopDeck onOpenInbox={() => setInboxOpen(true)} />
      <div ref={viewRef}>
        {displayNav === 'today' && <TodayScreen />}
        {displayNav === 'plan' && <PlanScreen />}
        {displayNav === 'focus' && <FocusScreen />}
        {displayNav === 'progress' && <ProgressScreen />}
        {displayNav === 'blocks' && <BlocksScreen />}
        {displayNav === 'you' && <YouScreen />}
      </div>
      <Nav />
      <NotificationPanel open={inboxOpen} onOpenChange={setInboxOpen} />
    </>
  )
}

/* boot wiring lives in App.tsx */