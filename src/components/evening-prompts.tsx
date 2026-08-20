/* ══════════════════════════════════════════════════════════════
   evening-prompts.tsx — renders the two evening overlays that
   schedulers.ts queues: C2 self-rating + C3 habit ritual.
   ══════════════════════════════════════════════════════════════ */

import { useSyncExternalStore, useState } from 'react'
import {
  ratingPromptPending,
  subscribeRatingPrompt,
  setRatingPrompt,
  ritualPromptPending,
  subscribeRitualPrompt,
  setRitualPrompt
} from '../lib/schedulers'
import { state, commit } from '../lib/state'
import * as S from '../lib/storage'
import { toast } from 'sonner'
import { Dialog, DialogContent } from './ui/dialog'

const RATINGS = [
  { v: 1, e: '😫' },
  { v: 2, e: '😕' },
  { v: 3, e: '😐' },
  { v: 4, e: '🙂' },
  { v: 5, e: '🤩' }
]

function RatingDialog() {
  const open = useSyncExternalStore(subscribeRatingPrompt, ratingPromptPending)
  const k = S.todayKey()
  const e = state.log[k]
  if (!open) return null
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          delete state.ratings[k]
          S.saveJSON(S.RATE_KEY, state.ratings)
          setRatingPrompt(false)
        }
      }}
    >
      <DialogContent className="nt-overlay-card max-w-sm" aria-describedby={undefined}>
        <div style={{ padding: '24px 22px 22px', textAlign: 'center' }}>
          <div className="nt-overlay-signal" style={{ margin: '0 auto 14px' }} />
          <div className="nt-overlay-eyebrow">Evening check-in</div>
          <div className="nt-overlay-title" style={{ marginTop: 8 }}>
            How was today&apos;s study?
          </div>
          <div className="nt-overlay-sub" style={{ marginTop: 8 }}>
            {e?.minutes ?? 0} min · {e?.sessions ?? 0} sessions — honest rating, just for you
          </div>
          <div
            role="group"
            aria-label="Rate today's study quality from 1 to 5"
            style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}
          >
            {RATINGS.map((n) => (
              <button
                key={n.v}
                className="nt-overlay-key press"
                style={{ minWidth: 48, fontSize: 22, padding: '12px 10px' }}
                aria-label={`Rate today ${n.v} out of 5`}
                onClick={() => {
                  state.ratings[k] = n.v
                  S.saveJSON(S.RATE_KEY, state.ratings)
                  setRatingPrompt(false)
                  toast('Logged. Rest well.')
                  commit()
                }}
              >
                {n.e}
              </button>
            ))}
          </div>
          <button
            className="press"
            style={{
              marginTop: 20,
              background: 'none',
              border: 'none',
              color: 'var(--ink-4)',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'var(--mono-font)',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              fontWeight: 700
            }}
            onClick={() => {
              delete state.ratings[k]
              S.saveJSON(S.RATE_KEY, state.ratings)
              setRatingPrompt(false)
              commit()
            }}
          >
            Skip tonight
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RitualDialog() {
  const open = useSyncExternalStore(subscribeRitualPrompt, ritualPromptPending)
  const [idx, setIdx] = useState(0)
  const k = S.todayKey()
  if (!open) return null
  const habits = state.habits
  const h = habits[Math.min(idx, habits.length - 1)]
  const logHabit = (id: string, val: boolean) => {
    if (!state.habitLog[k]) state.habitLog[k] = {}
    state.habitLog[k][id] = val
    S.saveJSON(S.HABIT_LOG_KEY, state.habitLog)
    commit()
  }
  const next = () => {
    if (idx + 1 >= habits.length) {
      setRitualPrompt(false)
      setIdx(0)
    } else {
      setIdx(idx + 1)
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setRitualPrompt(false)
          setIdx(0)
        }
      }}
    >
      <DialogContent className="nt-overlay-card max-w-sm" aria-describedby={undefined}>
        <div style={{ padding: '24px 22px 22px', textAlign: 'center' }}>
          <div className="nt-overlay-signal" style={{ margin: '0 auto 14px' }} />
          <div className="nt-overlay-eyebrow">Habit ritual</div>
          <div className="nt-overlay-meta" style={{ marginTop: 8 }}>
            {idx + 1} / {habits.length}
          </div>
          <div className="nt-overlay-title" style={{ marginTop: 8 }}>
            {h?.name}
          </div>
          <div className="nt-overlay-sub" style={{ marginTop: 8 }}>
            DID YOU DO THIS TODAY?
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              className="nt-overlay-key ghost press"
              style={{ flex: 1, padding: 12, fontSize: 11.5, fontWeight: 800, letterSpacing: '.06em', borderRadius: 10 }}
              onClick={() => {
                if (h) logHabit(h.id, false)
                next()
              }}
            >
              NO
            </button>
            <button
              className="nt-overlay-key primary press"
              style={{ flex: 1, padding: 12, fontSize: 11.5, fontWeight: 800, letterSpacing: '.06em', borderRadius: 10 }}
              onClick={() => {
                if (h) logHabit(h.id, true)
                next()
              }}
            >
              YES
            </button>
          </div>
          <button
            className="press"
            style={{
              marginTop: 20,
              background: 'none',
              border: 'none',
              color: 'var(--ink-4)',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'var(--mono-font)',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              fontWeight: 700
            }}
            onClick={() => {
              setRitualPrompt(false)
              setIdx(0)
            }}
          >
            Skip all
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function EveningPrompts() {
  return (
    <>
      <RatingDialog />
      <RitualDialog />
    </>
  )
}
