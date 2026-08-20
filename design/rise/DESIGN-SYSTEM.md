# RISE — Design System (tokens, components, states, motion)

## 1. Tokens (CSS custom properties)

```css
--night:#0B0E1A;      --night-2:#111527;   --card:rgba(255,255,255,.05);
--card-2:rgba(255,255,255,.08); --line:rgba(255,255,255,.09); --line-2:rgba(255,255,255,.18);
--ink:#F2F0EA;        --mute:#9BA3C0;      --faint:#5A6280;
--sun-1:#FFD27A;      --sun-2:#FF9D5C;     --sun-3:#FF6B5E;   /* sunrise gradient */
--ok:#4ADE80;         --info:#7CB8FF;      --fire-1:#FFC857;  --fire-2:#FF6B5E;
--danger:#FF5A5F;     --violet:#8B7BFF;
--r-lg:20px; --r-md:16px; --r-sm:12px;
--ease:cubic-bezier(.2,.7,.2,1); --spring:cubic-bezier(.34,1.56,.64,1);
--shadow-1:0 1px 2px rgba(4,6,14,.4); --shadow-2:0 8px 30px rgba(4,6,14,.45);
--shadow-sun:0 10px 34px -8px rgba(255,140,92,.45);
```

## 2. Components

| Component | Spec |
|---|---|
| Primary button | Sunrise gradient, ink-white text, radius 16, shadow-sun, press scale .96, min height 52 |
| Ghost button | Hairline border, muted ink, hover → white ink + sun border |
| Danger button | `#FF5A5F` fill, white, only destructive |
| Nav bar | Glass (`rgba(17,21,39,.85)` + blur 20), radius 22, 5 slots; center = Focus orb (54px raised, gradient, glow ring while running) |
| Card | `--card` glass + 1px `--line`, radius 18, top-edge highlight, padding 16–18 |
| Progress bar | Gradient `sun-1→sun-3`, radius 99, glow head dot; fill 700ms ease-out |
| Day numeral | 44–72px, weight 700, tracking -0.02em, gradient text `sun-1→sun-2` |
| Timer | 88–128px tabular; halo `radial-gradient(sun, 25% alpha)` behind |
| Badges | Radius 99 pills; semantic: hot (sun border + dim fill), cool (info), ok (success) |
| Checkbox | 24px rounded 8; check stroke draws in 200ms; done = gradient fill + glow |
| Switch | 46×26 pill, gradient knob when on |
| Trophies | 44px rounded 12 tiles; unlocked = gradient rim + glow; locked = 45% opacity + silhouette |
| Empty state | Illustration-free: gradient orb + one sentence + one ghost action |

## 3. States (all designed)

- **First run** → "Good morning, Teja. Let's light the day." — one tap seeds the first session.
- **Empty day** → soft night orb, "No light yet today", ghost button → Plan.
- **Loading/sync** → card shimmer only, 600ms sweep.
- **Error** → info-blue wash, one line, inline Retry.
- **Rest day** → cool steel/blue wash, "Cooldown" badge, muted bell on open.
- **1-day vs 100-day streak** → fire meter + flame badge scale with streak; 100d = halo on Today header.
- **Reduced motion** → all rituals collapse to fades.

## 4. Celebration rituals (≤1.6s, skippable, sound-aware)

| Trigger | Ritual | Sound |
|---|---|---|
| Task done | check draws + 3 gold sparkles pop | thock (50ms) |
| Session done | card flash sunrise + ray sweep across screen | bell |
| Day 100% | **SUNRISE**: horizon bloom, orb rises to mid-screen, % numeral blooms | bloom chord |
| Achievement | badge card slides up, gradient ring draws, sparkle burst | gong |
| Streak milestone (5/10/25/50/100) | fire meter tips over + flame pops + haptic | flame crackle |

## 5. Layout

- Max width 640 (phone-first), tablet centers column with drawers; nav fixed bottom,
  content padded 96px bottom; 8pt grid; sections separated by 16/24/32 rhythm.
- Landscape tablet: nav becomes left rail (same component, rotated) — placements
  adapt, nothing lost.