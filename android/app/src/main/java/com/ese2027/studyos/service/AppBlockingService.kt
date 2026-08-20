package com.ese2027.studyos.service

import android.accessibilityservice.AccessibilityService
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.ese2027.studyos.data.local.AppDatabase
import com.ese2027.studyos.data.local.BlockedApp
import com.ese2027.studyos.util.BlockingPrefs
import com.ese2027.studyos.util.UsageStatsHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

/**
 * Blocking engine — one accessibility service drives every shield, and it is
 * designed to behave like a real productivity blocker (Regain / StayFree /
 * AppBlock), not a focus-session toy. Three lessons learned the hard way are
 * baked in here:
 *
 *  1. ENFORCE ALWAYS, NOT ONLY DURING A FOCUS SESSION. A daily limit means the
 *     app locks after N minutes today, session or not. Strict locks and the
 *     shorts block hold 24/7. Focus mode and Schedule windows are *additional*
 *     time-boxed shields layered on top (they can block otherwise-open apps),
 *     never a gate the always-on rules must pass through. See [decide].
 *
 *  2. EVICT, DON'T JUST COVER. Block screens are own-task Activities
 *     (Regain architecture): launching one brings the offending app to the
 *     background, and the 1-second poll re-locks it if the user escapes via
 *     Back. In split-screen a fullscreen activity can't cover the app, so we
 *     evict with `performGlobalAction(HOME)` instead. The shorts block is
 *     *soft*: it performs BACK (leave the Shorts surface, stay in the app)
 *     and shows a dismissable screen with a 60s grace.
 *
 *  3. DON'T TRUST THE EVENT STREAM ALONE. Accessibility events are dropped when
 *     the system throttles or floods them (Shorts opens with no window-state
 *     event; Home sometimes arrives before content is laid out). A 1-second
 *     [pollRunnable] backstop re-derives the true foreground package from
 *     UsageStatsManager.queryEvents and re-runs the same [decide] logic, so a
 *     missed event never means a missed block.
 *
 *  Website blocking stays event-driven URL sniffing (browsers expose the
 *  address bar in the a11y tree; no VPN). Spent-time comes from
 *  UsageStatsManager and is persisted to Room so the web UI agrees.
 */
class AppBlockingService : AccessibilityService() {

