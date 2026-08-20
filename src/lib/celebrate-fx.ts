/* ══════════════════════════════════════════════════════════════
   celebrate-fx.ts — celebration-lab FX primitives (SPEC §2,
   ported from premium-prototype.html). All FX are pure DOM layers
   that auto-remove; no React state involved.
   ══════════════════════════════════════════════════════════════ */

const RM = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches

function mount(el: HTMLElement, ms: number) {
  document.body.appendChild(el)
  setTimeout(() => el.remove(), ms)
}

/* ── fullscreen flash (prototype: .flash) ── */
export function fxFlash() {
  if (RM()) return
  const el = document.createElement('div')
  el.className = 'fx-flash'
  mount(el, 320)
}

/* ── signal line: full-width red sweep top → bottom (prototype: .sigline) ── */
export function fxSignalLine() {
  if (RM()) return
  const el = document.createElement('div')
  el.className = 'fx-sigline'
  mount(el, 680)
}

/* ── numeral stamp: giant value slams in, blooms, fades (prototype: .stampnum) ── */
export function fxStampNumber(text: string) {
  if (RM()) return
  const el = document.createElement('div')
  el.className = 'fx-stampnum'
  el.innerHTML = '<span>' + text + '</span>'
  mount(el, 1420)
}

/* ── FULL SIGNAL: 14 LED columns grow staggered (prototype: .ledcol) ── */
export function fxLedColumns() {
  if (RM()) return
  const el = document.createElement('div')
  el.className = 'fx-ledcol'
  el.setAttribute('aria-hidden', 'true')
  for (let i = 0; i < 14; i++) {
    const c = document.createElement('i')
    c.style.setProperty('--i', String(i))
    el.appendChild(c)
  }
  mount(el, 1350)
}

/* ── pixel burst: 10 LED dots pop at a point (prototype: .dotpix) ── */
export function fxPixBurst(x: number, y: number) {
  if (RM()) return
  const host = document.createElement('div')
  host.className = 'fx-pixburst'
  host.style.left = x + 'px'
  host.style.top = y + 'px'
  for (let i = 0; i < 10; i++) {
    const d = document.createElement('i')
    d.style.setProperty('--dx', (Math.random() * 46 - 23).toFixed(0) + 'px')
    d.style.setProperty('--dy', (Math.random() * 46 - 23).toFixed(0) + 'px')
    d.style.setProperty('--dl', (Math.random() * 60).toFixed(0) + 'ms')
    host.appendChild(d)
  }
  mount(host, 700)
}
