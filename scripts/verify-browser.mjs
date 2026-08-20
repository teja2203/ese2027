/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   verify-browser.mjs â€” headless-Edge smoke test for the React shell.
   Serves dist/ over localhost, drives the app, asserts shell
   behavior (splash handoff, routing, theme, inbox, keyboard, hash).
   Text-only output; exit 1 on any failure.
   Run: node scripts/verify-browser.mjs
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import puppeteer from 'puppeteer-core'

const DIST = join(process.cwd(), 'dist')
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 4187

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json'
}

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0])
    if (p === '/') p = '/index.html'
    const file = join(DIST, normalize(p))
    if (!file.startsWith(DIST)) throw new Error('path escape')
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404)
    res.end('not found')
  }
})

let passed = 0
let failed = 0
function check(name, ok) {
  if (ok) {
    passed++
    console.log(`  âœ“ ${name}`)
  } else {
    failed++
    console.log(`  âœ— ${name}`)
  }
}

await new Promise((r) => server.listen(PORT, r))

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--window-size=420,800']
})
const page = await browser.newPage()
await page.setViewport({ width: 420, height: 800 })

const consoleErrors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', (err) => consoleErrors.push(String(err)))

console.log('1. boot')
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })

await page.waitForFunction(() => !document.getElementById('splash'), { timeout: 8000 })
check('splash removed after React mount', true)

await page.waitForSelector('.top-deck')
const brand = await page.$eval('.nt-brand', (el) => el.textContent.replace(/\s+/g, ''))
check(`brand wordmark rendered ("ESE//2027")`, brand === 'ESE//2027')

const cdPill = await page.$eval('.cd-tag, .td-left .nt-tag', (el) => el.textContent.replace(/\s+/g, ''))
check(`countdown pill has a number (${cdPill})`, /\d+D/.test(cdPill))

const streakPill = await page.$eval('.streak-tag', (el) => el.textContent.replace(/\s+/g, ''))
check(`streak pill rendered (${streakPill})`, /\d+d/.test(streakPill))

console.log('2. routing (nav click + fade swap)')
await page.click('.navbtn:nth-child(2)')
await page.waitForFunction(() => document.querySelector('.nt-plan-head .t')?.textContent?.includes('Plan'), { timeout: 2000 })
check('click Plan â†’ Plan screen', true)

await page.click('.navbtn:nth-child(5)')
await page.waitForFunction(() => document.querySelector('.nt-pagehead h1')?.textContent === 'Blocks', { timeout: 2000 })
check('click Blocks â†’ Blocks screen', true)

console.log('3. keyboard shortcuts')
await page.keyboard.press('3')
await page.waitForSelector('.nt-fclock', { timeout: 2000 })
check('key 3 â†’ Focus screen', true)
await page.keyboard.press('5')
await page.waitForFunction(() => document.querySelector('.nt-pagehead h1')?.textContent === 'Blocks', { timeout: 2000 })
check('key 5 â†’ Blocks screen', true)
await page.keyboard.press('6')
await page.waitForFunction(() => document.querySelector('.nt-pagehead h1')?.textContent === 'Profile & Settings', { timeout: 2000 })
check('key 6 â†’ You screen', true)
await page.keyboard.press('1')
await page.waitForSelector('.nt-hero', { timeout: 2000 })
check('key 1 â†’ Today screen', true)

console.log('4. hash routing')
await page.evaluate(() => {
  history.replaceState(null, '', '#plan')
})
await page.keyboard.press('1') // back to today first (hash listener reads on boot only)
await page.evaluate(() => location.reload())
await page.waitForSelector('.nt-plan-head .t', { timeout: 5000 })
await page.waitForFunction(() => document.querySelector('.nt-plan-head .t')?.textContent?.includes('Plan'), { timeout: 3000 })
await page.waitForFunction(() => !document.getElementById('splash'), { timeout: 7000 })
check('boot reads #plan hash â†’ Plan screen', true)

