# ESE2027 Study OS — Code & Repo Review

**Date:** 2026-08-05 · **Stack:** Vanilla-JS PWA (no framework) · **Host:** Vercel static + Supabase (optional cloud sync)
**Files:** `js/app.js` 143 KB (~2,550 lines) · `js/data.js` 67 KB · `css/app.css` 90 KB · `index.html` 5.5 KB · `sw.js`

---

## 🔴 Critical — fixed in this review

### 1. Service worker precache silently failed — offline support never worked
`sw.js` listed `./icon.png` in `APP_SHELL`, but that file **does not exist** (icons live in `icons/`). `cache.addAll()` rejects **atomically** — one 404 aborts the entire install, so every install failed, nothing was precached, and each launch did a fresh network load. This is likely a large part of why "reopen twice" was needed every time.

**Fix applied:** removed the dead entry and switched to per-asset `cache.add(url).catch(()=>{})` so a single 404 can no longer kill the whole precache.

### 2. Dead Web Push handler in the service worker
The VAPID/push-subscription stack was removed, but the `push` event listener remained in `sw.js`. **Fix applied:** removed it. `notificationclick` stays — the app still shows foreground notifications via `reg.showNotification()`.

---

## 🟠 High

### 3. Repo is 99% tool junk — no `.gitignore` existed
- **2,671 tracked files; ~2,649 are AI/IDE tool directories** (`.agents`, `.cursor`, `.roo`, `.qoder`, `.freebuff`, `.github/prompts`, `.idea`, `.windsurf`, … 20+ of them).
- `.freebuff/` alone is **20 MB of SQLite database binaries** (`.db`, `.db-wal`, `.db-shm`) committed to git.
- `scratch/nothing-design-repo/` (a cloned repo) is also tracked.
- **Impact:** every clone/download pulls tens of MB of editor cache; Vercel build includes it; binary DBs churn the repo.

