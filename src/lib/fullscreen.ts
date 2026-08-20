/* ══════════════════════════════════════════════════════════════
   fullscreen.ts — app-level fullscreen (native AndroidESE first,
   Web Fullscreen API fallback). Centralized so every enter/exit
   path (start/stop/reset/skip/phase-change/clock) stays in sync.
   ══════════════════════════════════════════════════════════════ */

export function requestAppFullscreen() {
  if (window.AndroidESE?.setFullscreen) {
    window.AndroidESE.setFullscreen(true)
    return
  }
  try {
    const d = document.documentElement
    if (d.requestFullscreen && !document.fullscreenElement)
      d.requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined)
  } catch {
    /* unsupported */
  }
}

export function exitAppFullscreen() {
  if (window.AndroidESE?.setFullscreen) {
    window.AndroidESE.setFullscreen(false)
    return
  }
  try {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => undefined)
  } catch {
    /* unsupported */
  }
}