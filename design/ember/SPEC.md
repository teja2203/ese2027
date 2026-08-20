# EMBER — Complete UI redesign spec for ESE2027 Study OS

Concept: **the exam campaign as a burning wick**. Every screen carries a *filament* —
a thread of warm light that burns brighter as you complete work. Dark-first, warm ink
surfaces, chamfered plates, one ember accent, steel-blue for cooldown/rest states.

---

## 1. Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#100E0C` | app background (warm ink black, not OLED pure) |
| `--bg-2` | `#171411` | secondary surfaces |
| `--panel` | `#1B1714` | cards/plates |
| `--raised` | `#221C18` | pressed/raised surfaces |
| `--line` | `rgba(242,234,224,.08)` | hairlines |
| `--line-2` | `rgba(242,234,224,.16)` | stronger hairline |
| `--ink` | `#F2EAE0` | bone text |
| `--ink-2` | `#B9AFA2` | secondary |
| `--ink-3` | `#7A7166` | tertiary |
| `--ember` | `#FF6A2B` | the signal. hotness, progress, action |
| `--ember-hot` | `#FFB03A` | peak burn (streak/ignition) |
| `--ember-dim` | `rgba(255,106,43,.12)` | tint fills |
| `--steel` | `#59C2D8` | cool states: rest day, sync, cooldown |
| `--leaf` | `#58C47C` | completed/verified |
| `--warn` | `#E8B84B` | soft warnings |
| -- | | |
| Display | `'Space Grotesk', 'Segoe UI', sans-serif` | numerals + headlines |
| Mono | `'Cascadia Mono', Consolas, monospace` | data, labels, tags |
| Body | `'Segoe UI', system-ui, sans-serif` | paragraphs |

Radii: chamfer motif — plates use a **notched corner** (pseudo-element); buttons use
`border-radius: 6px` + chamfer shadow. No pills, no full circles. Motion: single
spring `cubic-bezier(.34,1.56,.64,1)` for presses; `cubic-bezier(.2,.7,.2,1)` for
fades. `prefers-reduced-motion` honored (demos degrade to fade).

## 2. Component language (new, replaces Nothing)

- **Ignite button** (primary): ember fill, knocks down 2px on press with inset shadow,
  corner notch. Used for the ONE primary action per screen (e.g. START SESSION).
- **Forge button** (secondary): outline + notch, fills 12% ember-dim on press.
- **Ghost button**: text + underline tick that draws on hover.
- **Nav dock**: floating bottom rail, 5 destinations; **Focus is the raised center
  "ignite" puck** — it glows when a session is running and becomes the timer chip.
- **Switchboard toggle**: mechanical slider with an audible-feed (visual) knock.
- **Wick gauge** (replaces seg bars/rings): horizontal filament that burns left→right;
  ember head glows at the leading edge; 100% = ignition flash.
- **Plates** (replaces cards): chamfered panels; content sits on the plate, no padding
  explosions — one plate = one unit of information.
- **Ticker strip** (Plan): horizontal day rail; today's chip is hot.
- **Ember field** (Progress): the old heatmap grid — cells are embers; hotter = brighter,
  current streak = pulsing head.

## 3. No redundant placements

- One global top strip: mark · date · streak chip · sync + theme. Never repeated per tab.
- One dock. Timer lives ONLY in Focus (full-screen wick) and as the dock puck's glow —
  never a second floating timer.
- Celebration system is ONE overlay engine (spark/stamp/ignition) shared by all triggers.
- Progress shows metrics that exist; empty states (e.g. session quality with no ratings)
  render as a stamped "awaiting data" plate instead of empty skeletons.

## 4. Motion + celebration rituals (the "wonder")

1. **Task complete** — stamp-in checkbox (press + knock) and a **spark**: 5–9 ember
   particles fly along the session's filament. >50% of day: the hero thread visibly burns.
2. **Session complete** — wick burns to the end, **shockwave** runs along the full-width
   thread, session plate flashes ember-dim, dock puck glows.
3. **Day complete (100%)** — **IGNITION**: full-screen warm bloom, filament sweeps
   across the screen, the day's percentage blooms into a giant numeral, ember glyphs
   drift upward. ~1.4s, skippable.
4. **Achievement unlocked** — **stamp ceremony**: engraved plate slides in, knocks,
   corner folds, glyph engraving draws in, glows ember for 2s. Stacked queue.
5. **Streak milestones** — filament runs hotter every 5 days (5·10·25·50·100…); tick
   marks ignite along the hero thread; pulse ring-pulse replaced by a **burn pulse**.
6. **Rest day** — steel-blue cooldown wash over the day, "cooldown" stamp, no red.
7. **Sound** — existing Brown/Pink/528 engine stays; celebration knocks are short
   WebAudio blips (soft thock), respecting existing mute state.

## 5. Screen map (features → placement, unchanged feature set)

- **Today**: hero thread (day %), session plates with embedded task rows + sparking
  checkboxes, banked-rest chip, next-slot chip. (TopDeck features merged into top strip
  + hero — removed as separate deck.)
- **Plan**: ticker strip (day jump, TODAY hot), selected day plate (badge, % thread),
  session plates (expand/collapse, tasks), prev/next forge buttons.
- **Focus**: full-screen wick (work/break with ember head), phase chips, controls
  (pause/skip/loop), cell duration steppers, sound mode segmented control, distraction
  log toggle. ESC closes. Fullscreen-only — no duplicate dock timer.
- **Progress**: thread gauges (overall, week), ember field (35 days), streak plate,
  achievements as engraved plates (30, locked = cold notches), habits stamp row (28-day),
  subjects plate, session quality plate (empty-state stamp until data exists).
- **You**: profile plate, mock toggle + mock plates, switchboard (freeze, sound, haptics,
  backup/restore), about/version, celebration-lab demo triggers.

## 6. Implementation notes (when approved)

- Storage keys, AppState, pomodoro engine, achievements logic, schedule: **untouched**.
- Replace `--*` token block in CSS + swap components; reuse existing hooks/state;
  new `celebrations.ts` engine (spark/stamp/ignition + WebAudio blips).
- Android WebView: same contract; add `pointerdown` unlock as now.
- Fallback fonts ensure parity offline; webfont (Space Grotesk + a mono) optional later.