**Fix applied:** created `.gitignore` covering all tool dirs, scratch, one-off mockups, node, OS junk.
**Action needed (you push):**
```bash
git rm -r --cached .agents .augment .claude .codebuddy .codewhale .continue .cursor .factory .freebuff .gemini .github .idea .kilocode .kiro .opencode .qoder .roo .trae .warp .windsurf .21st scratch
git rm --cached prototype.html splash-preview.html today-nothing-preview.html today-redesign-preview.html
git add .gitignore && git commit -m "chore: prune tool dirs + binaries, add gitignore" && git push
```
(If you'd rather keep the preview HTML files, drop that second line.)

### 4. Supabase RLS is unverified — `user_progress` has no DDL in the repo
The app writes progress to a `user_progress` table via `upsert({user_id, data, updated_at})`. The only table in `supabase/setup.sql` is `push_subs` (now-dead web-push infra). If `user_progress` was created in the dashboard without RLS, **any signed-in user could read or overwrite anyone's row**. The anon key in `js/app.js` is public by design — RLS is the only guard. **Action:** verify in the Supabase dashboard, or run:
```sql
create table if not exists user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz default now()
);
alter table user_progress enable row level security;
create policy "own row select" on user_progress for select using (auth.uid() = user_id);
create policy "own row insert" on user_progress for insert with check (auth.uid() = user_id);
create policy "own row update" on user_progress for update using (auth.uid() = user_id);
```

### 5. Fullscreen Focus overlay (`#focusOverlay`) is the last non-Nothing screen
Tapping the docked timer, the Today hero "Enter Focus Space", or the drawer's Full Screen button opens a fullscreen timer that **still uses a circular breathing SVG ring + dashed glow halo** — the only ring left in the app, contradicting the "segmented bars, not rings" language. It also has `✕` and gear glyphs and old button styling. The flip clock (clock mode) was just ported; this one wasn't.
**Recommendation:** port to Nothing — dot-matrix Doto numerals + a 24-cell `.nt-seg` bar replacing the ring, monochrome controls. Small, contained change.

### 6. `supabase/setup.sql` describes removed infrastructure
It still creates `push_subs`, enables `pg_cron`/`pg_net`, and schedules 5 `slot-push` Edge Function calls — all for the removed web-push feature. Replace it with the `user_progress` DDL above so the repo reflects reality.

---

## 🟡 Medium

### 7. Old-style modals survive the redesign
- **Cloud sync form** (You → Cloud sync) uses `font-family: Inter, Outfit` — **fonts that are never loaded** — plus a 24px rounded card. Jarring inside the Nothing UI.
- **Strict-mode guide sheets** (`guideSheet`, block-guide steps) use round 50% badges and `border-radius:12px` cards.
- Install helper falls back to raw `alert()`.

### 8. Emoji/glyph leaks from the sweep
`💾` backup toast, `🎉` app-installed toast, `🚨` focus-broken notification, `📈` week-review notification, `⬇` install row, `😞😕😐🙂🔥` rating buttons, `✕`/gear in the focus overlay. Inconsistent with the monochrome + one-red-accent language (the rating faces may be a deliberate choice — your call).

### 9. `vercel.json` — harden JS/CSS caching
Add `no-cache` for `/js/(.*)` and `/css/(.*)` so a browser HTTP cache can never hand the service worker a stale `app.js` right after a deploy (belt-and-braces on top of the SW version bump):
```json
{ "source": "/js/(.*)", "headers": [ { "key": "Cache-Control", "value": "no-cache" } ] },
{ "source": "/css/(.*)", "headers": [ { "key": "Cache-Control", "value": "no-cache" } ] }
```

---

## 🟢 Low / polish

- **Google Fonts is heavy:** 5 families loaded (Doto 400–900, Space Grotesk 500–700, Space Mono 400/700, Plus Jakarta 400–800, JetBrains 500–800). Only Doto / Space Grotesk / Space Mono are actually needed; the other two are fallbacks that still download. Trimming saves real first-paint bytes.
- **Stale docs:** `package.json` still says "packaged via PWA Builder" (Android/Electron packaging was dropped); `.well-known/assetlinks.json` is the TWA config for that dropped Android build — harmless but dead.
- **Dead CSS (small):** `.card-glass`, `.fire-text`, `.ice-text`, `.heat-cell` rules remain with no JS references (the hex-grid/achievement classes were already removed — only leftovers in the reduced-motion media query, harmless). ~15 lines, cosmetic cleanup only.

---

## ✅ Verified sound

- All files referenced by `index.html`, `manifest.json`, and `sw.js` exist (after the `icon.png` fix).
- `node --check` passes on `app.js` and `sw.js`; CSS braces balanced (685/685).
- **PWA plumbing:** manifest (icons, shortcuts, maskable), hash routing with old-route migration (`home→today`, `stats→progress`, `settings→you`), `beforeinstallprompt`, theme-color meta, install flows — all correct.
- **Service worker logic:** Supabase bypassed (network), same-origin stale-while-revalidate with background refresh, cross-origin cache-first with opaque handling, `skipWaiting` + cache cleanup, `Service-Worker-Allowed: /` header — correct.
- **Data safety:** all `localStorage` access wrapped in `try/catch`; timer minutes banked on `pagehide`/`visibilitychange`; wake-lock released; strict-mode distraction logging intact.
- **No dead JS:** every declared function is called (`renderQuiet`, `cycleTheme`, `guideSheet`, `computeSessionStreak`, etc.).
- **Nothing rollout complete:** all 5 tabs, celebrations, splash, and now the flip clock + rating-visualization card. All 30 achievements preserved; `buildAchievements()` shared between Progress and You.
- **Session-quality card** (ratings → dot-matrix equalizer + correlation insight) renders data that was previously written and never shown.

---

## Suggested next steps (priority order)
1. Run the `git rm --cached` cleanup + push (frees the repo; also deploys the sw.js fix).
2. Verify / apply `user_progress` RLS in Supabase.
3. Port `#focusOverlay` to Nothing (last ring).
4. Tighten `vercel.json` (JS/CSS no-cache).
5. Cosmetic pass: stale modal styling + emoji leaks + font trim.

Versions bumped to **v50** in `js/app.js` and `sw.js` for the service-worker fixes.
