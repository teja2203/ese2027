# ESE2027 web reference audit (tablet parity baseline)

Audit date: 2026-08-09  
Reference: `app.vercel.ese2027.twa` opened on Samsung SM-T220 (`800x1340`), backed by the live web app in this repository.

This is the behavior the Android conversion must reproduce. It is intentionally separate from the native implementation; no native screen is considered complete until it matches this baseline.

## Fixed geometry and scrolling

- WebView content viewport: `800x1244` between the `32px` status bar and `64px` system navigation area.
- Main content column observed at approximately `x=71..718` (647px wide) on the tablet.
- Shared command deck is the first content block on every route. Its observed bounds are about `x=73..717`, `y=56..130` in the unscrolled view.
- App navigation is fixed at the bottom (`x≈67..732`, `y≈1160..1262`), five equal tabs: Today, Plan, Focus, Progress, You. It remains visible while the page scrolls.
- Timer dock is fixed above navigation (`x≈207..591`, `y≈1075..1159`); it remains visible on every normal route while `pomo.docked !== false`.
- Main page scrolls vertically. `setNav`, `navDay`, and `jumpTo` reset scroll to the top; the focus overlay has its own `overflow-y:auto` scroll container and contains the system navigation only.
- The app reserves bottom space for the fixed dock and nav, so checklist/card content must never be hidden behind them.
- Entering a new route uses a short opacity/translate transition; quiet task updates do not replay the entrance animation.

## Route inventory

### Today

Order is fixed: command deck → greeting/date → current-session hero → 3-cell metrics → current-session checklist → quote. The live reference showed no native-style timetable, countdown cards, habit card, or rating card on this route.

The hero exposes `ENTER FOCUS SPACE` and `Ambient Focus Sound`. Each task row supports checkbox completion and an independent `!` shaky flag. Completion emits a red pixel burst and vibration; task state is persisted immediately.

### Plan

Order is command deck → `PLAN.`/`TODAY` header → phase jump select → day header → five collapsible session cards → Prev/Next day controls. Each session card contains count, slot/time, current `NOW` or `DONE` state, title, chevron, and (when expanded) its task rows and shaky buttons. Selecting a different day resets scroll to top.

### Focus

Order is command deck → `FOCUS SPACE` → FOCUS/BREAK phase keys → large dot-matrix timer and 24-segment progress bar → reset/play/skip controls → presets (`25·5`, `50·10`, `90·20`) → focus/break steppers → Auto Loop row → current session card → today totals. Starting focus opens the full-screen clock mode and keeps the dock synchronized.

### Progress

Order is command deck → `PROGRESS` → overall percentage/segment readout → four counters → day/session streak cells → achievements grid (30 items) → 5-week consistency heat map → 7-day study-time bars → optional session-quality equalizer (only after a rating exists) → habits daily checklist/history → subject-completion segmented bars. This route is substantially longer than one viewport and must scroll naturally.

### You

Order is command deck → `PROFILE & SETTINGS`/`Mastery Dashboard` → Teja identity/stat card → accordions: Achievements, Mock scores, Revision queue, Timer & notifications, Blocking & strict mode, App & data → footer. Achievements are open by default in the observed state; other accordion bodies are opened independently and persist in `ese_prof_exp_v1`.

## Timer dock, drawer, and overlay

- Dock is visible by default and shows remaining time, `FOCUS`/`BREAK`, current subject, and play/pause.
- Tapping the time or subject opens the full focus overlay. Tapping the top-deck headphones or the hero audio button opens the customization drawer.
- Drawer contents: `QUICK TIMER CUSTOMIZATION`, close button, three presets, focus/break −5m/+5m controls, Loop on/off, Focus/Break phase selector, Overlay button, and four audio modes: `Off`, `Brown`, `Pink`, `528Hz`.
- Overlay contents: `FULL FOCUS VIEW`, `DONE`, phase chip, circular/breather timer ring, `CURRENT TASK`, skip/play/reset controls, timing presets, focus/break steppers, and Auto Loop. It is independently vertically scrollable.
- Starting, stopping, completing, skipping, changing phase/preset, and auto-looping all persist `ese_planner_pomo_v5`; running focus banks study minutes continuously and holds a screen wake lock.

## Celebrations and motion

- Every unchecked→checked task calls `ntPixelBurst` at the checkbox (16 red sparks, ~0.6–0.9s) plus a short vibration.
- When all tasks in a session are complete, that session collapses and achievement checks run.
- When all tasks in a day are complete, the day is marked once in `ese_celebrated_days_v1`, then `celebrateDay()` is delayed 350ms.
- Achievement unlocks are persisted in `ese_achievements_v1`; the first eligible achievement is celebrated after ~300ms. Additional eligible achievements are chained after dismissal.
- Celebration modal is a full-screen dark scrim (`z-index:400`) with a medallion that flies/rotates in, dashed spinning halo, burst rings, title tracking animation, seal line, next-session/next-achievement panel, CTA, vibration pattern `[90,40,90,40,150]`, and two confetti waves (150 particles, then 60 after 450ms). Escape, Enter, CTA, or tapping the scrim closes it.
- Audio effects are WebAudio-synthesized (no files): start, stop, complete, break, achievement/fanfare, day-complete, shatter, and flip. Ambient modes use generated Brown noise, Pink noise, or 528Hz oscillators. Audio is unlocked on the first pointer gesture and can be globally disabled.
- Frozen streak resume runs the ice-fly-in → ice-shatter → fire reveal sequence, including shards, confetti, and shatter audio.
- Splash is not optional decoration: it is a 4.2s dot-matrix ESE//2027 reveal with rising red square dust, countdown, fade-out, and tap-to-skip (300ms under reduced-motion).

## Persistence and secondary features

The reference persists checked tasks, day index/nav, pomodoro, logs, theme, expanded sessions, achievements, celebrated days, notifications, strict/blocking settings, mocks, shaky flags, ratings, freeze usage, sound, rest days, habits, and habit history. It also supports JSON backup/restore, optional Supabase sync, Android/browser notification permission flows, streak freeze/rest-day shifting, evening quality rating, evening habit ritual, Sunday summary notification, and distraction logging in strict focus mode.

## Audit conclusion

The previously installed native APK was not a conversion of this surface: it diverged in route structure, spacing, fixed layers, Plan day selection, Focus controls, You accordions/achievement data, celebration depth, audio, and scroll behavior. Implementation must follow this document and be verified on the same `800x1340` tablet after each route is rebuilt. No parity claim should be made from a successful compile alone.