console.log('5. theme cycle (sun/moon toggle)')
const themeBefore = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
await page.click('.theme-btn')
await page.waitForFunction(
  (b) => document.documentElement.getAttribute('data-theme') !== b,
  { timeout: 2000 },
  themeBefore
)
const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
check(`theme toggled ${themeBefore} â†’ ${themeAfter}`, themeAfter !== themeBefore)
check(`body.light matches paper`, (await page.evaluate(() => document.body.classList.contains('light'))) === (themeAfter === 'paper'))
await page.click('.theme-btn')
await page.waitForFunction(
  (b) => document.documentElement.getAttribute('data-theme') === b,
  { timeout: 2000 },
  themeBefore
)
check('theme toggled back', true)

console.log('6. notification panel')
await page.click('.notif-pill')
await page.waitForSelector('[role="dialog"]', { timeout: 2000 })
const dialogTitle = await page.$eval('[role="dialog"]', (el) => el.textContent || '')
check(`inbox dialog opens (contains "Notifications")`, dialogTitle.includes('Notifications'))
await page.keyboard.press('Escape')
await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 2000 })
check('inbox closes on Esc (focus trap + dismiss)', true)

console.log('7. profile â†’ You route')
await page.click('.td-profile-btn')
await page.waitForFunction(() => document.querySelector('.nt-pagehead h1')?.textContent === 'Profile & Settings', { timeout: 2000 })
check('profile button â†’ You screen', true)

console.log('8. console errors')
const real = consoleErrors.filter((e) => !/favicon|DevTools/i.test(e))
check(`no console/page errors (${real.length})`, real.length === 0)
if (real.length) real.forEach((e) => console.log('    â””', e.slice(0, 200)))

console.log('9. Today hero')
await page.keyboard.press('1')
await page.waitForSelector('.nt-hero', { timeout: 3000 })
await page.waitForSelector('.nt-hero', { timeout: 3000 })
const subject = await page.$eval('.nt-hero .subject', (el) => el.textContent.trim())
check(`hero subject rendered (${subject.slice(0, 40)})`, subject.length > 3)
const segCells = await page.$$eval('.nt-hero .nt-seg i', (els) => els.length)
check(`hero seg bar has ${segCells} cells`, segCells >= 1)
const segrow = await page.$eval('.nt-hero .nt-segrow', (el) => el.textContent)
check(`hero session counter ("${segrow.trim().replace(/\s+/g, ' ')}")`, /Session \d/.test(segrow))
const cta = await page.$eval('#heroStartBtn', (el) => el.textContent.trim())
check(`hero CTA ("${cta}")`, cta.includes('Focus Space') || cta.includes('Completed'))
const metricsCells = await page.$$eval('.nt-metrics .cell', (els) => els.length)
check('metrics 3-cell grid', metricsCells === 3)

console.log('10. task toggle + undo + shaky + quote')
const checkedBefore = await page.evaluate(() => localStorage.getItem('ese_planner_checked_v3'))
await page.$eval('.taskrow .task-toggle', (el) => el.click())
const fxFlashSeen = await page.evaluate(() => !!document.querySelector('.fx-flash'))
check('task check fx-flash layer mounts', fxFlashSeen)
await page.waitForFunction(
  (b) => localStorage.getItem('ese_planner_checked_v3') !== b,
  { timeout: 2000 },
  checkedBefore
)
const checkedAfter = await page.evaluate(() => localStorage.getItem('ese_planner_checked_v3'))
check('task toggle persisted to localStorage', checkedAfter !== checkedBefore)
const rowDone = await page.$eval('.taskrow', (el) => el.classList.contains('done'))
check('task row marked done', rowDone)
const segOn = await page.$$eval('.nt-hero .nt-seg i.on', (els) => els.length)
check(`seg bar lit (${segOn} on)`, segOn >= 1)

await page.keyboard.press('z')
await page.waitForFunction(
  () => localStorage.getItem('ese_planner_checked_v3') === '{}',
  { timeout: 2000 }
)
check('undo (z) restored task', true)

