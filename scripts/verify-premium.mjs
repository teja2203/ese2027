// temp: verify NOTHING PREMIUM prototype — buttons, hold, rituals, task row
import puppeteer from 'puppeteer-core'
import path from 'path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const url = 'file://' + path.resolve('design/nothing-premium/premium-prototype.html').replace(/\\/g, '/')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
await page.goto(url, { waitUntil: 'load', timeout: 15000 })
await page.setViewport({ width: 900, height: 900 })

const click = (sel) => page.evaluate((s) => document.querySelector(s).click(), sel)
const r = {}
r.rituals = await page.evaluate(() => document.querySelectorAll('.rit').length)
r.segs = await page.evaluate(() => document.querySelectorAll('.segbar i').length)

// task row → dot burst + flash
await click('#demoTask')
await sleep(300)
r.taskDone = await page.evaluate(() => document.getElementById('demoTask').classList.contains('done'))
r.pixFired = await page.evaluate(() => document.querySelectorAll('.dotpix').length > 0)

// cascade
await page.evaluate(() => document.querySelectorAll('.segbar i:not(.lit)').forEach(()=>{}))
const before = await page.evaluate(() => document.querySelectorAll('.segbar i.lit').length)
await page.evaluate(() => document.querySelectorAll('.rit')[1].click())
await sleep(1200)
const after = await page.evaluate(() => document.querySelectorAll('.segbar i.lit').length)
r.cascadeLitAll = before === 18 && after === 24

// milestone stamp
await page.evaluate(() => document.querySelectorAll('.rit')[2].click())
await sleep(300)
r.stampShown = await page.evaluate(() => document.getElementById('stampNum').classList.contains('show'))

// achievement plate
await page.evaluate(() => document.querySelectorAll('.rit')[3].click())
await sleep(400)
r.plateShown = await page.evaluate(() => document.getElementById('plate').classList.contains('show'))

// full signal
await page.evaluate(() => document.querySelectorAll('.rit')[5].click())
await sleep(400)
r.ledShown = await page.evaluate(() => document.getElementById('ledCol').classList.contains('show'))

// hold cascade via pointer events
await page.evaluate(() => {
  const b = document.getElementById('holdBtn')
  b.dispatchEvent(new PointerEvent('pointerdown'))
  window.__segBefore = document.querySelectorAll('.hold .segs i.lit').length
})
await sleep(600)
r.holdSegsLit = await page.evaluate(() => document.querySelectorAll('.hold .segs i.lit').length)
await page.evaluate(() => document.getElementById('holdBtn').dispatchEvent(new PointerEvent('pointerup')))

await page.screenshot({ path: 'design/nothing-premium/shot-premium.png' })

console.log(JSON.stringify(r, null, 2))
const ok = errors.length === 0 && r.rituals === 6 && r.segs === 24 && r.taskDone && r.pixFired && r.cascadeLitAll && r.stampShown && r.plateShown && r.ledShown && r.holdSegsLit > 2
console.log('errors:', errors.length, errors.slice(0, 3).join('; '))
console.log(ok ? 'ALL CHECKS PASSED' : 'FAIL')
await browser.close()
process.exit(ok ? 0 : 1)