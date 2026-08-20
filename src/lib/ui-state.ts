/* ══════════════════════════════════════════════════════════════
   ui-state.ts — transient UI layer (overlay / flip clock / dock
   drawer). Not persisted; lives outside the frozen AppState shape.
   ══════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from 'react'
import { state, commit, onBack } from './state'
import * as S from './storage'
import { exitAppFullscreen } from './fullscreen'

export interface UiState {
  overlayOpen: boolean
  clockOn: boolean
  dockDrawerOpen: boolean
}

let ui: UiState = { overlayOpen: false, clockOn: false, dockDrawerOpen: false }
let uiVersion = 0
let uiSnapshot: UiState = { ...ui }
const uiListeners = new Set<() => void>()

function bump() {
  uiVersion++
  uiSnapshot = { ...ui }
  uiListeners.forEach((l) => l())
}

export function useUi(): UiState {
  return useSyncExternalStore(
    (l) => {
      uiListeners.add(l)
      return () => uiListeners.delete(l)
    },
    () => uiSnapshot
  )
}

/* ── fullscreen focus overlay ── */
export function expandFocusOverlay() {
  ui.overlayOpen = true
  bump()
}

export function collapseFocusOverlay() {
  ui.overlayOpen = false
  state.pomo.docked = true
  S.saveJSON(S.POMO_KEY, state.pomo)
  commit()
  bump()
}

/* ── flip clock ── */
export function enterClock() {
  ui.clockOn = true
  bump()
}
export function leaveClock() {
  ui.clockOn = false
  exitAppFullscreen()
  bump()
}

/* live read for handlers that must not capture a stale snapshot */
export function getUi(): UiState {
  return ui
}

/* ── timer dock drawer ── */
export function toggleDockDrawer() {
  ui.dockDrawerOpen = !ui.dockDrawerOpen
  bump()
}
export function closeDockDrawer() {
  if (ui.dockDrawerOpen) {
    ui.dockDrawerOpen = false
    bump()
  }
}

/* back-press: overlay → clock → drawer → route */
export function registerUiBack(): () => void {
  return onBack(() => {
    if (ui.overlayOpen) {
      collapseFocusOverlay()
      return true
    }
    if (ui.clockOn) {
      leaveClock()
      return true
    }
    if (ui.dockDrawerOpen) {
      closeDockDrawer()
      return true
    }
    return false
  })
}