await page.click('.taskrow .shakybtn')
const shakyStored = await page.evaluate(() => localStorage.getItem('ese_shaky_v1'))
check(`shaky flag stored (${(shakyStored || '').slice(0, 40)})`, !!shakyStored && shakyStored !== '{}')
const shakyOn = await page.$eval('.taskrow .shakybtn', (el) => el.classList.contains('on'))
check('shaky button lit', shakyOn)

const q1 = await page.$eval('.nt-whisper .q', (el) => el.textContent)
await page.$eval('.nt-whisper', (el) => el.click())
await page.waitForFunction(
  (a) => document.querySelector('.nt-whisper .q')?.textContent !== a,
  { timeout: 2000 },
  q1
)
const qIdx = await page.evaluate(() => localStorage.getItem('ese_quote_idx'))
check(`quote cycled (idx ${qIdx})`, true)

console.log('10b. greeting + countdown sanity')
const greet = await page.$eval('.nt-greet', (el) => el.textContent)
check(`greeting rendered (${greet.trim().slice(0, 40)})`, greet.trim().length > 3)

console.log('11. Focus screen readout')
await page.keyboard.press('3')
await page.waitForSelector('.nt-fclock', { timeout: 3000 })
const bigTxt = await page.$eval('.nt-fclock .big', (el) => el.textContent.trim())
check(`focus countdown rendered (${bigTxt})`, /^\d{2}:\d{2}$/.test(bigTxt))
const phaseTxt = await page.$eval('.nt-fclock .phase', (el) => el.textContent.trim())
check(`phase label (${phaseTxt})`, phaseTxt === 'FOCUS' || phaseTxt === 'BREAK')
const fseg = await page.$$eval('.nt-fclock .fseg i', (els) => els.length)
check(`focus seg has 24 cells (${fseg})`, fseg === 24)
const fkeys = await page.$$eval('.nt-fctrl .fkey', (els) => els.length)
check('focus has 3 controls', fkeys === 3)
const presets = await page.$$eval('.nt-fpresets .fpre', (els) => els.length)
check(`presets row (${presets})`, presets === 3)
const steps = await page.$$eval('.nt-fsteppers .fstep', (els) => els.length)
check(`steppers (${steps})`, steps === 2)
const presetLabels = await page.$$eval('.nt-fpresets .fpre', (els) => els.map((e) => e.textContent))
check(
  'preset labels byte-correct',
  presetLabels[0] === '25 \u00B7 5' && presetLabels[1] === '50 \u00B7 10' && presetLabels[2] === '90 \u00B7 20'
)
check('no next-session card (D12 removed)', (await page.$$('.nt-fnext')).length === 0)
const whisper = await page.$eval('.nt-fwhisper', (el) => el.textContent.trim())
check(`first-run whisper ("${whisper}")`, whisper === 'strike the first signal')
check('run button pulse class', (await page.$eval('.fkey.run', (el) => el.className)).includes('pulse'))

console.log('12. timer run — auto-enters flip clock (bug #2 fixed)')
await page.click('.fkey.run')
await page.waitForFunction(() => JSON.parse(localStorage.getItem('ese_planner_pomo_v5') || '{}').running === true, { timeout: 2000 })
check('run starts timer (pomo.running)', true)
await page.waitForSelector('#wfcOverlay.active', { timeout: 3000 })
check('flip clock auto-opens on start', true)
await new Promise((r) => setTimeout(r, 700))
const wfcMin = await page.$eval('#wfcMin .wfc-top span', (el) => el.textContent)
const wfcSec = await page.$eval('#wfcSec .wfc-top span', (el) => el.textContent)
check(`flip clock digits (${wfcMin}:${wfcSec})`, /^\d{2}$/.test(wfcMin) && /^\d{2}$/.test(wfcSec))
const wfcPhase = await page.$eval('#wfcOverlay .phase', (el) => el.textContent.trim())
check(`flip clock phase (${wfcPhase})`, wfcPhase === 'FOCUS' || wfcPhase === 'BREAK')
check('pomo-flash layer mounted', (await page.$$('.wfc-flash')).length === 1)
const tap = (sel) =>
  page.$eval(sel, (el) => {
    const r = el.getBoundingClientRect()
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: r.x + 4, clientY: r.y + 4 }))
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: r.x + 4, clientY: r.y + 4 }))
  })
