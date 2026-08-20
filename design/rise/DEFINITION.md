# RISE — Product & UX Definition (ESE2027 Study OS)

Follows the brief: define features → demographics → UI/UX → color/type/visuals → mockups.

---

## 1. Core features & functionality (frozen inventory, re-organized by user job)

| # | User job | Feature | Screen |
|---|---|---|---|
| 1 | "What do I do today?" | Today's plan, daily targets, % progress | Today |
| 2 | "Plan the week" | Task planning, session list, rest-day banking | Plan |
| 3 | "Go deep, uninterrupted" | Pomodoro + ambient sound (Brown/Pink/528Hz), strict mode + distraction log, fullscreen overlay | Focus |
| 4 | "Am I improving?" | Streaks, stats, daily heatmap, subject bars, session quality | Progress |
| 5 | "Reward me" | 30 achievements, streak milestones, celebrations | Progress / global |
| 6 | "Make it mine" | Profile, settings, Supabase sync, mocks | You |
| 7 | "Keep the habit" | Habit ritual checklist, evening quality rating | Today |

## 2. Target demographics & preferences

- **Primary persona — Teja (the only user):** 20s, Indian engineering aspirant, ESE 2027
  (GATE-style), electrical discipline. Studies in 2–3 blocks/day (6:30–12:00, evening
  pyq sets), tablet-first (Samsung SM-T220, Android 13) with phone check-ins.
- Preferences that shape design:
  - **Motivation** (not data): wants to *feel* progress daily — celebrations must be
    earned and visible, not clinical.
  - **Speed**: under 2 taps to start a focus session; glanceable stats in 3 seconds.
  - **Evening/night usage**: dark-first, low-glare, comfortable at 11 PM.
  - **Premium feel**: believes serious tools look expensive. "If it looks cheap,
    I won't trust it" → craft in every state.
  - **Zero clutter**: one job per screen; no settings burying the daily ritual.
- Secondary persona (future): a friend who borrows the app — needs self-explanatory
  nav, no learned shortcuts. → All labels visible; icons always paired with text.

## 3. Usage contexts

| Context | Time | Device | Need |
|---|---|---|---|
| Morning desk session | 6:30 AM | Tablet landscape | Quick glance at plan → start focus |
| Midday phone check | 1 PM | Phone | "Am I on pace?" — % + streak, 3s |
| Evening pyq block | 7 PM | Tablet | Deep focus, sounds, strict mode |
| Night wind-down | 10:30 PM | Phone | Habit ritual + evening rating (closing ritual) |

## 4. UX principles (decided, with rationale)

1. **One primary action per screen.** Rationale: reduces decision fatigue before a
   study block. (Rejected: multi-CTA screens from earlier drafts.)
2. **Start is always visible.** The focus orb sits at nav center — the single most
   important action in the app, physically impossible to miss. (Rejected: hidden
   contextual start buttons — user brief demands ease of navigation.)
3. **Progress is warmth.** Completion is rendered as light/heat, not bars.
4. **Celebrate loudly, briefly.** ≤1.6s rituals, skippable, sound on/off aware.
5. **Every state designed.** First-run, empty, loading, error, 1-day vs 100-day streak,
   rest day — no default browser or blank states.
6. **Touch-first**: all targets ≥44px, thumb-zone friendly, swipeable where sensible.

## 5. Visual identity — RISE

- **Metaphor:** the exam campaign is a walk toward a sunrise. Night sky = current
  effort; sunrise gradient = progress; the exam day is the full dawn.
- **Color system (semantic, not decorative):**
  - Night base: `#0B0E1A` (deep indigo — softer than pure black, tablet-friendly)
  - Surfaces: glass `rgba(255,255,255,.05)` on `#111527`, hairline `rgba(255,255,255,.09)`
  - **Sunrise gradient** (THE identity): `#FFD27A → #FF9D5C → #FF6B5E` — used for
    primary buttons, progress, the focus orb, celebrations
  - Success `#4ADE80` · Info `#7CB8FF` · Streak fire `#FFC857 → #FF6B5E`
  - Danger `#FF5A5F` — only for destructive
- **Typography:** Inter-class sans (Segoe UI stack offline); numerals bold + tabular
  + tight tracking; labels mono 9–10px wide-tracked. Two sizes dominate: the day
  numeral (huge, gradient) and the time in Focus (biggest element on screen).
- **Shape language:** 18–20px radii, soft dual-layer shadows, glass + top highlight.
  No sharp corners, no chamfers — friendly, consumer-grade.
- **Iconography:** one inline-SVG family (1.5–1.75px stroke), always paired with text.
  No emoji as structural icons (ui-ux-pro-max rule).
- **Motion:** springy press (scale .96, 150ms), entrance stagger (250–450ms, back-out),
  fills ease-out 700ms. Celebrations: pop → burst → settle. Reduced-motion respected.

## 6. Interactive & user-centric elements

- **Time-aware greeting** ("Good evening, Teja") — the app responds to when you live.
- **Smart nudge** ("2 rest days banked — tonight's your cooldown") inline on Today.
- **Focus orb** with live ring — visible progress without opening Focus.
- **Haptic ticks** on tablet (Android vibration on task/streak actions) — settings-gated.
- **Sound moments** — brown/pink/528Hz ambient; completion chimes (thock/bell/bloom).
- **Closing ritual** — evening quality stars; streak is protected by freeze toggle.

## 7. Deliverables
- `design/rise/DESIGN-SYSTEM.md` — tokens, components, states
- `design/rise/rise-prototype.html` — full interactive mockup (all 5 screens)
- PNG screenshots for quick review (design/rise/shot-*.png)