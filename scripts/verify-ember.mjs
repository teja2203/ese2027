// temp: verify the EMBER prototype renders, tabs switch, tasks spark, celebrations fire
import puppeteer from 'puppeteer-core'
import path from 'path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const url = 'file://' + path.resolve('design/ember/ember-prototype.html').replace(/\\/g, '/')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
await page.goto(url, { waitUntil: 'load', timeout: 15000 })
await page.setViewport({ width: 900, height: 800 })

const r = {}
r.screens = await page.evaluate(() => document.querySelectorAll('.scrn').length)
r.dock = await page.evaluate(() => document.querySelectorAll('.dbtn').length)
r.tasks = await page.evaluate(() => document.querySelectorAll('.task').length)
r.emberCells = await page.evaluate(() => document.querySelectorAll('.em').length)

await page.click('.dbtn[data-t="plan"]')
r.planOn = await page.evaluate(() => document.querySelector('.scrn[data-tab="plan"]').classList.contains('on'))
await page.click('.dbtn[data-t="progress"]')
r.progressOn = await page.evaluate(() => document.querySelector('.scrn[data-tab="progress"]').classList.contains('on'))

const undone = await page.evaluate(() => {
  const t = document.querySelector('.task:not(.done)')
  if (!t) return false
  t.click()
  const after = t.classList.contains('done')
  t.click()
  return after
})
r.taskToggle = undone

await page.click('.dbtn[data-t="you"]')
await page.click('.demo')
await sleep(400)
r.sparkFired = await page.evaluate(() => document.querySelectorAll('.spark').length > 0)
await page.click('.demo')
await sleep(300)
r.shockFired = await page.evaluate(() => document.querySelectorAll('.shock').length > 0)
await page.click('.demo')
await sleep(600)
r.stampFired = await page.evaluate(() => document.querySelector('.plate-stamp').classList.contains('show'))
await page.click('.demo')
await sleep(400)
r.riteFired = await page.evaluate(() => document.querySelector('.rite').classList.contains('show'))

await page.click('.dbtn[data-t="today"]')
await sleep(300)
await page.screenshot({ path: 'design/ember/shot-today.png' })
await page.click('.dbtn[data-t="focus"]')
await sleep(300)
await page.screenshot({ path: 'design/ember/shot-focus.png' })
await page.click('.dbtn[data-t="progress"]')
await sleep(300)
await page.screenshot({ path: 'design/ember/shot-progress.png' })

console.log(JSON.stringify(r, null, 2))
const ok = errors.length === 0 && r.screens === 5 && r.dock === 5 && r.tasks >= 6 && r.emberCells === 35 && r.planOn && r.progressOn && r.taskToggle && r.sparkFired && r.shockFired && r.stampFired && r.riteFired
console.log('errors:', errors.length, errors.slice(0, 3).join('; '))
console.log(ok ? 'ALL CHECKS PASSED' : 'FAIL')
await browser.close()
process.exit(ok ? 0 : 1)