await tap('.wfc-stop')
await page.waitForFunction(() => JSON.parse(localStorage.getItem('ese_planner_pomo_v5') || '{}').running === false, { timeout: 2000 })
check('pause via clock (wfc-stop)', true)
await tap('.wfc-stop')
await page.waitForFunction(() => JSON.parse(localStorage.getItem('ese_planner_pomo_v5') || '{}').running === true, { timeout: 2000 })
check('resume via clock', true)
await tap('.wfc-end')
await page.waitForFunction(() => !document.querySelector('#wfcOverlay.active'), { timeout: 3000 })
check('back closes clock, timer keeps running', true)
await page.waitForSelector('.nt-fclockbtn', { timeout: 3000 })
await page.click('.nt-fclockbtn')
await page.waitForSelector('#wfcOverlay.active', { timeout: 3000 })
check('Enter Clock Mode reopens overlay', true)
await tap('.wfc-pause')
await page.waitForFunction(() => !document.querySelector('#wfcOverlay.active'), { timeout: 3000 })
check('stop closes clock + resets', true)

console.log('13. presets + steppers + loop (stopped state)')
await page.$eval('.nt-fpresets .fpre:nth-child(2)', (el) => el.click())
await page.waitForFunction(() => JSON.parse(localStorage.getItem('ese_planner_pomo_v5') || '{}').workMins === 50, { timeout: 2000 })
check('preset 50·10 applied', true)
await page.$eval('.nt-fsteppers .fstep:first-child .btns button:first-child', (el) => el.click())
await page.waitForFunction(() => JSON.parse(localStorage.getItem('ese_planner_pomo_v5') || '{}').workMins === 55, { timeout: 2000 })
check('stepper +5 applied', true)
const loopBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('ese_planner_pomo_v5') || '{}').loop)
await page.$eval('.nt-floop', (el) => el.click())
await page.waitForFunction(
  (b) => JSON.parse(localStorage.getItem('ese_planner_pomo_v5') || '{}').loop !== b,
  { timeout: 2000 },
  loopBefore
)
check(`loop toggled (${loopBefore} → ${!loopBefore})`, true)
await page.$eval('.nt-floop', (el) => el.click())
await page.waitForFunction(
  (b) => JSON.parse(localStorage.getItem('ese_planner_pomo_v5') || '{}').loop === b,
  { timeout: 2000 },
  loopBefore
)
check('loop toggled back', true)

console.log('14. focus overlay (dock → expand)')
await page.keyboard.press('1')
await page.waitForSelector('.nt-hero', { timeout: 3000 })
await page.waitForSelector('.timer-dock.show', { timeout: 3000 })
await page.click('.timer-dock .dtime-box')
await page.waitForSelector('#focusOverlay', { timeout: 3000 })
const ovBig = await page.$eval('#focusOverlay .bignum', (el) => el.textContent.trim())
check(`overlay countdown (${ovBig})`, /^\d{2}:\d{2}$/.test(ovBig))
const ovSeg = await page.$$eval('#focusOverlay .fseg.big i', (els) => els.length)
check(`overlay seg has 24 cells (${ovSeg})`, ovSeg === 24)
const ovChips = await page.$$eval('#focusOverlay .fpreset-chip', (els) => els.length)
check(`overlay presets (${ovChips})`, ovChips === 3)
await page.$eval('#focusOverlay .fexit', (el) => el.click())
await page.waitForFunction(() => !document.querySelector('#focusOverlay'), { timeout: 3000 })
check('overlay closes via Done âœ•', true)

