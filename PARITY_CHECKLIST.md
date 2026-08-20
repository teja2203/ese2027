# PARITY CHECKLIST — ESE2027 Study OS React Migration

Generated from the Phase 1 audit of `legacy/js/app.v63.js` (4,353 lines), `legacy/js/data.js`, `legacy/css/app.css`. Every row must be checked off with its new implementation location before that screen ships. **This is the 100% functional-parity contract.**

Legend: ✅ done · ⬜ pending · ⚠️ partial · 🧹 legacy bug — fixed intentionally (deviation approved)

---

## A. Screens (6)

| # | Screen | Route | Legacy fn (lines) | Status | New location |
|---|--------|-------|-------------------|--------|--------------|
| A1 | Today | `today` | `renderToday` (1454-1553) | ✅ | `src/routes/Today.tsx` |
| A2 | Plan | `plan` | `renderPlan` (1556-1641) | ✅ | `src/routes/Plan.tsx` |
| A3 | Focus | `focus` | `renderFocus` (1644-1764) | ✅ | `src/routes/Focus.tsx` |
| A4 | Progress | `progress` | `renderProgress` (1876-2122) | ✅ | `src/routes/Progress.tsx` |
| A5 | Blocks | `blocks` (aka protection) | `renderProtection` (2305-3288) | ✅ | `src/routes/Blocks.tsx` |
| A6 | You | `you` | `renderYou` (3289-3424) | ✅ | `src/routes/You.tsx` |

Route migrations: `home→today`, `stats→progress`, `settings→you`, `protection→blocks` (legacy 4066-4085).
Nav: 5 buttons (today/plan/focus/progress/blocks); `you` reachable via profile icon, key `6`, `#you`, `eseOpenRoute` (legacy 3648-3656).

## B. Shared shell

| # | Item | Status | Notes |
|---|------|--------|-------|
| B1 | `topDeck()` (1333-1359) — profile btn, wordmark cdToast, days pill, streak pill→progress, notif pill+badge, sound pill→dock drawer, theme cycle | ✅ | `TopDeck.tsx` |
| B2 | Bottom nav `renderNav` (3648-3656) | ✅ | `Nav.tsx` |
| B3 | `header(title,sub)` (1276-1281) | ✅ | shared |
| B4 | Toast (320) — 2200ms auto, `role=status aria-live=polite` | ✅ | Sonner |
| B5 | Ripple delegation `.press` (4056-4063) | ✅ | global |
| B6 | 4 theme suits + `applyTheme`/`setTheme`/`cycleTheme` (3608-3634) incl. `html[data-theme]`, `body.light`, meta theme-color | ✅ | ThemeProvider |
| B7 | Entrance stagger + `body.no-stagger` for quiet renders (3625) | ✅ | |
| B8 | `scrollToTop` + 150ms fade-swap on nav (1160-1193) | ✅ | |
| B9 | Hash routing `#/` + `popstate` (4066-4099) + `eseOpenRoute` | ✅ | |

## C. Overlays / sheets / dialogs (14)

