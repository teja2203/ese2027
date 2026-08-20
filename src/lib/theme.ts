/* ══════════════════════════════════════════════════════════════
   theme.ts — theme application (DOM side).
   Data + migration live in storage.ts (THEMES/loadTheme/themeMeta/
   isLightTheme). Ported verbatim from legacy/js/app.v63.js.
   ══════════════════════════════════════════════════════════════ */

import type { AppState } from './storage'
import * as S from './storage'

export function applyTheme(state: AppState): void {
  document.documentElement.setAttribute('data-theme', state.theme)
  document.body.classList.toggle('light', S.isLightTheme(state.theme))
  const tc = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (tc) tc.setAttribute('content', S.themeMeta(state.theme))
}

export function setTheme(state: AppState, id: string): void {
  if (!S.THEME_IDS.includes(id)) return
  state.theme = id
  S.saveJSON(S.THEME_KEY, id)
  applyTheme(state)
}

/* top-deck sun/moon promises a light ⇄ dark toggle, so jump between
   families here; the full 4-suit picker lives in You. */
export function cycleTheme(state: AppState): void {
  setTheme(state, S.isLightTheme(state.theme) ? 'ember' : 'paper')
}