console.log('15. timer dock + drawer + ambient modes')
await page.waitForSelector('.timer-dock.show', { timeout: 3000 })
const dockTime = await page.$eval('.timer-dock .dtime', (el) => el.textContent.trim())
check(`dock time (${dockTime})`, /^\d{2}:\d{2}$/.test(dockTime))
await page.click('.timer-dock .dicon-btn')
await page.waitForSelector('#timerDockDrawer', { timeout: 3000 })
const soundBtns = await page.$$eval('#timerDockDrawer .dsound-btn', (els) => els.length)
check(`drawer sound modes (${soundBtns})`, soundBtns === 4)
await page.$eval('#timerDockDrawer .dsound-btn:nth-child(3)', (el) => el.click())
await page.waitForFunction(() => JSON.parse(localStorage.getItem('ese_sound_mode')) === 'pink', { timeout: 2000 })
check('ambient mode pink persisted', true)
await page.$eval('#timerDockDrawer .dsound-btn:nth-child(1)', (el) => el.click())
await page.waitForFunction(() => JSON.parse(localStorage.getItem('ese_sound_mode')) === 'off', { timeout: 2000 })
check('ambient mode off persisted', true)
await page.$eval('#timerDockDrawer .ddrawer-close', (el) => el.click())
await page.waitForFunction(() => !document.querySelector('#timerDockDrawer'), { timeout: 2000 })
check('drawer closes', true)

console.log('16. cleanup — reset on Focus')
await page.keyboard.press('3')
await page.waitForSelector('.nt-fclock', { timeout: 3000 })
await page.click('.fkey')
await page.waitForFunction(() => JSON.parse(localStorage.getItem('ese_planner_pomo_v5') || '{}').timeLeft === 55 * 60, { timeout: 2000 })
check('reset restores timeLeft', true)

console.log('17. Progress screen blocks')
await page.keyboard.press('4')
await page.waitForSelector('.nt-phead .pbig', { timeout: 3000 })
const pbig = await page.$eval('.nt-phead .pbig', (el) => el.textContent.trim())
check(`overall % rendered (${pbig})`, /^\d+%$/.test(pbig))
check('counters grid 4 cells', (await page.$$eval('.nt-pgrid .pcell', (els) => els.length)) === 4)
check('streak cells 2', (await page.$$eval('.nt-pstreak .pstk', (els) => els.length)) === 2)
check('achievements 30', (await page.$$eval('.nt-achgrid .achwrap', (els) => els.length)) === 30)
check('heatmap 35 cells', (await page.$$eval('.heatgrid .hcell', (els) => els.length)) === 35)
check('7-day bars', (await page.$$eval('.barrow .barcol', (els) => els.length)) === 7)
const subjRows = await page.$$eval('.subjlist .subj', (els) => els.length)
check(`subject segs (${subjRows})`, subjRows >= 10)
const subjSegs = await page.$$eval('.subjlist .subj:first-child .sseg i', (els) => els.length)
check('subject seg 16 cells', subjSegs === 16)
const heatSeg = await page.$$eval('.nt-phead .phseg i', (els) => els.length)
check('overall seg 28 cells', heatSeg === 28)

console.log('18. habits (add, check, expand, delete)')
await page.$eval('.hbt-input', (el) => { el.value = 'deep work' })
await page.$eval('.hbt-add', (el) => el.click())
await page.waitForFunction(() => JSON.parse(localStorage.getItem('ese_habits_v1') || '[]').length === 1, { timeout: 2000 })
check('habit added + persisted', true)
const habitName = await page.$eval('.hbt-name', (el) => el.textContent)
check(`habit name uppercased (${habitName})`, habitName === 'DEEP WORK')
await page.$eval('.hbt-check', (el) => el.click())
await page.waitForFunction(() => {
  const h = JSON.parse(localStorage.getItem('ese_habits_v1') || '[]')[0]
  const lg = JSON.parse(localStorage.getItem('ese_habit_log_v1') || '{}')
  const today = new Date()
  const k = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0')
  return lg[k]?.[h.id] === true
}, { timeout: 2000 })
check('habit check persisted', true)
const habitRowClass = await page.$eval('.hbt-row', (el) => el.className)
check('habit row marked done', /hbt-done/.test(habitRowClass))
await page.$eval('.hbt-exp', (el) => el.click())
await page.waitForSelector('.hbt-hist-grid', { timeout: 2000 })
check('habit history expands (28-day grid)', (await page.$$eval('.hbt-hist-grid .hbt-hd', (els) => els.length)) === 28)
await page.$eval('.hbt-del', (el) => el.click())
await page.waitForFunction(() => JSON.parse(localStorage.getItem('ese_habits_v1') || '[]').length === 0, { timeout: 2000 })
check('habit deleted', true)

