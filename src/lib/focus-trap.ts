/* ══════════════════════════════════════════════════════════════
   focus-trap.ts — Tab cycling inside a modal root (ported from the
   legacy scrim trap). Attach to any overlay; returns a cleanup.
   ══════════════════════════════════════════════════════════════ */

export function trapFocusIn(root: HTMLElement): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const f = [...root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
      (el) => !(el as HTMLButtonElement).disabled && el.offsetParent !== null
    )
    if (!f.length) {
      e.preventDefault()
      return
    }
    const first = f[0]
    const last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    } else if (!root.contains(document.activeElement)) {
      e.preventDefault()
      first.focus()
    }
  }
  document.addEventListener('keydown', onKey, true)
  return () => document.removeEventListener('keydown', onKey, true)
}