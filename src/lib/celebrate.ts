/* ══════════════════════════════════════════════════════════════
   celebrate.ts — celebration overlay bus.
   Screens dispatch celebrate(); the mounted CelebrationRoot
   renders the overlay (focus-trapped, Esc/Enter/back aware) and
   chains checkAchievements on close, exactly like legacy.
   ══════════════════════════════════════════════════════════════ */

export interface CelebrationPayload {
  eyebrow: string
  icon: string
  title: string
  sub: string
  next: { title: string; have: number; goal: number; pct: number } | null
  cta: string
}

type Listener = (p: CelebrationPayload) => void
const listeners = new Set<Listener>()
let celebrating = false

export function celebrate(p: CelebrationPayload): void {
  if (celebrating) return
  celebrating = true
  listeners.forEach((l) => l(p))
}

export function celebrateDone(): void {
  celebrating = false
}

export function onCelebrate(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}