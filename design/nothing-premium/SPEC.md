# NOTHING PREMIUM — Craft-layer elevation spec (no design change)

The Nothing system is untouched: same tokens (`tokens.css` ember default), same layout,
same screens, same components. This spec only elevates the **craft layer** — press
physics, celebration rituals, micro-interactions, states — while staying strictly inside
the Nothing grammar (hairlines, dot-matrix, red signal, mono labels, 24-seg bars).

---

## 1. Button language (new physics, same shapes)

| Variant | Resting (unchanged) | Hover (new) | Press (new) | Focus (new) |
|---|---|---|---|---|
| `.btn-acc` (primary) | red fill, white mono label | `--acc-2` mix 4% + 1px red ring `rgba(215,25,33,.35)` | scale .97 + **inner shadow** `inset 0 1.5px 3px rgba(0,0,0,.45)` (real depth, not opacity) + label nudges 1px down | 2px offset ring `var(--acc)` |
| `.btn-ghost` | hairline `--border`, ink-2 label | border → `--border-2`, label → ink | `--acc-dim` 40% fill + scale .98 | 1px ring `--border-2` |
| `.btn-icon` (44px) | hairline square | border-2 | **corner ticks converge** (2 corner lines animate to center, 140ms) + scale .96 | ring |
| Nav rail button | dot indicator dim | dot 50% + label ink-2 | **dot lights** (acc) with 160ms spring | — |
| Hold button | unchanged | — | hold fill = **LED segment cascade** (5 segments light as hold progresses) | — |

Rules: press response ≤150ms; no layout shift (transform only); disabled = 38% + no
shadow; touch target ≥44px.

## 2. Celebration rituals (all ≤2s, skippable, mute-aware)

| Trigger | Ritual (Nothing grammar, no confetti) | Duration |
|---|---|---|
| **Task complete** | 5×5 **dot-matrix check** draws into the checkbox (LED pixels, 180ms) + 200ms red **tick line** sweeps the row edge + soft thock | 0.5s |
| **Session complete** | 24-seg bar for the session **cascades** (segments light L→R, 40ms each) + one full-width **signal line** pulses bottom→top (Nothing's LED notification language) + bell | 1.0s |
| **Pomodoro complete** | flip-clock digits **flash red once** (bg→acc inverse, 220ms) + signal line + bell | 0.8s |
| **Streak milestone (5/10/25/50/100)** | streak numeral **stamps** (1→1.16→1, hard spring 500ms) + 24-seg fire bar cascade + haptic burst | 1.2s |
| **Achievement unlock (30)** | **LED stamp ceremony**: plate rises from bottom, achievement title types in via Ndot rows (LED rows light top→bottom), red corner tick flashes, plate holds 1.6s, recedes | 2.0s |
| **Day complete (100%)** | **FULL SIGNAL**: vertical LED cascade across screen (dot columns light), day % blooms in Ndot (up to 96px), red signal line sweeps, settles | 1.8s |
| **Rest day** | cool steel wash + mono "cooldown" stamp, no red, muted bell | — |

Sound palette (WebAudio, all short, respect mute): `thock` 90ms / `bell` 500ms /
`flash` 300ms / `stamp` 250ms. Existing Brown/Pink/528Hz engine untouched.

## 3. Micro-interactions

- Card press: 120ms scale .995 + border → border-2 (no layout shift).
- Tab switch: content rise 8px/fade 240ms `--spring`; nav dot travels with spring.
- Sticky headers: hairline top border fades in when stuck (no jumps).
- List enter: rows stagger 30ms, rise 10px, `--ease`.
- All honors `prefers-reduced-motion` (rituals degrade to 150ms fades).
- All celebrations gate on the existing mute/audio state.

## 4. States (designed, Nothing grammar)

- First run: mono whisper "strike the first signal" + one red dot pulse on the start button.
- Empty: hairline "no signal today" + ghost action to Plan.
- Loading/sync: dot-matrix shimmer (3 dots blink) in place of the old spinner block.
- Error: red signal line + mono line + inline retry.
- 100-day streak: streak numeral rendered with red LED glow (1px text-shadow, subtle).

## 5. Delivery

- Interactive proof: `premium-prototype.html` (real tokens, ember suit).
- Implementation: 4 new CSS layers (press states, rituals, micro-motion, states) +
  one `celebrations.ts` (existing engine gets ritual classes; sounds via existing
  WebAudio util). No token changes, no layout changes.