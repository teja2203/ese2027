import { useEffect, useRef, useState } from 'react'
import { celebrateDone, onCelebrate, celebrate, type CelebrationPayload } from '../lib/celebrate'
import { trapFocusIn } from '../lib/focus-trap'
import { state, commit, onBack } from '../lib/state'
import { checkAchievements, nextAchievement, type Achievement } from '../lib/achievements'
import { playSound } from '../lib/sound'
import { fxFlash, fxLedColumns, fxPixBurst, fxStampNumber } from '../lib/celebrate-fx'
import { computeStreak } from '../lib/stats'
import { SCHED } from '../data'
import { Check } from 'lucide-react'

const LINES = [
  "That's how ranks are built.",
  'Momentum looks good on you.',
  'The syllabus is shrinking.',
  'Consistency is your superpower.',
  'Another brick in the wall.'
]

export function celebrateBadgeFrom(a: Achievement) {
  playSound('achievement')
  const n = nextAchievement(state)
  celebrate({
    eyebrow: 'Achievement unlocked',
    icon: a.icon,
    title: a.title,
    sub: a.desc + '. ' + LINES[Math.floor(Math.random() * LINES.length)],
    next: n ? { title: n.a.title, have: n.have, goal: n.a.goal, pct: n.pct } : null,
    cta: 'Claim it'
  })
}

export function celebrateDayOf() {
  playSound('day')
  const streak = computeStreak(state).count
  const n = nextAchievement(state)
  const day = SCHED[state.index]
  celebrate({
    eyebrow: 'Day conquered',
    icon: '100',
    title: `${day?.date || ''} — 100%`,
    sub: `Every task of "${day?.subject || ''}" is done.${streak > 1 ? ` ${streak}-day streak alive.` : ''} Tomorrow builds on today.`,
    next: n ? { title: n.a.title, have: n.have, goal: n.a.goal, pct: n.pct } : null,
    cta: 'On to tomorrow'
  })
}

export function CelebrationRoot() {
  const [payload, setPayload] = useState<CelebrationPayload | null>(null)
  const prevFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const off = onCelebrate((p) => {
      prevFocus.current = document.activeElement as HTMLElement
      setPayload(p)
      try {
        navigator.vibrate && navigator.vibrate([90, 40, 90, 40, 150])
      } catch {}
    })
    return off
  }, [])

  const close = () => {
    setPayload(null)
    celebrateDone()
    if (prevFocus.current && prevFocus.current.focus) prevFocus.current.focus()
    commit()
    /* chain: check if another badge also unlocked */
    checkAchievements(state, celebrateBadgeFrom)
  }

  useEffect(() => {
    if (!payload) return
    const root = document.querySelector('.celebrate') as HTMLElement | null
    const stage = document.querySelector('.celebrate-stage') as HTMLElement | null
    const r = stage ? stage.getBoundingClientRect() : null
    if (r) fxPixBurst(r.left + r.width / 2, r.top + 34)
    fxFlash()
    if (payload.icon === '100') {
      playSound('flash')
      setTimeout(() => {
        fxLedColumns()
        fxStampNumber('100%')
      }, 260)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault()
        close()
      }
    }
    document.addEventListener('keydown', onKey, true)
    const offBack = onBack(() => {
      close()
      return true
    })
    const detrap = root ? trapFocusIn(root) : () => {}
    const btn = root?.querySelector('.celebrate-cta') as HTMLButtonElement | null
    const focusT = setTimeout(() => btn && btn.focus(), 650)
    return () => {
      clearTimeout(focusT)
      detrap()
      document.removeEventListener('keydown', onKey, true)
      offBack()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  if (!payload) return null

  return (
    <div
      className={'celebrate' + (payload.icon === '100' ? ' full-signal' : '')}
      role="dialog"
      aria-modal="true"
      aria-label={payload.title}
      ref={(el) => {
        if (el && payload) {
          const btn = el.querySelector('.celebrate-cta') as HTMLButtonElement | null
          setTimeout(() => btn && btn.focus(), 650)
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="celebrate-stage">
        <div className="medallion">
          <div className="burst" />
          <div className="halo" />
          <div className="core display">{payload.icon}</div>
        </div>
        <div className="celebrate-eyebrow mono">{payload.eyebrow}</div>
        <div className="celebrate-title display">{payload.title}</div>
        <div className="celebrate-stamp">
          <span className="celebrate-seal">
            <Check className="size-3.5" />
          </span>
        </div>
        <div className="celebrate-sub">{payload.sub}</div>
        {payload.next && (
          <div className="celebrate-next">
            <div className="nlabel mono">Next achievement</div>
            <div className="ntitle">{payload.next.title}</div>
            <div className="nt-seg">
              <i className={payload.next.pct >= 25 ? 'on' : ''} />
              <i className={payload.next.pct >= 50 ? 'on' : ''} />
              <i className={payload.next.pct >= 75 ? 'on' : ''} />
              <i className={payload.next.pct >= 100 ? 'on' : ''} />
            </div>
            <div className="nmeta mono">
              {payload.next.have} / {payload.next.goal} · {payload.next.pct}%
            </div>
          </div>
        )}
        <button className="btn btn-acc press celebrate-cta" onClick={close} aria-label="Close celebration">
          {payload.cta}
        </button>
      </div>
    </div>
  )
}