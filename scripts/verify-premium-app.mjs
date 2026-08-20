// verify premium layer in the built app (served by vite preview)
import puppeteer from 'puppeteer-core'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
await page.goto('http://localhost:4187/', { waitUntil: 'networkidle0' })
await page.setViewport({ width: 460, height: 900 })
const r = {}

// enable strict mode so hold buttons show the LED cascade
await page.evaluate(() => {
  const b = JSON.parse(localStorage.getItem('ese_block_v1') || '{}')
  b.strict = true
  localStorage.setItem('ese_block_v1', JSON.stringify(b))
  location.reload()
})
// 5s black splash covers the viewport and swallows real pointer input —
// wait for it to be removed before any mouse-driven interaction
await page.waitForFunction(() => !document.getElementById('splash'), { timeout: 8000 })
await sleep(500)

// task check → chk-pop animation
await page.evaluate(() => {
  const el = document.querySelector('.task-toggle .chk')
  el.click()
})
r.flashMounted = await page.evaluate(() => !!document.querySelector('.fx-flash'))
await sleep(120)
r.chkAnim = await page.evaluate(() => {
  const el = document.querySelector('.task-toggle .chk')
  return getComputedStyle(el).animationName
})

// FX layer CSS + centered celebration plate
r.fxCss = await page.evaluate(() => {
  const css = [...document.styleSheets]
    .flatMap((s) => {
      try {
        return [...s.cssRules].map((c) => c.cssText)
      } catch {
        return []
      }
    })
    .join('')
  return (
    css.includes('.fx-flash') &&
    css.includes('.fx-sigline') &&
    css.includes('.fx-stampnum') &&
    css.includes('.fx-ledcol') &&
    css.includes('.fx-pixburst') &&
    css.includes('fx-stampnum')
  )
})
r.plateCentered = await page.evaluate(() => {
  const css = [...document.styleSheets]
    .flatMap((s) => {
      try {
        return [...s.cssRules].map((c) => c.cssText)
      } catch {
        return []
      }
    })
    .join('')
  const m = css.match(/\.celebrate\s*\{[^}]*align-items\s*:\s*center[^}]*\}/)
  return !!m
})
r.iconTicks = await page.evaluate(() => {
  const css = [...document.styleSheets]
    .flatMap((s) => {
      try {
        return [...s.cssRules].map((c) => c.cssText)
      } catch {
        return []
      }
    })
    .join('')
  return /\.btn-icon::before[^{]*\{[^}]*width:\s*11px[^}]*\}/.test(css)
})

// flip clock hold button → LED segments
await page.evaluate(() => document.querySelectorAll('.navbtn')[2].click())
await sleep(600)
await page.evaluate(() => document.querySelector('.fkey.run')?.click())
await sleep(400)
await page.evaluate(() => document.querySelector('.nt-fclockbtn')?.click())
await sleep(800)
r.clockOpen = await page.evaluate(() => document.getElementById('wfcOverlay')?.classList.contains('active'))
const before = await page.evaluate(() => {
  const b = document.querySelector('#wfcOverlay .wfc-btns .wfc-end')
  if (!b) return -1
  b.setAttribute('data-x', String(b.getBoundingClientRect().x + b.getBoundingClientRect().width / 2))
  b.setAttribute('data-y', String(b.getBoundingClientRect().y + b.getBoundingClientRect().height / 2))
  return 0
})
if (before === 0) {
  const pos = await page.evaluate(() => {
    const b = document.querySelector('#wfcOverlay .wfc-btns .wfc-end')
    return { x: +b.getAttribute('data-x'), y: +b.getAttribute('data-y') }
  })
  await page.mouse.move(pos.x, pos.y)
  await page.mouse.down()
}
await sleep(2100)
const during = await page.evaluate(() => document.querySelectorAll('#wfcOverlay .holdsegs i.on').length)
await page.mouse.up()
r.segsBeforeHold = before
r.segsMidHold = during

console.log(JSON.stringify(r, null, 2))
console.log('errors:', errs.length, errs.slice(0, 3).join('; '))
const ok = errs.length === 0 && r.chkAnim === 'chk-pop' && r.clockOpen && r.segsBeforeHold === 0 && r.segsMidHold >= 2 && r.segsMidHold <= 5 && r.flashMounted && r.fxCss && r.plateCentered && r.iconTicks
console.log(ok ? 'PREMIUM LAYER OK' : 'FAIL')
await browser.close()
process.exit(ok ? 0 : 1)