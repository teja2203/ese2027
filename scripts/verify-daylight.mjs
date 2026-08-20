// temp: verify the DAYLIGHT prototype — vessel, flip, cabinet, focus morph, celebrations
import puppeteer from 'puppeteer-core'
import path from 'path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const url = 'file://' + path.resolve('design/daylight/daylight-prototype.html').replace(/\\/g, '/')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
await page.goto(url, { waitUntil: 'load', timeout: 15000 })
await page.setViewport({ width: 900, height: 820 })

const click = (sel) => page.evaluate((s) => document.querySelector(s).click(), sel)

const r = {}
r.segments = await page.evaluate(() => document.querySelectorAll('.seg').length)
r.tasks = await page.evaluate(() => document.querySelectorAll('.task').length)

r.taskToggle = await page.evaluate(() => {
  const t = document.querySelector('.seg.live .task:not(.done)')
  t.click()
  const lit = document.querySelector('.seg.live').style.getPropertyValue('--lit')
  t.click()
  return lit === '100%'
})

r.igniteInLive = await page.evaluate(() => {
  const live = document.querySelector('.seg.live .ignite')
  const others = [...document.querySelectorAll('.seg:not(.live) .ignite')].filter((el) => el.offsetParent !== null)
  return !!live && others.length === 0
})

await click('.ignite')
r.focusOpens = await page.evaluate(() => document.getElementById('focus').classList.contains('open'))
await page.screenshot({ path: 'design/daylight/shot-focus.png' })
await click('.fclose')

await click('.edge.l')
await sleep(600)
r.flipWorks = await page.evaluate(() => {
  const w = document.querySelector('.week')
  return w && getComputedStyle(w).pointerEvents === 'auto' && document.getElementById('vessel').classList.contains('flipped')
})
await click('.edge.l')
await sleep(600)

await click('.edge.r')
await sleep(500)
r.cabinetOpens = await page.evaluate(() => document.getElementById('cab').classList.contains('open'))
await page.evaluate(() => document.querySelector('.shelf[data-s="trophy"]').click())
r.trophyShown = await page.evaluate(() => document.getElementById('pg-trophy').classList.contains('on'))
await page.screenshot({ path: 'design/daylight/shot-cabinet.png' })
await page.evaluate(() => document.querySelector('.cab .x').click())

await click('.demo')
await sleep(600)
r.plateFired = await page.evaluate(() => document.getElementById('plate').classList.contains('show'))
await click('.demo')
await sleep(400)
r.fullLightFired = await page.evaluate(() => document.getElementById('fulllight').classList.contains('show'))

await page.screenshot({ path: 'design/daylight/shot-vessel.png' })

console.log(JSON.stringify(r, null, 2))
const ok = errors.length === 0 && r.segments === 3 && r.tasks === 6 && r.taskToggle && r.igniteInLive && r.focusOpens && r.flipWorks && r.cabinetOpens && r.trophyShown && r.plateFired && r.fullLightFired
console.log('errors:', errors.length, errors.slice(0, 3).join('; '))
console.log(ok ? 'ALL CHECKS PASSED' : 'FAIL')
await browser.close()
process.exit(ok ? 0 : 1)