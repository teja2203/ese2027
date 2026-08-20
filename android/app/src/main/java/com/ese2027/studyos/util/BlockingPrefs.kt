package com.ese2027.studyos.util

import android.content.Context
import android.content.SharedPreferences

/**
 * Single source of truth for the focus-protection state.
 *
 * The FocusTimerService is the only writer of [active]/[endTime] (it knows the
 * real session lifecycle). Both shields (Accessibility + VPN) read this file on
 * every event, so they never drift apart:
 *
 *  - mode    : "focus" (block only while a session runs) or "always" (block 24/7)
 *  - active  : true while a focus session is running (written by the timer)
 *  - endTime : epoch millis when the current focus session ends (0 if none)
 */
object BlockingPrefs {

    private const val FILE = "blocking_prefs"
    private const val KEY_MODE = "blocking_mode"
    private const val KEY_ACTIVE = "focus_active"
    private const val KEY_END_TIME = "focus_end_time"
    private const val KEY_WEB_STRICT_UNTIL = "web_strict_until"
    private const val KEY_WEB_BLOCKING_ENABLED = "web_blocking_enabled"
    private const val KEY_SCHED_ENABLED = "sched_blocking_enabled"
    private const val KEY_SCHED_APPS = "sched_blocking_apps"
    private const val KEY_SCHED_WINDOWS = "sched_blocking_windows"

    fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    /** "focus" or "always". */
    fun getMode(context: Context): String =
        prefs(context).getString(KEY_MODE, "focus") ?: "focus"

    fun setMode(context: Context, mode: String) {
        prefs(context).edit().putString(KEY_MODE, mode).apply()
    }

    fun isActive(context: Context): Boolean =
        prefs(context).getBoolean(KEY_ACTIVE, false)

    /** Epoch millis when the running focus session ends; 0 when no session. */
    fun getEndTime(context: Context): Long =
        prefs(context).getLong(KEY_END_TIME, 0L)

    /**
     * Called by FocusTimerService on session start/pause/resume/stop.
     * [endTime] is the wall-clock end of the current work/break phase.
     */
    fun setFocusActive(context: Context, active: Boolean, endTime: Long = 0L) {
        prefs(context).edit()
            .putBoolean(KEY_ACTIVE, active)
            .putLong(KEY_END_TIME, if (active) endTime else 0L)
            .apply()
    }

    /**
     * Is app blocking in force right now?
     * "always" mode overrides; otherwise a live focus session must be active.
     */
    fun isAppBlockingActive(context: Context): Boolean {
        val prefs = prefs(context)
        if (prefs.getString(KEY_MODE, "focus") == "always") return true
        return prefs.getBoolean(KEY_ACTIVE, false)
    }

    /**
     * Millis until the current focus phase ends (0 = unlimited/always mode).
     * Falls back to the session end time persisted by the timer service.
     */
    fun getBlockedUntil(context: Context): Long {
        val prefs = prefs(context)
        if (prefs.getString(KEY_MODE, "focus") == "always") return 0L
        return prefs.getLong(KEY_END_TIME, 0L)
    }

    /** Website-shield strict-mode deadline (epoch ms; 0 = no strict lockout). */
    fun getWebStrictUntil(context: Context): Long =
        prefs(context).getLong(KEY_WEB_STRICT_UNTIL, 0L)

    /** Sets the website-shield strict-mode deadline (0 clears it). */
    fun setWebStrictUntil(context: Context, untilTs: Long) {
        prefs(context).edit().putLong(KEY_WEB_STRICT_UNTIL, untilTs).apply()
    }

    /** True while the website-shield strict lockout is still in force. */
    fun isWebStrictActive(context: Context): Boolean =
        getWebStrictUntil(context) > System.currentTimeMillis()

    /** Master switch for the accessibility URL-sniffing shield (Regain "Turn off block"). */
    fun isWebBlockingEnabled(context: Context): Boolean =
        prefs(context).getBoolean(KEY_WEB_BLOCKING_ENABLED, true)

    fun setWebBlockingEnabled(context: Context, enabled: Boolean) {
        prefs(context).edit().putBoolean(KEY_WEB_BLOCKING_ENABLED, enabled).apply()
    }

    /* ── Schedule Blocking (Regain "focus windows") ───────────────────────────
     * Apps chosen for Schedule Block are auto-blocked while the study slots
     * (from the web Plan) are live. Config is pushed by the web via the bridge:
     *  - apps:    JSON array of {packageName, appName}
     *  - windows: JSON array of {dow (0=Sun..6=Sat), start, end} in day-minutes
     * ─────────────────────────────────────────────────────────────────────── */

    fun isScheduleEnabled(context: Context): Boolean =
        prefs(context).getBoolean(KEY_SCHED_ENABLED, false)

    fun setScheduleEnabled(context: Context, enabled: Boolean) {
        prefs(context).edit().putBoolean(KEY_SCHED_ENABLED, enabled).apply()
    }

    fun getScheduleAppsJson(context: Context): String =
        prefs(context).getString(KEY_SCHED_APPS, "[]") ?: "[]"

    fun setScheduleAppsJson(context: Context, json: String) {
        prefs(context).edit().putString(KEY_SCHED_APPS, json).apply()
    }

    fun getScheduleWindowsJson(context: Context): String =
        prefs(context).getString(KEY_SCHED_WINDOWS, "[]") ?: "[]"

    fun setScheduleWindowsJson(context: Context, json: String) {
        prefs(context).edit().putString(KEY_SCHED_WINDOWS, json).apply()
    }

    fun getAllowFirstShort(context: Context, pkg: String): Boolean =
        prefs(context).getBoolean("allow_first_short_$pkg", false)

    fun setAllowFirstShort(context: Context, pkg: String, allow: Boolean) {
        prefs(context).edit().putBoolean("allow_first_short_$pkg", allow).apply()
    }

    fun getRemindersEnabled(context: Context, pkg: String): Boolean =
        prefs(context).getBoolean("reminders_enabled_$pkg", true)

    fun setRemindersEnabled(context: Context, pkg: String, enabled: Boolean) {
        prefs(context).edit().putBoolean("reminders_enabled_$pkg", enabled).apply()
    }
}
