// temp: verify the 3 design direction previews render without console errors
import puppeteer from 'puppeteer-core'
import path from 'path'
import fs from 'fs'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const base = 'file://' + path.resolve('design-directions').replace(/\\/g, '/') + '/'

const targets = ['A-field-notes.html', 'B-flight-deck.html', 'C-warm-minimal.html', 'index.html']

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
let failed = false
for (const t of targets) {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
  await page.goto(base + t, { waitUntil: 'load', timeout: 15000 })
  await page.screenshot({ path: 'design-directions/shot-' + t.replace('.html', '.png') })
  const sel = await page.evaluate(() => {
    const tasks = document.querySelectorAll('.task').length
    const sessions = document.querySelectorAll('.sess').length
    const slots = document.querySelectorAll('.slot').length
    const navs = document.querySelectorAll('.tabs button, .rail button').length
    return { tasks, sessions, slots, navs }
  })
  const ok = errors.length === 0 && (t === 'index.html' ? await page.evaluate(() => document.querySelectorAll('.card').length >= 3) : sel.tasks > 0 && (sel.sessions > 0 || sel.slots > 0))
  let tapOk = false
  if (t !== 'index.html') {
    tapOk = await page.evaluate(() => {
      const el = document.querySelector('.task')
      const before = el.classList.contains('done')
      el.click()
      return el.classList.contains('done') !== before
    })
  }
  console.log(t, '→', JSON.stringify(sel), '| tap:', t === 'index.html' ? '-' : tapOk ? 'OK' : 'FAIL', '| errors:', errors.length, errors.slice(0, 2).join('; '), '|', ok ? 'OK' : 'FAIL')
  if (!ok) failed = true
  await page.close()
}
await browser.close()
process.exit(failed ? 1 : 0)
