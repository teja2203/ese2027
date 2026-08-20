# DAYLIGHT — Parameter-by-parameter design analysis (ESE2027 Study OS)

Every line below is a decision with alternatives considered and a stated rationale.
No parameter was chosen randomly. Where a parameter changes placement or buttons,
the old approach is listed with why it was rejected.

---

## 1. Product model
- **Chosen:** The app *is* the day. One primary object (today's timeline) you hold,
  move light through, and flip/draw from. Everything else is an edge or a morph.
- Rejected: "5 screens" model — forces duplicate chrome (per-screen headers, per-screen
  empty states) and redundant placements, which the brief forbids.

## 2. Information architecture (placement overhaul)
- **Chosen:** 1 vessel + 2 edges + 1 morph.
  - **The Day** — always center. Vertical timeline = sessions as light segments.
  - **Flip** — the vessel flips horizontally to reveal the WEEK (Plan). Days as a stack;
    tap to pull forward. (Replace the Plan tab + day-jump controls.)
  - **Cabinet** — right-edge drawer with three shelves: **Record** (Progress), **Trophy
    wall** (Achievements), **Self** (You: profile/settings/sync). (Replaces Progress and
    You tabs — two fixed tabs collapsed into one contextual drawer.)
  - **Focus morph** — tapping the active session segment morphs the vessel into the
    full-screen focus overlay. No separate Focus screen, no duplicate timer.
- Feature mapping (zero loss): plan/tasks ✓ (flip→week), pomodoro+sounds+strict mode+
  distraction log ✓ (morph), streaks/stats/bars ✓ (Record), 30 achievements ✓ (Trophy),
  profile/settings/sync ✓ (Self), habit ritual + evening rating ✓ (vessel bottom).
- Rejected: bottom 5-tab nav (previous apps) — fixed chrome duplicates the vessel's job;
  sidebar rail (D) — still a destination model; floating big center button (previous
  dock) — a timer button that exists even when no session is active is redundant.

## 3. Layout & grid
- **Chosen:** single centered column, max 560px, 8pt rhythm. The vessel has a fixed
  internal grid (time lane + content lane). Tablet landscape: vessel centered, drawers
  overlay from edges, gutters widen (24→40px). Phone: vessel is full width, edges
  become swipe zones.
- Chosen over: bento/multi-pane (fragments attention), dashboards (D/E/F all used
  multi-pane cards — rejected for one-focus discipline).

## 4. Hierarchy
- **Chosen (loud→quiet):** 1) the LIGHT (completion) — brightest element; 2) time
  numerals — large tabular; 3) session names; 4) task text; 5) metadata labels.
- Rationale: in a study app the only metric that matters is "is the day filling up?"
  The light answers that in one glance; nothing else may out-shout it.

## 5. Typography
- **Chosen:** Inter-class sans for everything; numerals get `font-variant-numeric:
  tabular-nums` + tight tracking (-0.02em); labels in mono (Cascadia/Consolas), 10px,
  wide letterspacing. One weight story: 600 for light/time, 500 for names, 400 body.
- Rejected: serif (F — elegant but slower to scan under stress), gradient display
  (D — decoration without information), oversized editorial numerals (E — the light is
  the hero, not the number).

## 6. Color (new identity — red is no longer the identity)
- Backdrop: deep ink graphite `#0B0D10` (blue-tinted, OLED-friendly, not pure black).
- The signal is **the light**: warm ivory→gold `#F5E6C4 → #F5B84C` (completed work).
- Pending: cool steel `#5F8EA9`; rest/cooldown: steel wash; danger (skip session,
  destructive): the ONE red `#E85A4A` — now semantically reserved, never decorative.
- Surfaces: glass — `rgba(255,255,255,.04–.08)` fills + `backdrop-filter: blur(18px)`
  + 1px `rgba(255,255,255,.09)` borders + top-edge highlight line. Fallback (WebView):
  solid `rgba(15,17,20,.92)` without blur — same hierarchy.
- Rationale: previous identity used red as an accent everywhere (Nothing); here red
  means "destructive" only. The completed-work gold creates the "wow": the screen
  literally warms up as you study.

## 7. Iconography
- One geometric stroke family (1.5px), 20–24px only. Light = filled (it IS light);
  everything else = outline. No emoji anywhere (ui-ux-pro-max rule).

## 8. Buttons — new placements (no fixed positions)
- **Ignite**: lives INSIDE the vessel, at the right edge of the *active* segment.
  Only exists while a session is active. Tap → focus morph. Fills as time burns.
- **Lift**: primary action inside sheets/drawers (glass, gold border, knocks 2px).
- **Tap**: bare text actions inline with their subject (edit task, bank rest, sync).
- **Edge glyphs**: two small rails — left bottom (flip→week), right bottom (cabinet).
  Everything else is contextual: an action sits next to what it acts on. No floating
  primary buttons, no bottom-center timer, no duplicated controls anywhere.
- Rejected: fixed bottom-center start (redundant chrome), dock centers (EMBER),
  pill nav (C), rail (D).

## 9. Motion — light physics
- Fill: 700ms `cubic-bezier(.16,1,.3,1)` (light rises, never jumps).
- Morph (vessel→focus): 400ms scale+fade with glass bloom.
- Drawers: 380ms spring from edges; flip: 500ms `rotateY` with light spill.
- Rule: motion communicates state only — fills = completion, blooms = milestones,
  glows = active. Nothing decorative, everything < 800ms, reduced-motion honored.

## 10. Celebration system (ceremonial, not confetti)
- **Task complete** → segment light level rises + 3–5 warm motes drift + soft thock
  (WebAudio, mute-aware).
- **Session complete** → vessel pulses gold once, segment blooms full, single bell.
- **Day complete** → FULL LIGHT: top→bottom sweep, vessel blooms, day numerals bloom
  (scale 1→1.12 settle), ~20 motes, bloom chord. Skippable, ~1.6s.
- **Achievement** → Trophy wall: plate slides from right edge, engraves (stroke draws),
  knocks, glows 2s, lamps light on the cabinet.
- **Streak milestones** → vessel wick (top line) burns hotter; ticks ignite every 5 days.
- **Rest day** → cool steel wash + "cooldown" stamp, muted bell.
- Sound palette: thock / bell / bloom / gong — all short, all respect mute + 528Hz
  coexistence. (ui-ux-pro-max: micro-interactions 150–300ms; celebrations ≤1.6s.)

## 11. Every state designed
- **First run** → vessel empty with one lit seed: "strike your first match" — tap to
  light the first session; small ceremony (this IS the onboarding).
- **Empty** → "no light yet today" + Lift to open the week and pull a session.
- **Loading/sync** → glass shimmer on the vessel only (no spinners elsewhere).
- **Error** → cool steel wash, plain sentence, Retry as inline Tap.
- **1-day vs 100-day streak** → wick glow intensity + tick density scale with streak;
  100-day vessel gets a warm ambient halo.

## 12. Platform & performance
- Vanilla CSS variables only; backdrop-filter is progressive enhancement (solid glass
  fallback). Single `<canvas>`-free DOM; celebrations are CSS/JS DOM with `will-change`
  hints; no libraries. WebView contract unchanged (same storage keys, same features).