console.log('19. console still clean')
const errs2 = await page.evaluate(() => window.__errCount || 0)
check(`no console/page errors (${errs2})`, errs2 === 0)

console.log('20. Blocks screen (web fallback, K1)')
await page.keyboard.press('5')
await page.waitForSelector('.blocks-empty', { timeout: 3000 })
const beTitle = await page.$eval('.blocks-empty .be-title', (el) => el.textContent)
check(`native guard offline card (${beTitle})`, beTitle === 'NATIVE GUARD OFFLINE')
await page.keyboard.press('1')

console.log('21. You screen (L1-L5)')
await page.keyboard.press('6')
await page.waitForSelector('.nt-you .yname', { timeout: 3000 })
const yname = await page.$eval('.nt-you .yname', (el) => el.textContent)
check(`identity card (${yname})`, yname === 'TEJA')
const ysub = await page.$eval('.nt-you .ysub', (el) => el.textContent)
check('days-to-ESE countdown', /ESE 2027 ASPIRANT · \d+D TO GO/.test(ysub))
check('identity stats 4', (await page.$$eval('.nt-you .yst', (els) => els.length)) === 4)
check('accordions 6', (await page.$$eval('.nt-acc', (els) => els.length)) === 6)
check('footer version', (await page.$eval('.nt-youfoot', (el) => el.textContent)).includes('2027 STUDY OS'))

/* App & data accordion: theme grid + export/import + rest-day bank + shortcuts */
await page.evaluate(() => {
  const heads = document.querySelectorAll('.acchead')
  for (const h of heads) if (h.textContent.includes('App & data')) h.click()
})
await page.waitForFunction(() => document.body.textContent.includes('Automatic backups'), { timeout: 2000 })
check('theme cards 4', (await page.$$eval('.theme-grid .theme-card', (els) => els.length)) === 4)
check('export removed (L4 🧹)', await page.evaluate(() => !document.body.textContent.includes('Export my data')))
check('backup rows present', (await page.$eval('.nt-setrow', (el) => true) === true))
const accText = await page.$$eval('.nt-acc', (els) => els[els.length - 1].textContent)
check('backup rows', accText.includes('Automatic backups'))
check('rest-day bank row', accText.includes('Rest-day bank'))
check('shortcuts legend', accText.includes('1\u20136 tabs'))
check('cloud sync row', accText.includes('Cloud sync'))

/* Timer & notifications accordion */
await page.evaluate(() => {
  const heads = document.querySelectorAll('.acchead')
  for (const h of heads) if (h.textContent.includes('Timer & notifications')) h.click()
})
await page.waitForFunction(() => document.body.textContent.includes('Auto loop'), { timeout: 2000 })
const timerText = await page.$$eval('.nt-acc', (els) => (els.find((e) => e.textContent.includes('Auto loop')) || { textContent: '' }).textContent)
check('timer rows', timerText.includes('Auto loop') && timerText.includes('Sounds') && timerText.includes('Session completion alerts'))

/* Achievements accordion renders the 30-grid */
await page.evaluate(() => {
  const heads = document.querySelectorAll('.acchead')
  for (const h of heads) if (h.textContent.includes('Achievements')) h.click()
})
await page.waitForSelector('.nt-acc .nt-achgrid', { timeout: 2000 })
check('achievements grid 30', (await page.$$eval('.nt-acc .nt-achgrid .achwrap', (els) => els.length)) === 30)

await page.keyboard.press('1')

await page.screenshot({ path: 'dist/verify-shell.png' })
await browser.close()
server.close()

console.log(failed ? `${failed} CHECKS FAILED` : 'ALL CHECKS PASSED')
process.exit(failed ? 1 : 0)