| # | UI | Legacy | Trap focus? | Status | New |
|---|-----|--------|-------------|--------|-----|
| C1 | Mock-score sheet (`addMockSheet` 387) | scrim+sheet | yes (324) | ✅ | Dialog (`AddMockDialog`) |
| C2 | Evening rating sheet (`maybeAskRating` 435) — ≥21:00, minutes>0, unrated; keys 😫😕😐🙂🤩 + Skip | | yes | ✅ | Dialog (`RatingDialog`) |
| C3 | Habit ritual sheet (`maybeAskHabits` 463, `closeRitual` 495) | | yes | ✅ | Dialog (`RitualDialog`) |
| C4 | Generic confirm sheet (`confirmSheet` 2260) | | yes | ✅ | Dialog (`ConfirmDialog`) |
| C5 | Blocks bottom sheets (`sheet` 2423 + stack) | | yes | ✅ | Drawer |
| C6 | Guide sheet (`guideSheet` 3989) | | yes | ✅ | Dialog (`GuideDialog`) |
| C7 | Notification panel (`openNotificationPanel` 1408) | | **no** | ✅ | Drawer + trap |
| C8 | Celebration overlay (`showCelebration` 3536, `celebrateBadge` 3591, `celebrateDay` 3598) — Esc/Enter close, chains `checkAchievements` | | **no** | ✅ | Dialog + trap |
| C9 | Confetti canvas (`fireConfetti` 3492-3531) | | n/a | ✅ | canvas port |
| C10 | Focus overlay (`expandFocusOverlay` 3857 / `collapseFocusOverlay` 3955) — `.breather svg circle:last-child` ring → **replaced by 24-seg bar** | | **no** | ✅ | custom |
| C11 | Flip-clock overlay (`buildWfc` 1815, `setFlip` 1836-1856) — 300/620ms fold, mid-flight interrupts, flip sound | | **no** | ✅ | custom (imperative refs) |
| C12 | Timer dock (`renderTimerDock` 3775) + drawer (`toggleDockDrawer` 3661) | | n/a | ✅ | custom |
| C13 | Auth overlay (`eseSignIn`→`form` 4229) — ids ce/cp/cgo/cmsg/ctog/cskip | | **no** | ⬜ **deferred** | personal-use; cloud row in You is a graceful no-op without M5 |
| C14 | Splash (`#splash` #spDust #spCd) — countdown, red dust, tap-to-skip, 2400ms | | n/a | ✅ | index.html (kept) |

## D. Timer subsystem (3 faces, one engine)

| # | Item | Status |
|---|------|--------|
| D1 | Wall-clock engine: `phaseSecs`/`getRemainingPomo`/`syncPomoState`/500ms interval (579-596) | ✅ |
| D2 | Minute banking: `addMinutes`/`bankProgress`/`logSession` (598-619) — slotHits, distract-free | ✅ |
| D3 | `completePhase` (1055) — toast, vibrate [120,60,120], sound, notify, loop flip, `checkAchievements` | ✅ |
| D4 | `toggleRunning`/`resetPomo`/`skipPhase`/`setPhase`/`applyPreset`/`adjustDuration`/`toggleLoop` (1095-1129) — clamps 5-180 / 1-60 | ✅ |
| D5 | Native handoff: `startNativeFocusIfAvailable` (1088) + pause/stop/skip mirrors | ✅ |
| D6 | Wake lock acquire/release/sync (1041-1051) — while running & visible | ✅ |
| D7 | Fullscreen: `requestAppFullscreen` (1802, AndroidESE first, `requestFullscreen` fallback) + `onShowCustomView` WebChromeClient (Kotlin, untouched) | ✅ **fixed 2026-08-19**: `src/lib/fullscreen.ts` centralizes; exit now fires on stop/reset/setPhase/applyPreset/completePhase (was clock-only); pause keeps the clock open (PAUSED state); start auto-opens clock |
| D8 | Focus screen face `#timer-display` `#phase-display` `#focus-seg` (1766-1799) | ✅ |
| D9 | Focus overlay face `.bignum` `.bigsub` `.fchip` + SVG ring (3828-3838) — **24-seg replacement** | ✅ |
| D10 | Split-flap face (1836-1856) | ✅ |
| D11 | Focus screen totals (sessions/minutes/distractions, 1757-1761) | ✅ |
| D12 | Next-session card (Plan jump, 1751) | 🧹 **removed 2026-08-19** (user decision, redundancy) — Focus is pure timer; Today hero + dock carry the plan context |
| D13 | `holdToConfirm` 5s pointer-capture holds on #wfcBack/Pause/Stop (1019-1037, 1832-1834) — strict-mode gated | ✅ |
| D14 | Hide-on-navigate dock rules (`docked===false` or nav==focus, 3779) | ✅ |

## E. WebAudio

| # | Item | Status |
|---|------|--------|
| E1 | Ambient graph (169-299): brown/pink/sol528, 5s loops, 1.5s fade-in, vibrato LFO, persisted `ese_sound_mode`/`ese_sound_vol` | ✅ |
| E2 | UI engine (620-787): `tone`/`tone2`/`brass`/`shimmer`/`makeVerb`; kinds start/stop/complete/break/fanfare/day/shatter/flip; `state.sound` gate | ✅ |
| E3 | One-shot pointerdown WebAudio unlock (627) — `mediaPlaybackRequiresUserGesture` | ✅ |

## F. Notifications (web+native)

| # | Item | Status |
|---|------|--------|
| F1 | `notifSupported`/`askNotifPermission` (790-825) — AndroidESE poll "pending", Capacitor fallback, Web Notification | ✅ |
| F2 | `notify` (826-862) — tag ese-session, renotify, vibrate; native-phase suppression when `nativeFocusStarted` (831) | ✅ |
| F3 | Daily reminders toggles (863-928) — session/daily/missed-focus settings via bridge | ✅ |
| F4 | Slot reminders: `slotStarts`/`slotEnds` (932-942, +720 rollover), `currentSlotIndex` (953, 15-min grace), `checkSlotNotifications` (981-1002) — skip when native/rest day/off; dedupe `ese_slot_notified_v1`; 60s check loop | ✅ `schedulers.ts` |
| F5 | In-app inbox: panel, mark read, mark all, delete, copy, unread badge (1361-1434) | ✅ |
| F6 | `recordInAppNotification` (1378) — dedupeKey, native create | ✅ |
| F7 | Sunday week review (4339-4353) — ≥19:00, once/day, +8s | ✅ `schedulers.ts` |
| F8 | Rest-day 22:00 toast (1170-1182) | ✅ `schedulers.ts` |
| F9 | Backup nudge (4333-4338) — >7d or none with >5 logged days | ✅ `schedulers.ts` |

## G. Stats / streaks / achievements

| # | Item | Status |
|---|------|--------|
| G1 | `computeStreak` (351-361) + freeze `maybeSpendFreeze` (363-378, once/calendar month) + boot check (4327) | ✅ `schedulers.ts` |
| G2 | `computeSessionStreak` (971-980) + `slotStreak` (960-969) | ✅ |
| G3 | Ice-shatter showcase `iceShatterShowcase` (1293-1331) — once/day sessionStorage guard (1544-1551), tap fire-cell (1514) | ✅ |
| G4 | 30 achievements (3428-3459) + `achMetrics`/`achProgress`/`checkAchievements` (3460-3481, one-per-call) + `nextAchievement` (3482) | ✅ |
| G5 | Celebration chaining (3579) | ✅ |
| G6 | Heat map 35-day + legend, 7-day bars, per-subject bars, day counters (1909-1966, 2100-2122) | ✅ |
| G7 | Quality equalizer (1967-1993) — 14-day ratings, avg, hi/lo hours insight; hidden when nothing rated | ✅ |
| G8 | Habits tracker (1996-2099): 28-day grids, streak (365-day walk, freeze counts), add/expand/delete, `#hbtIn` Enter | ✅ |
| G9 | Mocks card (2125-2156): last-8 bars, trend ±%, list, delete | ✅ |
| G10 | Shaky/revision card (2157-2172): "Solid now" | ✅ |

## H. Today screen specifics

| # | Item | Status |
|---|------|--------|
| H1 | Greeting + weekday/date (536, 1454-1553) | ✅ |
| H2 | Current-slot auto-detection (1473-1478) | ✅ |
| H3 | Hero: slot label/time, subject, desc, 24-cell seg bar, Enter Focus Space CTA, ambient audio CTA | ✅ |
| H4 | Metrics: streak/fire-cell, today minutes, day % | ✅ |
| H5 | This-session spine: task toggle (pixel burst + vibrate 12ms), shaky flag, 3/5 counter | ✅ |
| H6 | Quote whisper cycling `RANKER_QUOTES` (301-307) + `ese_quote_idx` | ✅ |
| H7 | `ntPixelBurst` (1435-1452) | ✅ |
| H8 | `toggleTask` + undo `lastToggle` (1131-1155) — 8s undo window, key `z` | ✅ |

## I. Plan screen specifics

| # | Item | Status |
|---|------|--------|
| I1 | Phase jump select (JUMPS, native select→shadcn Select) | ✅ |
| I2 | Day header: badge tiers hot/core/rest, %-complete, session segment marks, Prev/Next, `navDay` | ✅ |
| I3 | Session accordions (`expandedSessions`, `ese_prof_exp`-like persistence via EXP_KEY) | ✅ |
| I4 | Task rows with toggle + shaky, rest-day shifts `effDateLabel`/`parsePlanDate` (381-384) | ✅ |

## J. Focus screen specifics

| # | Item | Status |
|---|------|--------|
| J1 | FOCUS/BREAK segmented keys, countdown, 24-seg progress, loop note | ✅ |
| J2 | Presets 25·5 / 50·10 / 90·20, ±5 steppers, auto-loop switch | ✅ |
| J3 | ENTER CLOCK MODE (running & `clockOn===false`) | ✅ |
| J4 | Keyboard shortcuts (3970-3986): 1-6 tabs (6 dead—🧹 fixed: `6`→You, `5`→Blocks), T theme, Space timer, ←/→ plan days, Z undo, Esc clock | ✅ |

## K. Blocks screen (native-only, thin shell over AndroidESE)

| # | Item | Status |
|---|------|--------|
| K1 | Web fallback card "NATIVE GUARD OFFLINE" (2311-2320) | ✅ suite-verified |
| K2 | Permission banner + 4 permission rows (2470, 2281) | ✅ native-verified (tablet smoke) |
| K3 | App limits: installs→blocked list, wheels (2700-2737), limit sheets (2740, 2847), add app (2908), `suggestedLimit` (2353), `enforceLimits` (2359), `seg24` (2406) | ✅ |
| K4 | Shorts block settings (2555, 2596) | ✅ |
| K5 | Websites (2982, 3036) + `#wsSiteInput` Enter; other blocks rows | ✅ |
| K6 | Schedule blocking (3167): windows from SLOTS (2233), `syncScheduleToNative` (2245) | ✅ |
| K7 | Strict dialog (2700), `strictDeadlineTs` (2675) | ✅ |
| K8 | `initBlocksLocalCache` (2208) — re-reads native truth every visit | ✅ |

## L. You screen specifics

| # | Item | Status |
|---|------|--------|
| L1 | Identity card: avatar T, TEJA, days-to-ESE, 4 stats | ✅ suite-verified |
| L2 | 6 accordions (`acc` 3329, `ese_prof_exp_v1`) — achievements, mocks, revision queue, timer & notifs, blocking & strict, app & data | ✅ suite-verified |
| L3 | Theme picker (4 cards, 3400), install, backup status row (3410), reset progress (3411), cloud sign-in/out (3413-3419), shortcuts legend | ✅ suite-verified |
| L4 | 🧹 **Export/import REMOVED** (user decision 2026-08-19) — clean structure: automatic versioned backups (auto-backup queue + native mirror) + "Restore latest backup" only | 🧹 removed — You shows Automatic backups + Restore latest backup |
| L5 | 🧹 Rest-day bank UI (mechanism `restDayBank`/`restedDays` had no writer) — open question §7.6 | ✅ writer added (ConfirmDialog + toast) |

## M. Bridge / infra

| # | Item | Status |
|---|------|--------|
| M1 | All 55 `AndroidESE` methods typed (`bridge.ts`, done) | ✅ |
| M2 | `eseOpenRoute` (native→web) | ✅ typed; route wiring done (state.ts:171) |
| M3 | 🧹 `eseHandleAndroidBack` — was undefined in v63 (back killed the app); now defined | ✅ wired in App.tsx |
| M4 | PWA/install prompt — **removed** (user decision; APK-only) | 🧹 n/a |
| M5 | Supabase: read `select` at 4280, 3s diff loop, `merge` policy | ⬜ **deferred** — personal-use; cloud row in You is a graceful no-op (`eseSyncUser`/`sbAuth`/`signOutSupabase`/`eseRequestCloudSync`) |
| M6 | Version skew `sw.js v61` vs `app.js?v=63` — sw removed | 🧹 resolved |
| M7 | XSS: task text, session titles, app/domain names raw-interpolated → escape all | 🧹 |
| M8 | `#dockCustom` null (queried 3664/3672/3821, never rendered) | 🧹 |
| M9 | `wireTheme` → `#themeBtn` dead query | 🧹 |
| M10 | `QUOTES`/`dailyQuote` dead (504-536) | 🧹 |
| M11 | `bridgeCall` wrapper unused (8-22) | 🧹 |
| M12 | `toggleDocked` defined-never-called (1112) | 🧹 |
| M13 | `.rating-scale`/`.rating-key` — no CSS rules existed | 🧹 styled |
| M14 | Capacitor probe (791, 806, 835, 868) — unused branch | open question §7.7 |

## P. NOTHING Premium craft layer (SPEC approved 2026-08-19)

| # | Item | Status |
|---|------|--------|
| P1 | Button press physics: `.btn-acc` depth shadow + hover lift + label nudge + focus-visible rings, `.btn-ghost` fill (acc 9%) + scale, `.btn-icon` corner ticks 11px→4px red, icons scale, nav dot-pop, hold LED cascade | ✅ premium.css 01 (full prototype port) + universal `.press`/`button:active` rule (07) |
| P2 | Celebration rituals: task chk-pop + tick-line + pixBurst + flash (03), pomodoro digit flash + signal line (08), session 24-seg cascade + signal line + flash (09), streak milestone numeral stamp + 100-day LED glow (12), day FULL SIGNAL — LED columns + "100%" stamp (11), LED stamp ceremony (05) | ✅ `src/lib/rituals.ts` bus + `src/lib/celebrate-fx.ts` FX primitives (fxFlash/fxSignalLine/fxStampNumber/fxLedColumns/fxPixBurst) — engine emits, components subscribe (pomodoro.ts:154, flip-clock.tsx, focus.tsx, today-actions.ts, celebration.tsx, App.tsx StreakWatcher) |
| P3 | **No confetti** — `fireConfetti` removed; `confetti.ts` deleted; `bridge.confetti` type dropped | ✅ |
| P4 | First-run whisper "strike the first signal" + run-button pulse (10) | ✅ suite-verified |
| P5 | States/empty/loading per SPEC §4 | ⚠️ first-run done; full empty/loading/error audit deferred to sweep |
| P6 | Reduced-motion guard — rituals degrade to fades (13) | ✅ |
| P7 | Dock/drawer readability: `--card`/`--card-2` defined per theme (tokens.css), glass blur on dock/drawer | ✅ on-device verified (10% fill + 14px blur) |
| P8 | Streak milestone stamp triggers (5/10/25/50/100) | ✅ `StreakWatcher` (App.tsx) polls streak; milestone increase → `fxStampNumber` + stamp sound + haptic; You-screen stamp (key remount) kept for day-to-day |
| P9 | Celebration plate → prototype bottom-slide (400px, border-2, rise spring); sound palette + `flash`/`bell` kinds (SPEC §2) | ✅ today.css `.celebrate` flex-end + `celebrate-rise`; sound.ts kinds |

## N. Data (js/data.js → src/data.ts, ported verbatim)

| # | Item | Status |
|---|------|--------|
| N1 | SLOTS (5 slots) — drives slot streaks, notifications, native schedule | ✅ |
| N2 | DATA 45 days + GEN generators + SCHED + JUMPS + baseSubj | ✅ |
| N3 | Storage key parity + defaults + merge + payload round-trip | ✅ `verify-storage.mjs` |

## O. Build pipeline

| # | Item | Status |
|---|------|--------|
| O1 | Vite `base:'./'` flat output, WebView-safe | ✅ |
| O2 | Gradle `buildWebApp` → `syncWebAssets` → `preBuild`, assets cleaned | ✅ APK builds |
| O3 | Fonts: hashed copies (CSS) + stable `fonts/` (splash @font-face) | ✅ |
| O4 | PWA/Vercel/Netlify removed | ✅ user-directed |