    companion object {
        @Volatile
        var isServiceRunning: Boolean = false
            private set

        private const val TAG = "AppBlockingService"
        private const val RE_SHOW_DEBOUNCE_MS = 1500L
        private const val USAGE_REFRESH_MS = 60_000L
        private const val POLL_INTERVAL_MS = 1000L
        private const val SHORTS_MARKER = "shorts"
        private const val REELS_MARKER = "reels"
        private const val SHORTS_SNIFF_DEBOUNCE_MS = 1200L
        private const val SHORTS_GRACE_MS = 60_000L
        private const val LIMIT_OPEN_GRACE_MS = 5 * 60_000L
        private const val SNIFF_DEBOUNCE_MS = 1200L

        /** Home / launcher packages we must never lock (avoids eviction loops). */
        private val LAUNCHER_PACKAGES = setOf(
            "com.sec.android.app.launcher", "com.google.android.apps.nexuslauncher",
            "com.android.launcher", "com.android.launcher3", "com.miui.home",
            "com.microsoft.launcher", "com.teslacoilsw.launcher"
        )

        /** Browser packages whose address bar can be read from the a11y tree. */
        private val BROWSER_PACKAGES = setOf(
            "com.android.chrome", "com.chrome.beta", "org.chromium.chrome",
            "com.sec.android.app.sbrowser", "org.mozilla.firefox", "com.microsoft.emmx",
            "com.opera.browser", "com.brave.browser", "com.duckduckgo.mobile.android",
            "com.android.browser", "com.yandex.browser", "com.vivaldi.browser",
            "com.kiwibrowser.browser", "com.opera.mini.native", "com.UCMobile.intl"
        )

        /** Per-browser address-bar view ids (falls back to text scanning). */
        private val URL_VIEW_IDS = mapOf(
            "com.android.chrome" to listOf("com.android.chrome:id/url_bar"),
            "com.chrome.beta" to listOf("com.chrome.beta:id/url_bar"),
            "org.chromium.chrome" to listOf("org.chromium.chrome:id/url_bar"),
            "com.sec.android.app.sbrowser" to listOf("com.sec.android.app.sbrowser:id/location_bar_edit_text"),
            "org.mozilla.firefox" to listOf("org.mozilla.firefox:id/url_bar"),
            "com.microsoft.emmx" to listOf("com.microsoft.emmx:id/url_bar"),
            "com.brave.browser" to listOf("com.brave.browser:id/url_bar"),
            "com.opera.browser" to listOf("com.opera.browser:id/url_field"),
            "com.duckduckgo.mobile.android" to listOf("com.duckduckgo.mobile.android:id/omnibarInput")
        )

        /** Schedule window: day-of-week (0=Sun..6=Sat), start/end in minutes-of-day. */
        data class SchedWindow(val dow: Int, val startMin: Int, val endMin: Int)

        /** (Re)loads the Schedule Blocking config pushed by the web (bridge calls this). */
        fun refreshScheduleConfig(context: android.content.Context) {
            val windows = mutableListOf<SchedWindow>()
            runCatching {
                val arr = JSONArray(BlockingPrefs.getScheduleWindowsJson(context))
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    windows.add(
                        SchedWindow(o.optInt("dow", -1), o.optInt("start", -1), o.optInt("end", -1))
                    )
                }
            }
            val apps = LinkedHashMap<String, String>()
            runCatching {
                val arr = JSONArray(BlockingPrefs.getScheduleAppsJson(context))
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    apps[o.optString("packageName")] = o.optString("appName", o.optString("packageName"))
                }
            }
            scheduleEnabled = BlockingPrefs.isScheduleEnabled(context)
            scheduleApps = apps
            scheduleWindows = windows.filter { it.dow in 0..6 && it.startMin >= 0 && it.endMin > it.startMin }
            Log.i(TAG, "Schedule config: enabled=$scheduleEnabled apps=${scheduleApps.size} windows=${scheduleWindows.size}")
        }

        @Volatile var scheduleEnabled: Boolean = false
            private set
        @Volatile var scheduleApps: Map<String, String> = emptyMap()
            private set
        @Volatile var scheduleWindows: List<SchedWindow> = emptyList()
            private set

        /** Soft-dismiss bookkeeping for the shorts overlay (grace per package). */
        @Volatile var lastShortsDismissPkg: String? = null
            private set
        @Volatile var lastShortsDismissAt: Long = 0L
        @Volatile var lastShortsDismissGraceMs: Long = 60_000L

            private set

        fun notifyShortsDismissed(pkg: String, graceMs: Long = 60_000L) {
            lastShortsDismissPkg = pkg
            lastShortsDismissAt = System.currentTimeMillis()
            lastShortsDismissGraceMs = graceMs
        }

        /** Open-anyway grace for daily-limit blocks (Regain's ignore-limit). */
        @Volatile var lastLimitOpenPkg: String? = null
            private set
        @Volatile var lastLimitOpenAt: Long = 0L
            private set
        @Volatile var lastLimitOpenGraceMs: Long = 5 * 60_000L
            private set

        fun notifyLimitOpen(pkg: String, graceMs: Long = 5 * 60_000L) {
            lastLimitOpenPkg = pkg
            lastLimitOpenAt = System.currentTimeMillis()
            lastLimitOpenGraceMs = graceMs
        }

        /** True while a block screen (hard or shorts) is on top. */
        @Volatile var blockScreenOpen: Boolean = false

        /** Set by block screens when they finish; the poll skips re-locking for
         *  a moment so the transition never flickers. */
        @Volatile var lastBlockScreenClosedAt: Long = 0L
            private set

        fun notifyBlockScreenClosed() {
            lastBlockScreenClosedAt = System.currentTimeMillis()
        }
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    @Volatile private var blockedApps: Map<String, BlockedApp> = emptyMap()
    @Volatile private var blockedDomains: Set<String> = emptySet()
    @Volatile private var usageGranted = false
    @Volatile private var lastUsageRefresh = 0L
    private var lastBlockedPackage: String? = null
    private var lastBlockTime = 0L
    private var lastSniffedDomain = ""
    private var lastSniffTime = 0L
    private var lastShowTime = 0L
    private var lastShortsSniffTime = 0L
    private var lastShortsDetected = false
    private var currentShortsApp: String? = null
    private var shortsScrollCount = 0

    /** Fresh per-package today-usage from UsageStatsManager (Regain's
     *  usageStateCache); refreshed on foreground change, throttled 60s. */
    @Volatile private var freshSpent: Map<String, Long> = emptyMap()

    /** Highest event timestamp already processed — Regain's processedTimeStamp
     *  dedupe: the poll only reacts to events newer than this. */
    @Volatile private var lastProcessedEventTs = 0L

    /** Deferred re-lock: the guard after a block-screen close skips one
     *  evaluation — but that evaluation consumed the only fresh foreground
     *  event, so without this the anti-escape would never re-trigger. */
    @Volatile private var pendingReLockPkg: String? = null
    @Volatile private var pendingReLockAt = 0L

    /** Per-package floating-window (PIP/mini-player) close attempts. */
    private val floatingWindowCloseAttempts = HashMap<String, Int>()
    private val maxFloatingWindowCloseAttempts = 3
    private var lastFloatingWindowCheckAt = 0L

    /** YouTube mini-player view ids (Regain's floaty window ids). */
    private val youtubeMiniPlayerViewIds = listOf(
        "com.google.android.youtube:id/floaty_bar_controls_view",
        "com.google.android.youtube:id/floaty_close_button",
        "com.google.android.youtube:id/floaty_play_pause_button",
        "com.google.android.youtube:id/modern_miniplayer_close"
    )

    /** Package currently in the foreground per the poll/event stream. */
    @Volatile private var foregroundPackage: String = ""

    private val mainHandler = Handler(Looper.getMainLooper())

    /**
     * 1-second backstop. Re-derives the true foreground package from
     * UsageStatsManager (authoritative even when a11y events are dropped) and
     * re-runs [decide] on it. This is what makes limit/strict/shorts blocking
     * reliable — the event stream alone misses transitions.
     */
    private val pollRunnable = object : Runnable {
        override fun run() {
            try {
                val fgEvent = latestForegroundEvent()
                if (fgEvent == null) {
                    // No a11y events in the window (static page, screen off).
                    // Seed the foreground from the active window so per-tick
                    // evaluation still has a target — event-free surfaces are
                    // exactly the ones a rule could silently miss.
                    val activeRoot = rootInActiveWindow
                    val activePkg = activeRoot?.packageName?.toString()
                    if (activePkg != null && activePkg != packageName && activePkg !in LAUNCHER_PACKAGES) {
                        foregroundPackage = activePkg
                    }
                } else {
                    val pkg = fgEvent.first
                    val ts = fgEvent.second
                    if (ts > lastProcessedEventTs) {
                        lastProcessedEventTs = ts
                        if (pkg != foregroundPackage) {
                            foregroundPackage = pkg
                            onForegroundChanged(pkg)
                        }
                    }
                }
                // Decide every tick on the current foreground (Regain's
                // checkAndOpenOverlay cadence) — also when the event window is
                // empty (static page with no transitions), so time-based rules
                // (grace expiry, schedule window start/end, strict deadline)
                // and surface detection still fire.
                val fg = foregroundPackage
                if (fg.isNotEmpty() && fg != packageName && fg !in LAUNCHER_PACKAGES) {
                    evaluate(fg, event = null)
                }
                // Deferred re-lock (see [pendingReLockPkg]): re-evaluate once the
                // post-block-screen guard expires — but only if the user is still
                // on the offending app (Home or another app cancels it).
                pendingReLockPkg?.let { pkg ->
                    val now2 = System.currentTimeMillis()
                    when {
                        pkg != foregroundPackage -> {
                            pendingReLockPkg = null
                            Log.d(TAG, "pending re-lock dropped ($pkg — no longer foreground)")
                        }
                        now2 >= pendingReLockAt -> {
                            pendingReLockPkg = null
                            Log.d(TAG, "pending re-lock firing for $pkg")
                            evaluate(pkg, event = null)
                        }
                        else -> Unit
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "poll failed: ${e.message}")
            } finally {
                mainHandler.postDelayed(this, POLL_INTERVAL_MS)
            }
        }
    }

    /** Latest foreground event (package + event timestamp) within the last 60s —
     *  Regain's exact window (dg.a1: queryEvents(now-60000, now)) and its
     *  processedTimeStamp dedupe. Returns null when no event is newer than the
     *  window start (screen off / no transitions). */
    private fun latestForegroundEvent(): Pair<String, Long>? {
        if (!usageGranted) return null
        val usm = getSystemService(USAGE_STATS_SERVICE) as? UsageStatsManager ?: return null
        val now = System.currentTimeMillis()
        val events = usm.queryEvents(now - 60_000L, now)
        val e = UsageEvents.Event()
        var lastPkg: String? = null
        var lastTs = 0L
        while (events.hasNextEvent()) {
            events.getNextEvent(e)
            if (e.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND ||
                e.eventType == UsageEvents.Event.ACTIVITY_RESUMED
            ) {
                lastPkg = e.packageName
                lastTs = e.timeStamp
            }
        }
        return if (lastPkg != null) lastPkg to lastTs else null
    }

    /** Regain's checkAndUpdateRecentApp: refresh spent-time only when the
     *  foreground app changed, throttled to 60s (computeUsageExpiry). */
    private fun onForegroundChanged(pkg: String) {
        if (!usageGranted) return
        val now = System.currentTimeMillis()
        if (now - lastUsageRefresh < USAGE_REFRESH_MS) return
        lastUsageRefresh = now
        floatingWindowCloseAttempts.clear()
        scope.launch { refreshUsageOnce() }
    }

    private val globalActionReceiver = object : android.content.BroadcastReceiver() {
        override fun onReceive(context: android.content.Context, intent: android.content.Intent) {
            if (intent.action == "com.ese2027.studyos.ACTION_GLOBAL") {
                val action = intent.getIntExtra("action", 0)
                if (action > 0) performGlobalAction(action)
            }
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        try {
            registerReceiver(globalActionReceiver, android.content.IntentFilter("com.ese2027.studyos.ACTION_GLOBAL"), android.content.Context.RECEIVER_EXPORTED)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register global receiver: ${e.message}")
        }
        isServiceRunning = true
        usageGranted = UsageStatsHelper.isGranted(this)
        val database = AppDatabase.getInstance(this)
        refreshScheduleConfig(this)

        // Reactive blocklist from Room: adding/removing apps applies instantly.
        scope.launch {
            database.blockedAppDao().getEnabled(blockingUserId()).collect { apps ->
                blockedApps = apps.associateBy { it.packageName }
                Log.d(TAG, "Blocklist loaded (${blockedApps.size} apps): ${blockedApps.keys}")
            }
        }
        scope.launch {
            database.blockedWebsiteDao().getEnabled(blockingUserId()).collect { sites ->
                blockedDomains = sites.map { it.domain.lowercase() }.toSet()
                Log.d(TAG, "Domain list loaded (${blockedDomains.size}): $blockedDomains")
            }
        }

        // 1s backstop for dropped/flooded accessibility events.
        mainHandler.removeCallbacks(pollRunnable)
        mainHandler.postDelayed(pollRunnable, POLL_INTERVAL_MS)
    }

    private fun blockingUserId(): String =
        runCatching { com.ese2027.studyos.data.remote.SupabaseService.getInstance().getCurrentUserId() }
            .getOrNull() ?: "local_user"

    /** End-of-window epoch ms if [now] falls inside a schedule window; 0 otherwise. */
    private fun scheduleWindowEndMs(now: Long): Long {
        val cal = java.util.Calendar.getInstance()
        cal.timeInMillis = now
        val dow = cal.get(java.util.Calendar.DAY_OF_WEEK) - 1
        val mins = cal.get(java.util.Calendar.HOUR_OF_DAY) * 60 + cal.get(java.util.Calendar.MINUTE)
        for (w in scheduleWindows) {
            if (w.dow != dow || mins < w.startMin || mins >= w.endMin) continue
            cal.set(java.util.Calendar.HOUR_OF_DAY, w.endMin / 60)
            cal.set(java.util.Calendar.MINUTE, w.endMin % 60)
            cal.set(java.util.Calendar.SECOND, 0)
            cal.set(java.util.Calendar.MILLISECOND, 0)
            return cal.timeInMillis
        }
        return 0L
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        val packageName = event.packageName?.toString() ?: return
        if (packageName == this.packageName) return // never lock our own app

        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                // New activity/window: invalidate the cached shorts sniff so a
                // positive detection never leaks onto the next window (Home).
                lastShortsDetected = false
                lastShortsSniffTime = 0L
                // Track every window (launcher included) so deferred re-locks and
                // foreground-change bookkeeping stay truthful.
                foregroundPackage = packageName
                evaluate(packageName, event)
                checkWebsiteBlock(packageName, event)
                checkFloatingWindowProtection(packageName)
            }
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                if (packageName in BROWSER_PACKAGES) checkWebsiteBlock(packageName, event)
                else if (blockedApps[packageName]?.blockShortsOnly == true) {
                    // Shorts/Reels surfaces mutate in place (no window change) —
                    // re-check shorts-only apps on content changes too.
                    evaluate(packageName, event)
                }
                checkFloatingWindowProtection(packageName)
            }
            AccessibilityEvent.TYPE_VIEW_CLICKED,
            AccessibilityEvent.TYPE_VIEW_LONG_CLICKED,
            AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED -> {
                // User interacting with a window we tried to close — re-arm the
                // floating-window close counter (Regain's onAccessibilityEvent
                // reset-on-interaction).
                val attempts = floatingWindowCloseAttempts[packageName]
                if (attempts != null && attempts >= maxFloatingWindowCloseAttempts) {
                    floatingWindowCloseAttempts[packageName] = 0
                }
            }
        }
    }

    /* ────────────────────────── APP blocking ──────────────────────────
     * Single decision point. Called from both the accessibility event stream
     * and the 1s poll. [event] is null when invoked from the poll (no a11y
     * node tree for that tick — shorts detection then relies on its cache).
     */

    /** A blocking verdict for the current foreground package. */
    private sealed class Verdict {
        object Allow : Verdict()
        /** Hard block: evict to Home, then show the lock overlay. */
        data class Hard(val reason: String, val endTime: Long, val strictUntil: Long) : Verdict()
        /** Soft block (shorts): perform Back, then show the (dismissable) lock. */
        object Shorts : Verdict()
    }

    private fun evaluate(packageName: String, event: AccessibilityEvent?) {
        if (packageName == this.packageName || packageName in LAUNCHER_PACKAGES) return
        val now = System.currentTimeMillis()

        // Guards — Regain checks these before every block decision:
        //  • never stack a block screen on an already-open one
        //  • never re-lock immediately after the user left the block screen
        //    (the block activity finishing lands them in the app for one tick)
        //  • never interrupt typing (keyboard open)
        if (blockScreenOpen) return
        if (now - lastBlockScreenClosedAt < 1200L) {
            // The 1.2s guard consumed this evaluation (and, in the poll, its
            // event) — defer a single re-lock pass for when the guard expires.
            if (pendingReLockPkg != packageName) {
                pendingReLockPkg = packageName
                pendingReLockAt = lastBlockScreenClosedAt + 1200L
            }
            return
        }
        if (isKeyboardVisible()) return

        val verdict = decide(packageName, event, now)
        if (verdict is Verdict.Allow) return

        // Debounce repeated hits on the same package so we don't spam HOME/BACK.
        if (packageName == lastBlockedPackage && (now - lastBlockTime) < RE_SHOW_DEBOUNCE_MS) return
        lastBlockedPackage = packageName
        lastBlockTime = now

        when (verdict) {
            is Verdict.Shorts -> {
                Log.i(TAG, "Shorts block on $packageName -> Overlaid soft lock")
                lastShortsDetected = false
                lastShortsSniffTime = 0L
                launchShortsScreen(packageName)
            }
            is Verdict.Hard -> {
                // Regain checks split-screen before opening the block screen: a
                // fullscreen Activity would only cover half the screen in split
                // mode, so evict to Home instead and defer.
                if (isPartialWindow(packageName)) {
                    Log.i(TAG, "Split/mini-window detected — evicting $packageName (reason=${verdict.reason})")
                    performGlobalAction(GLOBAL_ACTION_HOME)
                    return
                }
                Log.i(TAG, "Hard block on $packageName (reason=${verdict.reason}) → block screen")
                launchBlockScreen(packageName, verdict.reason, verdict.endTime, verdict.strictUntil)
            }
            else -> {}
        }
    }

    /**
     * The full enforcement matrix. Order matters — the strongest, always-on
     * rules are evaluated first so they hold regardless of focus state:
     *
     *  1. strict lock (deadline in the future) → always hard-block
     *  2. daily limit reached today            → always hard-block ("limit")
     *  3. shorts toggle + on a Shorts surface  → always soft-block
     *  4. schedule window live for this app    → hard-block ("schedule")
     *  5. focus session / always-mode active   → hard-block ("binary")
     *
     * Anything not caught by 1–5 is allowed.
     */
    private fun decide(packageName: String, event: AccessibilityEvent?, now: Long): Verdict {
        val app = blockedApps[packageName]

        // 1 + 2 + 5: per-app rules (strict / limit / plain block).
        if (app != null && app.isEnabled) {
            val strictActive = (app.strictUntilTs ?: 0L) > now
            val strictUntil = if (strictActive) app.strictUntilTs!! else 0L
            val limit = app.dailyLimitMin ?: 0L
            val reached = limit > 0L && limitReached(app, limit)

            if (app.blockShortsOnly) {
                val isOnShorts = isShortsSurface(packageName, event)
                if (isOnShorts) {
                    if (currentShortsApp != packageName) {
                        currentShortsApp = packageName
                        shortsScrollCount = 0
                    }
                    if (event?.eventType == android.view.accessibility.AccessibilityEvent.TYPE_VIEW_SCROLLED ||
                        event?.eventType == android.view.accessibility.AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
                        // We count any layout changes or scrolls as interaction
                        shortsScrollCount++
                    }
                    // Wait for a few interactions (e.g. 5) to let the first short play and allow them to scroll away
                    val allowFirst = com.ese2027.studyos.util.BlockingPrefs.getAllowFirstShort(this@AppBlockingService, packageName)
                    val limit = if (allowFirst) 5 else 0
                    if (shortsScrollCount > limit && !inShortsGrace(packageName, now)) {
                        return Verdict.Shorts
                    }
                } else {
                    if (currentShortsApp == packageName) {
                        currentShortsApp = null
                        shortsScrollCount = 0
                    }
                }
            }
            if (limit > 0L) {
                if (reached) {
                    if (strictActive) {
                        return Verdict.Hard("strict", 0L, strictUntil)
                    } else {
                        if (inLimitOpenGrace(packageName, now)) return Verdict.Allow
                        return Verdict.Hard("limit", 0L, 0L)
                    }
                } else {
                    if (!inLimitOpenGrace(packageName, now)) {
                        val wantsReminders = com.ese2027.studyos.util.BlockingPrefs.getRemindersEnabled(this@AppBlockingService, packageName)
                        if (wantsReminders) {
                            return Verdict.Hard("reminder", 0L, if (strictActive) strictUntil else 0L)
                        } else {
                            return Verdict.Allow
                        }
                    }
                }
            }

            // (5) plain block while a focus session or always-mode is active.
            //     A limit==0 app with no shorts toggle is a binary block target.
            val binaryTarget = limit <= 0L && !app.blockShortsOnly
            if (binaryTarget && BlockingPrefs.isAppBlockingActive(this)) {
                return Verdict.Hard("binary", BlockingPrefs.getBlockedUntil(this), 0L)
            }
        }

        // 4: schedule window (applies to schedule-list apps regardless of the
        //    per-app blocklist above).
        if (scheduleEnabled && packageName in scheduleApps) {
            val windowEnd = scheduleWindowEndMs(now)
            if (windowEnd > 0L) return Verdict.Hard("schedule", windowEnd, 0L)
        }

        return Verdict.Allow
    }

    /** True when today's foreground time for [app] has reached its [limit]. */
    private fun limitReached(app: BlockedApp, limit: Long): Boolean {
        if (limit <= 0L) return false
        if (!usageGranted) return true // no usage access → enforce conservatively
        return spentMinutesNow(app.packageName) >= limit
    }

    /** Authoritative spent-today: the larger of Room's counter and the fresh
     *  UsageStatsManager query (cached 60s). Room alone can be stale; the query
     *  alone can undercount on coarse buckets — max() of both is the safest
     *  enforcement source, and matches the monotonic Room write below. */
    private fun spentMinutesNow(packageName: String): Long {
        val app = blockedApps[packageName]
        val room = if (app == null) 0L else {
            if (app.spentResetAt < todayMidnightMs()) 0L else app.spentTodayMin
        }
        val fresh = freshSpent[packageName] ?: 0L
        return maxOf(room, fresh)
    }

    private fun inShortsGrace(packageName: String, now: Long): Boolean =
        packageName == lastShortsDismissPkg && now - lastShortsDismissAt < lastShortsDismissGraceMs

    private fun inLimitOpenGrace(packageName: String, now: Long): Boolean =
        packageName == lastLimitOpenPkg && now - lastLimitOpenAt < lastLimitOpenGraceMs

    /** Hard-block screen launch — Regain's showBlockProtectionScreen:
     *  own-task Activity with NEW_TASK|CLEAR_TASK (clears only same-affinity
     *  tasks; the blocked app's task survives but the 1s poll re-locks it,
     *  which is the actual anti-escape). */
    private fun launchBlockScreen(packageName: String, reason: String, endTime: Long, strictUntil: Long) {
        val app = blockedApps[packageName]
        val intent = Intent(this, BlockScreenActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
            putExtra(BlockScreenActivity.EXTRA_PACKAGE, packageName)
            putExtra(BlockScreenActivity.EXTRA_LABEL, app?.appName ?: packageName)
            putExtra(BlockScreenActivity.EXTRA_REASON, reason)
            putExtra(BlockScreenActivity.EXTRA_END_TIME, endTime)
            putExtra(BlockScreenActivity.EXTRA_STRICT_UNTIL, strictUntil)
            putExtra(BlockScreenActivity.EXTRA_SPENT_MIN, if (app != null) spentMinutesNow(packageName) else 0L)
            putExtra(BlockScreenActivity.EXTRA_LIMIT_MIN, app?.dailyLimitMin ?: 0L)
        }
        // BlockOverlayManager removed to prevent black screen bug
        runCatching { startActivity(intent) }
            .onFailure { Log.w(TAG, "block screen launch failed: ${it.message}") }
    }

    /** Soft block screen (shorts) launch — dismissable with grace. */
    private fun launchShortsScreen(packageName: String) {
        val app = blockedApps[packageName]
        val intent = Intent(this, ShortsBlockActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
            putExtra(ShortsBlockActivity.EXTRA_PACKAGE, packageName)
            putExtra(ShortsBlockActivity.EXTRA_LABEL, app?.appName ?: packageName)
        }
        // BlockOverlayManager removed to prevent black screen bug
        runCatching { startActivity(intent) }
            .onFailure { Log.w(TAG, "shorts screen launch failed: ${it.message}") }
    }


    /**
     * True when [event] belongs to a Shorts/Reels surface. Signals, in order:
     *  1. Activity class name contains "shorts"/"reels" (e.g. ReelsActivity).
     *  2. A visible node in the window has a resource-id that marks the Shorts
     *     /Reels feed surface — YouTube uses `reel_scrim_shorts_*` and many
     *     `reel_*` ids; Instagram uses `clips_*` / `reels_*`. The marker "reel"
     *     (no -s) is chosen so it catches both `reel_*` and `reels_*` while
     *     avoiding the Home "shorts_shelf" false-positive. `shorts_scrim` is
     *     also matched for the YouTube Shorts scrim specifically.
     *
     * Everything is throttled + cached per ~1.5 s and invalidated on every
     * window-state change so Home (no reel node) never false-positives.
     */
    private fun isShortsSurface(packageName: String, event: AccessibilityEvent?): Boolean {
        val cls = event?.className?.toString()?.lowercase() ?: ""
        if (SHORTS_MARKER in cls || REELS_MARKER in cls) return true
        val now = System.currentTimeMillis()
        if (now - lastShortsSniffTime < SHORTS_SNIFF_DEBOUNCE_MS) return lastShortsDetected
        lastShortsSniffTime = now
        var detected = false
        try {
            val root = rootInActiveWindow
            if (root != null) detected = hasReelNode(root)
        } catch (e: Exception) {
            Log.w(TAG, "shorts sniff failed on $packageName: ${e.message}")
        }
        lastShortsDetected = detected
        if (detected) Log.d(TAG, "Shorts surface on $packageName (resource-id marker)")
        return lastShortsDetected
    }

    private fun hasReelNode(node: AccessibilityNodeInfo?): Boolean {
        if (node == null) return false
        try {
            if (node.isVisibleToUser) {
                val id = node.viewIdResourceName?.toString()
                if (id != null) {
                    if (id.endsWith("reel_recycler") || 
                        id.endsWith("reel_watch_fragment_root") || 
                        id.endsWith(":id/clips_viewer")) {
                        return true
                    }
                }
            }
            val children = node.childCount
            for (i in 0 until children) {
                if (hasReelNode(node.getChild(i))) return true
            }
        } catch (_: Exception) {
        }
        return false
    }

    /** Pulls fresh today-usage into Room and the [freshSpent] cache (throttled,
     *  rolled over at midnight). Monotonic: never writes a smaller value than
     *  Room already holds — usage only accumulates, and a stale overwrite is
     *  what let a limit-locked app back in before. */
    private fun refreshUsageOnce() {
        val userId = blockingUserId()
        val apps = blockedApps.values.toList()
        val packages = apps.map { it.packageName }.toSet()
        val minutes = UsageStatsHelper.queryForegroundMinutesToday(this, packages)
        freshSpent = minutes
        val database = AppDatabase.getInstance(this)
        val today = todayMidnightMs()
        apps.forEach { a ->
            val room = if (a.spentResetAt < today) 0L else a.spentTodayMin
            val fresh = minutes[a.packageName] ?: 0L
            val spent = maxOf(room, fresh)
            val rolled = if (a.spentResetAt < today) today else a.spentResetAt
            if (spent != room) {
                database.blockedAppDao().setSpentToday(userId, a.packageName, spent, rolled)
            }
        }
    }

    private fun todayMidnightMs(): Long =
        java.util.Calendar.getInstance().apply {
            set(java.util.Calendar.HOUR_OF_DAY, 0)
            set(java.util.Calendar.MINUTE, 0)
            set(java.util.Calendar.SECOND, 0)
            set(java.util.Calendar.MILLISECOND, 0)
        }.timeInMillis

    /* ─────────────────────────── Guards ───────────────────────────
     * Regain checks these before every block decision: keyboard open, split
     * screen, already-open block screen, floating window (PIP/mini-player).
     */

    /** True when the soft keyboard is visible — never interrupt typing. */
    private fun isKeyboardVisible(): Boolean = try {
        windows.any { it.type == android.view.accessibility.AccessibilityWindowInfo.TYPE_INPUT_METHOD }
    } catch (e: Exception) {
        false
    }

    /** True when [packageName]'s window is NOT fullscreen (split-screen,
     *  freeform or mini-window) — in that state a fullscreen block activity
     *  would only cover part of the screen, so we evict instead. */
    private fun isPartialWindow(packageName: String): Boolean = try {
        val metrics = resources.displayMetrics
        val rect = android.graphics.Rect()
        windows.any { w ->
            if (w.type != android.view.accessibility.AccessibilityWindowInfo.TYPE_APPLICATION) return@any false
            val winPkg = w.root?.packageName?.toString()
            if (winPkg != packageName) return@any false
            w.getBoundsInScreen(rect)
            rect.width() < metrics.widthPixels - 40 || rect.height() < metrics.heightPixels - 40
        }
    } catch (e: Exception) {
        false
    }

    /** Floating-window (PIP / mini-player) protection — Regain's
     *  closeFloatingWindow: if a blocked app shows its mini-player, we
     *  instantly show the block screen. */
    private fun checkFloatingWindowProtection(packageName: String) {
        if (decide(packageName, null, System.currentTimeMillis()) is Verdict.Allow) return
        if (!isPartialWindow(packageName)) return
        if (blockScreenOpen) return
        val now = System.currentTimeMillis()
        if (now - lastFloatingWindowCheckAt < 3000L) return
        lastFloatingWindowCheckAt = now
        if (!hasMiniPlayer(packageName)) return
        
        Log.i(TAG, "Floating window (mini-player/PIP) on blocked $packageName -> Instant Overlay!")
        
        // Regain Architecture: Instead of hitting BACK (which can be bypassed), 
        // we instantly throw up the SYSTEM_ALERT_WINDOW and launch the full block screen.
        launchBlockScreen(packageName, "limit", 0L, 0L)
    }

    private fun hasMiniPlayer(packageName: String): Boolean {
        if (packageName != "com.google.android.youtube") return false
        // PIP/mini-player windows are not the active window — walk every
        // application window's root for the floaty view ids.
        try {
            for (w in windows) {
                if (w.type != android.view.accessibility.AccessibilityWindowInfo.TYPE_APPLICATION) continue
                val root = w.root ?: continue
                if (root.packageName?.toString() != packageName) continue
                if (findViewIdInSubtree(root, youtubeMiniPlayerViewIds)) return true
            }
        } catch (e: Exception) {
            return false
        }
        return false
    }

    private fun findViewIdInSubtree(node: AccessibilityNodeInfo?, ids: List<String>): Boolean {
        if (node == null) return false
        try {
            val id = node.viewIdResourceName?.toString()
            if (id != null && ids.any { it.equals(id, ignoreCase = true) }) return true
            for (i in 0 until node.childCount) {
                if (findViewIdInSubtree(node.getChild(i), ids)) return true
            }
        } catch (_: Exception) {}
        return false
    }

    /* ────────────────────── Website blocking (sniffing) ────────────────────── */

    private fun checkWebsiteBlock(packageName: String, event: AccessibilityEvent) {
        if (packageName !in BROWSER_PACKAGES) return
        if (!BlockingPrefs.isWebBlockingEnabled(this)) return
        if (blockedDomains.isEmpty()) return

        val now = System.currentTimeMillis()
        if (now - lastSniffTime < SNIFF_DEBOUNCE_MS) return
        lastSniffTime = now

        val url = readUrlFromTree(event) ?: return
        val domain = normalizeHost(url) ?: return
        val hit = domain in blockedDomains || blockedDomains.any { domain.endsWith(".$it") }
        if (!hit) return
        if (domain == lastSniffedDomain && (now - lastShowTime) < 5_000L) return

        lastSniffedDomain = domain
        lastShowTime = now
        Log.i(TAG, "Website blocked: $domain (from $packageName)")

        val strictUntil = BlockingPrefs.getWebStrictUntil(this).takeIf { it > now } ?: 0L
        launchBlockScreen(domain, "website", 0L, strictUntil)
    }

    /** Reads the address-bar URL from the accessibility tree (Regain's exact approach). */
    private fun readUrlFromTree(event: AccessibilityEvent): String? {
        var node = event.source ?: return null
        var root: AccessibilityNodeInfo = node
        while (root.parent != null) root = root.parent

        // 1) Known address-bar view ids for this browser.
        val pkg = event.packageName?.toString().orEmpty()
        URL_VIEW_IDS[pkg]?.forEach { viewId ->
            try {
                root.findAccessibilityNodeInfosByViewId(viewId).forEach { n ->
                    n.text?.toString()?.let { t -> if (looksLikeUrl(t)) return t }
                    n.contentDescription?.toString()?.let { d -> if (looksLikeUrl(d)) return d }
                }
            } catch (_: Exception) {}
        }

        // 2) Fallback: scan visible text for a URL.
        findUrlInSubtree(root)?.let { return it }
        findUrlInSubtree(event.source)?.let { return it }

        // 3) Some browsers expose the URL as the event's window text.
        try {
            val windowTitle = event.text?.joinToString(" ").orEmpty()
            if (looksLikeUrl(windowTitle)) return windowTitle
        } catch (_: Exception) {}
        return null
    }

    private fun findUrlInSubtree(node: AccessibilityNodeInfo?): String? {
        if (node == null) return null
        try {
            if (node.isVisibleToUser) {
                node.text?.toString()?.let { t -> if (looksLikeUrl(t)) return t }
                node.contentDescription?.toString()?.let { d -> if (looksLikeUrl(d)) return d }
            }
            for (i in 0 until node.childCount) {
                node.getChild(i)?.let { c ->
                    findUrlInSubtree(c)?.let { return it }
                }
            }
        } catch (_: Exception) {}
        return null
    }

    private fun looksLikeUrl(s: String): Boolean {
        val t = s.trim()
        if (t.length !in 6..300) return false
        if (t.contains("://") || t.startsWith("www.") || t.startsWith("http")) return true
        // Browsers show the omnibox as a bare host ("example.com") when idle —
        // accept anything with at least two dot-separated labels (optionally a path).
        return BARE_HOST.matcher(t).matches()
    }

    private val BARE_HOST = java.util.regex.Pattern.compile(
        "^[a-z0-9\\-]+(\\.[a-z0-9\\-]+)+([/?#][^ ]*)?$",
        java.util.regex.Pattern.CASE_INSENSITIVE
    )

    /** Extracts a clean host from a URL or bare domain string. */
    private fun normalizeHost(raw: String): String? {
        var s = raw.trim()
        if (s.isEmpty()) return null
        if (!s.contains("://")) s = "https://" + s
        val uri = runCatching { android.net.Uri.parse(s) }.getOrNull() ?: return null
        val host = uri.host?.trim()?.lowercase()?.trimEnd('.') ?: return null
        return host.removePrefix("www.")
    }

    override fun onInterrupt() {}

    override fun onDestroy() {
        super.onDestroy()
        isServiceRunning = false
        mainHandler.removeCallbacks(pollRunnable)
        scope.cancel()
    }
}