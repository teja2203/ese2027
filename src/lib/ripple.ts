/* ══════════════════════════════════════════════════════════════
   ripple.ts — delegated .press ripple (legacy 4056-4063).
   One pointerdown listener on the document; any element with the
   .press class gets a material ripple at the tap point.
   ══════════════════════════════════════════════════════════════ */

export function attachRipple(root: ParentNode = document): () => void {
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const target = (e.target as HTMLElement | null)?.closest?.('.press') as HTMLElement | null
    if (!target || target.hasAttribute('disabled')) return
    const rect = target.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2.2
    const r = document.createElement('span')
    r.className = 'ripple'
    r.style.width = r.style.height = `${size}px`
    r.style.left = `${e.clientX - rect.left - size / 2}px`
    r.style.top = `${e.clientY - rect.top - size / 2}px`
    target.appendChild(r)
    const cleanup = () => r.remove()
    r.addEventListener('animationend', cleanup, { once: true })
    setTimeout(cleanup, 900)
  }
  root.addEventListener('pointerdown', onPointerDown as EventListener)
  return () => root.removeEventListener('pointerdown', onPointerDown as EventListener)
}