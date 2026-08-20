// temp: verify RISE mockup — nav, tasks, celebrations, focus
import puppeteer from 'puppeteer-core'
import path from 'path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const url = 'file://' + path.resolve('design/rise/rise-prototype.html').replace(/\\/g, '/')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
await page.goto(url, { waitUntil: 'load', timeout: 15000 })
await page.setViewport({ width: 480, height: 900 })

const click = (sel) => page.evaluate((s) => document.querySelector(s).click(), sel)

const r = {}
r.screens = await page.evaluate(() => document.querySelectorAll('.screen').length)
r.nav = await page.evaluate(() => document.querySelectorAll('.nbtn').length)
r.tasks = await page.evaluate(() => document.querySelectorAll('.task').length)

await click('.nbtn[data-t="plan"]')
r.planShown = await page.evaluate(() => document.getElementById('plan').style.display !== 'none')
await page.screenshot({ path: 'design/rise/shot-plan.png' })
await click('.nbtn[data-t="focus"]')
r.focusShown = await page.evaluate(() => document.getElementById('focus').style.display !== 'none')
await page.screenshot({ path: 'design/rise/shot-focus.png' })
await click('.nbtn[data-t="progress"]')
r.progressShown = await page.evaluate(() => document.getElementById('progress').style.display !== 'none')
await page.screenshot({ path: 'design/rise/shot-progress.png' })
await click('.nbtn[data-t="you"]')
r.youShown = await page.evaluate(() => document.getElementById('you').style.display !== 'none')
await page.screenshot({ path: 'design/rise/shot-you.png' })
await click('.nbtn[data-t="today"]')

r.taskToggle = await page.evaluate(() => {
  const t = document.querySelector('.card.live .task:not(.done)')
  t.click()
  const done = t.classList.contains('done')
  t.click()
  return done
})

await click('.demo'); await sleep(400)
r.sparkles = await page.evaluate(() => document.querySelectorAll('.sparkle').length > 0)
await click('.demo'); await sleep(300)
r.rayFired = await page.evaluate(() => document.querySelectorAll('.ray').length > 0)
await click('.demo'); await sleep(400)
r.sunriseFired = await page.evaluate(() => document.getElementById('sunriseEl').classList.contains('show'))
await click('.demo'); await sleep(500)
r.badgeFired = await page.evaluate(() => document.getElementById('badgeCard').classList.contains('show'))

await page.screenshot({ path: 'design/rise/shot-today.png' })

console.log(JSON.stringify(r, null, 2))
const ok = errors.length === 0 && r.screens === 5 && r.nav === 5 && r.tasks >= 6 && r.planShown && r.focusShown && r.progressShown && r.youShown && r.taskToggle && r.sparkles && r.rayFired && r.sunriseFired && r.badgeFired
console.log('errors:', errors.length, errors.slice(0, 3).join('; '))
console.log(ok ? 'ALL CHECKS PASSED' : 'FAIL')
await browser.close()
process.exit(ok ? 0 : 1)