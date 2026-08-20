/* ══════════════════════════════════════════════════════════════
   rituals.ts — NOTHING premium celebration triggers (SPEC §2).
   Tiny event bus: engine emits, presentational components animate.
   No DOM access here; components subscribe and apply CSS classes.
   ══════════════════════════════════════════════════════════════ */

export type Ritual =
  | { type: 'pomo' }
  | { type: 'session' }
  | { type: 'day' }

type Listener = (r: Ritual) => void

const subs = new Set<Listener>()

export function onRitual(cb: Listener): () => void {
  subs.add(cb)
  return () => subs.delete(cb)
}

export function emitRitual(r: Ritual): void {
  subs.forEach((cb) => {
    try {
      cb(r)
    } catch {
      /* a subscriber must never break the engine */
    }
  })
}