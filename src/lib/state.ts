/* ══════════════════════════════════════════════════════════════
   state.ts — the runtime state object + React bridge.
   `state` is a plain mutable object (legacy-style, imperative
   mutations everywhere) whose changes are published via commit().
   React reads slices through useSnapshot, which structural-compares
   by JSON so in-place mutations still trigger correct re-renders.
   ══════════════════════════════════════════════════════════════ */

import { useRef, useSyncExternalStore } from 'react'
import type { AppState } from './storage'
import * as S from './storage'
import { applyTheme, cycleTheme, setTheme as applySetTheme } from './theme'

export type AppStateT = AppState
export type Route = 'today' | 'plan' | 'focus' | 'progress' | 'blocks' | 'you'

/* runtime-only field (persisted under its own key, not part of the
   frozen AppState shape) */
export interface RuntimeState extends AppState {
  quoteIdx: number
}

export const ROUTES: readonly Route[] = ['today', 'plan', 'focus', 'progress', 'blocks', 'you']

export function isRoute(v: unknown): v is Route {
  return typeof v === 'string' && (ROUTES as readonly string[]).includes(v)
}

export const state: RuntimeState = {
  ...S.createInitialState(),
  quoteIdx: S.loadJSON<number>(S.QUOTE_IDX_KEY, 0)
}

/* auto-backup needs the live state — legacy passed the global object. */
S.bindStateGetter(() => state)

/* ── external store ── */
let version = 0
const listeners = new Set<() => void>()

export function commit(): void {
  version++
  listeners.forEach((l) => l())
}
export function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
export function getVersion(): number {
  return version
}

/** Subscribe to a slice of state. Re-renders only when the selected
 *  value structurally changes (JSON equality). In-place mutations are
 *  detected by the cache key; a fresh (shallow-copied) reference is
 *  returned on change so React's Object.is comparison fires. */
export function useSnapshot<T>(sel: (s: RuntimeState) => T): T {
  const last = useRef<{ v: T; k: string } | null>(null)
  return useSyncExternalStore(
    subscribe,
    () => {
      const v = sel(state)
      const k = JSON.stringify(v)
      if (last.current && last.current.k === k) return last.current.v
      const copy =
        Array.isArray(v) ? ([...v] as T) : typeof v === 'object' && v !== null ? ({ ...v } as T) : v
      last.current = { v: copy, k }
      return copy
    },
    () => (last.current ? last.current.v : sel(state))
  )
}

/* ── navigation ── */
export function setNav(id: Route): void {
  if (state.nav === id) return
  state.nav = id
  S.saveJSON(S.NAV_KEY, id)
  try {
    history.replaceState(null, '', '#' + id)
  } catch {
    /* file:// or restricted context — hash is cosmetic */
  }
  commit()
}

export function themeOf(): string {
  return state.theme
}
export { applyTheme, cycleTheme }
export function setTheme(id: string): void {
  applySetTheme(state, id)
  commit()
}

/* ── Android back handling ──
   Kotlin calls window.eseHandleAndroidBack() on every back press.
   Overlays register their own handler (last registered wins); with
   nothing open, back goes to Today instead of quitting the app. */
const backHandlers = new Set<() => boolean>()
export function onBack(fn: () => boolean): () => void {
  backHandlers.add(fn)
  return () => {
    backHandlers.delete(fn)
  }
}
export function handleAndroidBack(): boolean {
  for (const fn of [...backHandlers].reverse()) {
    try {
      if (fn()) return true
    } catch {
      /* keep walking */
    }
  }
  if (state.nav !== 'today') {
    setNav('today')
  }
  return true
}

/* ── keyboard (port of the legacy global handler; per-screen keys
     attach in their own screens) ── */
export function installKeyboard(extra?: Record<string, () => void>): () => void {
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
    if (e.ctrlKey || e.metaKey || e.altKey) return
    switch (e.key) {
      case '1':
        setNav('today')
        break
      case '2':
        setNav('plan')
        break
      case '3':
        setNav('focus')
        break
      case '4':
        setNav('progress')
        break
      case '5':
        setNav('blocks')
        break
      case '6':
        setNav('you')
        break
      case 't':
      case 'T':
        cycleTheme(state)
        commit()
        break
      default:
        if (extra) {
          const fn = extra[e.key]
          if (fn) {
            e.preventDefault()
            fn()
          }
        }
        break
    }
  }
  document.addEventListener('keydown', onKey)
  return () => document.removeEventListener('keydown', onKey)
}

/* ── native → web route opens ── */
export function installRouteReceiver(): () => void {
  window.eseOpenRoute = (r: string) => {
    if (isRoute(r)) setNav(r)
  }
  return () => {
    delete window.eseOpenRoute
  }
}