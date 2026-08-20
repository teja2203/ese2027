// temp: verify the D/E/F direction previews render, tasks toggle, demos fire
import puppeteer from 'puppeteer-core'
import path from 'path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const base = 'file://' + path.resolve('design-directions').replace(/\\/g, '/') + '/'

const targets = ['D-nocturne.html', 'E-mono-luxe.html', 'F-amber.html', 'index.html']

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
let failed = false
for (const t of targets) {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
  await page.goto(base + t, { waitUntil: 'load', timeout: 15000 })
  await page.setViewport({ width: 900, height: 800 })

  const sel = await page.evaluate(() => ({
    tasks: document.querySelectorAll('.task').length,
    cards: document.querySelectorAll('.card, .sess').length,
    nav: document.querySelectorAll('.nbtn, .nav button, .dbtn').length,
  }))

  let tapOk = false, demoOk = false
  if (t !== 'index.html') {
    tapOk = await page.evaluate(() => {
      const el = document.querySelector('.task')
      if (!el) return false
      const before = el.classList.contains('done')
      el.click()
      return el.classList.contains('done') !== before
    })
    await page.click('.demo')
    demoOk = true
  } else {
    sel.cards = await page.evaluate(() => document.querySelectorAll('.card').length)
    sel.nav = -1
  }

  await page.screenshot({ path: 'design-directions/shot-' + t.replace('.html', '.png') })
  const ok = errors.length === 0 && (t === 'index.html' ? sel.cards >= 3 : sel.tasks > 0 && tapOk && demoOk)
  console.log(t, '→', JSON.stringify(sel), '| tap:', t === 'index.html' ? '-' : tapOk ? 'OK' : 'FAIL', '| errors:', errors.length, errors.slice(0, 2).join('; '), '|', ok ? 'OK' : 'FAIL')
  if (!ok) failed = true
  await page.close()
}
await browser.close()
process.exit(failed ? 1 : 0)
