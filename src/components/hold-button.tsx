/* ══════════════════════════════════════════════════════════════
   hold-button.tsx — React port of the legacy holdToConfirm().
   Fires the action only after the pointer is held for `secs`
   (strict mode); without strict mode it fires on tap.
   ══════════════════════════════════════════════════════════════ */

import { useRef, useState } from 'react'
import { strictActive } from '../lib/pomodoro'

interface Props {
  secs: number
  onHold: () => void
  label: string
  className?: string
  children?: React.ReactNode
  title?: string
}

export function HoldButton({ secs, onHold, label, className = '', children, title }: Props) {
  const [count, setCount] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const raf = useRef<number | null>(null)
  const start = useRef(0)

  const cancel = () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = null
    setCount(null)
  }

  const tick = () => {
    const p = Math.min(1, (Date.now() - start.current) / (secs * 1000))
    setCount(Math.ceil(secs - p * secs))
    if (p < 1) raf.current = requestAnimationFrame(tick)
  }

  const lit = count === null ? 0 : count === 1 ? 5 : Math.round((1 - count / secs) * 5)

  return (
    <button
      className={className}
      title={title}
      onContextMenu={(e) => {
        e.preventDefault()
        return false
      }}
      onPointerDown={(e) => {
        e.preventDefault()
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          /* no-op */
        }
        if (!strictActive()) {
          onHold()
          return
        }
        start.current = Date.now()
        tick()
        timer.current = setTimeout(() => {
          timer.current = null
          cancel()
          onHold()
        }, secs * 1000)
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onClick={(e) => {
        if (strictActive()) e.preventDefault()
      }}
    >
      {count !== null ? (
        <span className="hold-wrap">
          <span className="holdsegs" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} className={i < lit ? 'on' : ''} />
            ))}
          </span>
          <span>
            {label} {count}s
          </span>
        </span>
      ) : (
        children
      )}
    </button>
  )
}