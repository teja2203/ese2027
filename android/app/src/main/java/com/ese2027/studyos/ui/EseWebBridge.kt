package com.ese2027.studyos.ui

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.net.ConnectivityManager
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.util.Log
import android.webkit.JavascriptInterface
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.FileProvider
import com.ese2027.studyos.data.local.AppDatabase
import com.ese2027.studyos.data.local.BlockedApp
import com.ese2027.studyos.data.local.BlockedWebsite
import com.ese2027.studyos.data.local.FocusSessionEntity
import com.ese2027.studyos.data.local.InAppNotificationEntity
import com.ese2027.studyos.data.local.PlanEntity
import com.ese2027.studyos.data.local.StudyBlockEntity
import com.ese2027.studyos.data.local.StudyStatus
import com.ese2027.studyos.data.remote.SupabaseService
import com.ese2027.studyos.data.repository.StudyDomainRepository
import com.ese2027.studyos.data.sync.SyncManager
import com.ese2027.studyos.data.sync.SyncScheduler
import com.ese2027.studyos.service.FocusTimerService
import com.ese2027.studyos.service.MissedFocusScheduler
import com.ese2027.studyos.util.NotificationHelper
import com.ese2027.studyos.util.BlockingPrefs
import com.ese2027.studyos.util.UsageStatsHelper
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import java.io.File
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

/** Native capability bridge for the locally packaged web renderer. */
class EseWebBridge(private val activity: MainActivity) {
    companion object {
        const val NOTIFICATION_REQUEST_CODE = 7402
    }

    private val executor = Executors.newSingleThreadExecutor()
    @Volatile private var notificationRequestPending = false
    private val gson = Gson()
    private val database by lazy { AppDatabase.getInstance(activity) }
    private val supabase by lazy { SupabaseService.getInstance() }
    private val syncManager by lazy { SyncManager(database, supabase) }
    private val domainRepository by lazy {
        StudyDomainRepository(database, syncManager)
    }
    private val userId: String
        get() = supabase.getCurrentUserId() ?: "local_user"

    @JavascriptInterface
    fun saveBackup(payload: String): String {
        val result = executor.submit<String> {
            runCatching {
                val root = File(
                    activity.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS),
                    "ESE2027/backups"
                ).apply { mkdirs() }
                
                // Clean up old files
                root.listFiles { f -> f.name.startsWith("ese2027-") && f.extension == "json" }
                    ?.forEach { it.delete() }
                
                val hash = sha256(payload)
                val prefs = activity.getSharedPreferences("web_backup", Context.MODE_PRIVATE)
                if (prefs.getString("last_hash", null) == hash) return@runCatching backupStatusLocked(root)
                
                val backupFile = File(root, "backup.json")
                val prevFile = File(root, "backup.prev.json")
                val tmpFile = File(root, "backup.tmp.json")
                val metaFile = File(root, "backup.meta.json")
                
                if (backupFile.exists()) {
                    if (prevFile.exists()) prevFile.delete()
                    backupFile.renameTo(prevFile)
                }
                
                tmpFile.writeText(payload, Charsets.UTF_8)
                tmpFile.renameTo(backupFile)
                
                val meta = mapOf(
                    "timestamp" to System.currentTimeMillis(),
                    "version" to 2,
                    "hash" to hash
                )
                metaFile.writeText(gson.toJson(meta), Charsets.UTF_8)
                
                prefs.edit().putString("last_hash", hash).apply()
                backupStatusLocked(root)
            }.getOrElse { "{\"ok\":false,\"error\":\"${escape(it.message ?: "backup failed")}\"}" }
        }
        return result.get()
    }

    @JavascriptInterface
    fun getBackupStatus(): String {
        val root = File(
            activity.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS),
            "ESE2027/backups"
        )
        return backupStatusLocked(root)
    }

    @JavascriptInterface
    fun readLatestBackup(): String {
        val root = File(
            activity.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS),
            "ESE2027/backups"
        )
        val backupFile = File(root, "backup.json")
        return if (backupFile.exists()) backupFile.readText(Charsets.UTF_8) else ""
    }

    /**
     * Writes the backup JSON to a temporary file and opens the Android share sheet so the
     * user can save/move it (Files, Drive, email, another phone). A plain WebView blob
     * download is silently dropped, so this is the reliable way to get data off the device.
     */
    @JavascriptInterface
    fun shareBackup(payload: String, filename: String): String {
        return runCatching {
            val safeName = filename.ifBlank { "ese2027-backup.json" }
                .replace(Regex("[^A-Za-z0-9._-]"), "_")
            val dir = File(activity.cacheDir, "exports").apply { mkdirs() }
            dir.listFiles()?.forEach { it.delete() }
            val file = File(dir, safeName)
            file.writeText(payload, Charsets.UTF_8)
            val uri = FileProvider.getUriForFile(
                activity,
                "${activity.packageName}.fileprovider",
                file
            )
            val send = Intent(Intent.ACTION_SEND).apply {
                type = "application/json"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, safeName)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            activity.runOnUiThread {
                activity.startActivity(Intent.createChooser(send, "Save ESE2027 backup"))
            }
            "{\"ok\":true}"
        }.getOrElse { "{\"ok\":false,\"error\":\"${escape(it.message ?: "share failed")}\"}" }
    }

    @SuppressLint("QueryAllPackagesPermission")
    @JavascriptInterface
    fun getInstalledApps(): String {
        val pm = activity.packageManager
        val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val apps = pm.queryIntentActivities(launcher, 0)
            .asSequence()
            .map { it.activityInfo.applicationInfo }
            .filter { it.packageName != activity.packageName }
            .distinctBy { it.packageName }
            .map {
                mapOf(
                    "packageName" to it.packageName,
                    "appName" to pm.getApplicationLabel(it).toString(),
                    "system" to ((it.flags and ApplicationInfo.FLAG_SYSTEM) != 0)
                )
            }
            .sortedBy { (it["appName"] as String).lowercase(Locale.getDefault()) }
            .toList()
        return gson.toJson(apps)
    }

    @JavascriptInterface
    fun getBlockedApps(): String = runCatching {
        val list = database.blockedAppDao().getAllOnce(userId)
        gson.toJson(list)
    }.getOrElse {
        Log.e("EseWebBridge", "getBlockedApps failed", it)
        "[]"
    }

    @JavascriptInterface
    fun setBlockedApp(packageName: String, appName: String, enabled: Boolean): String = runCatching {
        if (com.ese2027.studyos.BuildConfig.DEBUG) {
            Log.d("EseWebBridge", "setBlockedApp: pkg=$packageName, enabled=$enabled")
        }
        val existing = database.blockedAppDao().getAllOnce(userId).find { it.packageName == packageName }
        val now = System.currentTimeMillis()
        if (!enabled && existing?.strictUntilTs != null && existing.strictUntilTs > now) {
            // Strict lockout: "You cannot turn off or edit the block till X".
            return@runCatching gson.toJson(
                mapOf("blocked_by_strict" to true, "strict_until" to existing.strictUntilTs)
            )
        }
        if (existing == null) {
            database.blockedAppDao().insert(
                BlockedApp(
                    id = "$userId-$packageName",
                    userId = userId,
                    packageName = packageName,
                    appName = appName,
                    isEnabled = true,
                    syncStatus = 1
                )
            )
        } else {
            // Keep the row (Regain rows persist); only the shield state changes.
            database.blockedAppDao().setEnabled(userId, packageName, enabled)
        }
        gson.toJson(mapOf("ok" to true))
    }.getOrElse {
        Log.e("EseWebBridge", "setBlockedApp failed for $packageName", it)
        gson.toJson(mapOf("error" to (it.message ?: "failed")))
    }

    /** Regain-style removal: deletes the row entirely (re-adding starts fresh). Strict refuses. */
    @JavascriptInterface
    fun removeBlockedApp(packageName: String): String = runCatching {
        val existing = database.blockedAppDao().getAllOnce(userId).find { it.packageName == packageName }
        val now = System.currentTimeMillis()
        if (existing?.strictUntilTs != null && existing.strictUntilTs > now) {
            return@runCatching gson.toJson(
                mapOf("blocked_by_strict" to true, "strict_until" to existing.strictUntilTs)
            )
        }
        if (existing != null) database.blockedAppDao().delete(existing.id)
        gson.toJson(mapOf("ok" to true))
    }.getOrElse {
        Log.e("EseWebBridge", "removeBlockedApp failed for $packageName", it)
        gson.toJson(mapOf("error" to (it.message ?: "failed")))
    }

    /** Regain-style strict-mode lockout deadline (epoch ms, local 23:59:59.999 of the chosen day).
     *  days=1 → today 11:59 PM, days=N → N-1 days later, Regain-exact. Pass days <= 0 to clear (tests only). */
    @JavascriptInterface
    fun setBlockStrict(packageName: String, days: Int): String = runCatching {
        val untilTs = if (days <= 0) null else strictDeadline(days)
        database.blockedAppDao().setStrict(userId, packageName, untilTs)
        if (untilTs != null) {
            // Strict means the block is ON and cannot be turned off (Regain).
            database.blockedAppDao().setEnabled(userId, packageName, true)
        }
        gson.toJson(mapOf("untilTs" to untilTs))
    }.getOrElse {
        Log.e("EseWebBridge", "setBlockStrict failed for $packageName", it)
        gson.toJson(mapOf("error" to (it.message ?: "failed")))
    }

    /** Website-shield strict-mode lockout (global, Regain-exact). Same deadline math as [setBlockStrict]. */
    @JavascriptInterface
    fun setWebsiteStrict(days: Int): String = runCatching {
        val untilTs = if (days <= 0) 0L else strictDeadline(days)
        BlockingPrefs.setWebStrictUntil(activity, untilTs)
        if (untilTs > 0L) {
            // Strict means the shield must be ON and cannot be turned off.
            BlockingPrefs.setWebBlockingEnabled(activity, true)
        }
        gson.toJson(mapOf("untilTs" to untilTs))
    }.getOrElse {
        Log.e("EseWebBridge", "setWebsiteStrict failed", it)
        gson.toJson(mapOf("error" to (it.message ?: "failed")))
    }

    /** Local end-of-day deadline for day [days]: day 1 = today 23:59:59.999. */
    private fun strictDeadline(days: Int): Long {
        val cal = java.util.Calendar.getInstance()
        cal.set(java.util.Calendar.HOUR_OF_DAY, 0)
        cal.set(java.util.Calendar.MINUTE, 0)
        cal.set(java.util.Calendar.SECOND, 0)
        cal.set(java.util.Calendar.MILLISECOND, 0)
        cal.add(java.util.Calendar.DAY_OF_YEAR, days.coerceAtLeast(1))
        cal.add(java.util.Calendar.MILLISECOND, -1)
        return cal.timeInMillis
    }

    /** Regain-style per-app daily limit in minutes. Pass limitMin = -1 to clear (binary block). */
    @JavascriptInterface
    fun setBlockedAppLimit(packageName: String, limitMin: Long): String = runCatching {
        val existing = database.blockedAppDao().getAllOnce(userId).find { it.packageName == packageName }
        val now = System.currentTimeMillis()
        if (existing?.strictUntilTs != null && existing.strictUntilTs > now) {
            return@runCatching gson.toJson(
                mapOf("blocked_by_strict" to true, "strict_until" to existing.strictUntilTs)
            )
        }
        val limit: Long? = if (limitMin < 0) null else limitMin
        database.blockedAppDao().setLimit(userId, packageName, limit)
        gson.toJson(mapOf("ok" to true))
    }.getOrElse {
        Log.e("EseWebBridge", "setBlockedAppLimit failed for $packageName", it)
        gson.toJson(mapOf("error" to (it.message ?: "failed")))
    }

    /** When only=true, the app's Shorts/Reels sub-activity is blocked but the rest of the app stays open. */
    @JavascriptInterface
    fun setBlockShortsOnly(packageName: String, only: Boolean): String = runCatching {
        val existing = database.blockedAppDao().getAllOnce(userId).find { it.packageName == packageName }
        val now = System.currentTimeMillis()
        if (existing?.strictUntilTs != null && existing.strictUntilTs > now) {
            return@runCatching gson.toJson(
                mapOf("blocked_by_strict" to true, "strict_until" to existing.strictUntilTs)
            )
        }
        database.blockedAppDao().setShortsOnly(userId, packageName, only)
        gson.toJson(mapOf("ok" to true))
    }.getOrElse {
        Log.e("EseWebBridge", "setBlockShortsOnly failed for $packageName", it)
        gson.toJson(mapOf("error" to (it.message ?: "failed")))
    }

    /**
     * Per-app usage + budget snapshot for the Protection screen.
     * Returns JSON: [{packageName, appName, isEnabled, dailyLimitMin, blockShortsOnly, spentTodayMin, strictUntilTs}]
     * spentTodayMin is refreshed from UsageStatsManager by BlockingStatsRefreshWorker (see Stage 6 slice 2/3);
     * until that runs it stays at the last persisted value (0 on a fresh install).
     */

    @JavascriptInterface
    fun setAllowFirstShort(packageName: String, allow: Boolean): String = runCatching {
        com.ese2027.studyos.util.BlockingPrefs.setAllowFirstShort(activity, packageName, allow)
        gson.toJson(mapOf("ok" to true))
    }.getOrElse {
        Log.e("EseWebBridge", "setAllowFirstShort failed for $packageName", it)
        gson.toJson(mapOf("error" to (it.message ?: "failed")))
    }


    @JavascriptInterface
    fun setRemindersEnabled(packageName: String, enabled: Boolean): String = runCatching {
        com.ese2027.studyos.util.BlockingPrefs.setRemindersEnabled(activity, packageName, enabled)
        gson.toJson(mapOf("ok" to true))
    }.getOrElse {
        Log.e("EseWebBridge", "setRemindersEnabled failed for $packageName", it)
        gson.toJson(mapOf("error" to (it.message ?: "failed")))
    }

    @JavascriptInterface
    fun getBlockingStats(): String = runCatching {
        val list = database.blockedAppDao().getAllOnce(userId).map {
            mapOf(
                    "packageName" to it.packageName,
                    "appName" to it.appName,
                    "isEnabled" to it.isEnabled,
                    "dailyLimitMin" to it.dailyLimitMin,
                    "blockShortsOnly" to it.blockShortsOnly,
                    "allowFirstShort" to com.ese2027.studyos.util.BlockingPrefs.getAllowFirstShort(activity, it.packageName),
                    "remindersEnabled" to com.ese2027.studyos.util.BlockingPrefs.getRemindersEnabled(activity, it.packageName),
                    "spentTodayMin" to it.spentTodayMin,
                    "strictUntilTs" to it.strictUntilTs
                )
        }
        gson.toJson(list)
    }.getOrElse {
        Log.e("EseWebBridge", "getBlockingStats failed", it)
        "[]"
    }

    /** Whether the user has granted the privileged Usage-Access permission. */
    @JavascriptInterface
    fun isUsageStatsGranted(): Boolean = runCatching {
        UsageStatsHelper.isGranted(activity)
    }.getOrElse {
        Log.e("EseWebBridge", "isUsageStatsGranted failed", it)
        false
    }
    /** Opens Settings → Special access → Usage access so the user can grant PACKAGE_USAGE_STATS. */
    @JavascriptInterface
    fun openUsageStatsSettings() {
        runCatching {
            activity.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }.onFailure { Log.e("EseWebBridge", "openUsageStatsSettings failed", it) }
    }

    /**
     * Schedule Blocking (Regain "focus windows"): the chosen apps are auto-blocked
     * by the accessibility service while any study slot (web Plan) is live.
     * [appsJson] = JSON array of {packageName, appName}; [windowsJson] = JSON array
     * of {dow (0=Sun..6=Sat), start, end} in minutes-of-day.
     */
    @JavascriptInterface
    fun setScheduleBlocking(enabled: Boolean, appsJson: String, windowsJson: String): String = runCatching {
        BlockingPrefs.setScheduleEnabled(activity, enabled)
        BlockingPrefs.setScheduleAppsJson(activity, appsJson.ifEmpty { "[]" })
        BlockingPrefs.setScheduleWindowsJson(activity, windowsJson.ifEmpty { "[]" })
        com.ese2027.studyos.service.AppBlockingService.refreshScheduleConfig(activity)
        gson.toJson(mapOf("ok" to true))
    }.getOrElse {
        Log.e("EseWebBridge", "setScheduleBlocking failed", it)
        gson.toJson(mapOf("error" to (it.message ?: "failed")))
    }

    @JavascriptInterface
    fun getScheduleBlocking(): String = runCatching {
        gson.toJson(
            mapOf(
                "enabled" to BlockingPrefs.isScheduleEnabled(activity),
                "apps" to BlockingPrefs.getScheduleAppsJson(activity),
                "windows" to BlockingPrefs.getScheduleWindowsJson(activity)
            )
        )
    }.getOrElse {
        Log.e("EseWebBridge", "getScheduleBlocking failed", it)
        "{}"
    }

    /**
     * Pull today's per-app foreground minutes from UsageStatsManager and persist them
     * into each blocked app's [com.ese2027.studyos.data.local.BlockedApp.spentTodayMin]
     * (and rolls over [BlockedApp.spentResetAt] at local midnight). Returns true if the
     * permission was granted (and stats were pulled); false means the user still needs
     * to grant usage access — the UI should show the CTA in that case.
     */
    @JavascriptInterface
    fun refreshUsageStats(): Boolean = runCatching {
        if (!UsageStatsHelper.isGranted(activity)) return false
        val today = todayMidnightMs()
        val apps = database.blockedAppDao().getAllOnce(userId)
        val packages = apps.map { it.packageName }.toSet()
        val minutes = UsageStatsHelper.queryForegroundMinutesToday(activity, packages)
        apps.forEach { a ->
            val rolled = if (a.spentResetAt < today) today else a.spentResetAt
            val spent = if (a.spentResetAt < today) 0L else minutes[a.packageName] ?: 0L
            database.blockedAppDao().setSpentToday(userId, a.packageName, spent, rolled)
        }
        true
    }.getOrElse {
        Log.e("EseWebBridge", "refreshUsageStats failed", it)
        false
    }

    private fun todayMidnightMs(): Long =
        java.util.Calendar.getInstance().apply {
            set(java.util.Calendar.HOUR_OF_DAY, 0)
            set(java.util.Calendar.MINUTE, 0)
            set(java.util.Calendar.SECOND, 0)
            set(java.util.Calendar.MILLISECOND, 0)
        }.timeInMillis

    @JavascriptInterface
    fun getBlockedWebsites(): String = runCatching {
        val list = database.blockedWebsiteDao().getAllOnce(userId)
        gson.toJson(list)
    }.getOrElse {
        Log.e("EseWebBridge", "getBlockedWebsites failed", it)
        "[]"
    }

    @JavascriptInterface
    fun setBlockedWebsite(domain: String, enabled: Boolean): Boolean = runCatching {
        val clean = domain.lowercase(Locale.getDefault()).trim()
            .removePrefix("https://").removePrefix("http://").substringBefore('/').trimEnd('.')
        if (clean.isBlank()) return false
        if (com.ese2027.studyos.BuildConfig.DEBUG) {
            Log.d("EseWebBridge", "setBlockedWebsite: enabled=$enabled")
        }
        val id = "$userId-$clean"
        if (enabled) {
            database.blockedWebsiteDao().insert(
                BlockedWebsite(
                    id = id,
                    userId = userId,
                    domain = clean,
                    isEnabled = true,
                    syncStatus = 1
                )
            )
        } else {
            database.blockedWebsiteDao().delete(id)
        }
        true
    }.getOrElse {
        Log.e("EseWebBridge", "setBlockedWebsite failed for $domain", it)
        false
    }

    @JavascriptInterface
    fun isAccessibilityEnabled(): Boolean {
        // Trust the running-services list, not the secure-settings string —
        // Samsung restricts reads of ENABLED_ACCESSIBILITY_SERVICES on some builds.
        val am = activity.getSystemService(android.content.Context.ACCESSIBILITY_SERVICE) as? android.view.accessibility.AccessibilityManager ?: return false
        return am.getEnabledAccessibilityServiceList(android.accessibilityservice.AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
            .any { it.resolveInfo.serviceInfo.packageName == activity.packageName }
    }

    @JavascriptInterface
    fun openAccessibilitySettings() {
        activity.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
    }

    @JavascriptInterface
    fun canDrawOverlays(): Boolean = Settings.canDrawOverlays(activity)

    @JavascriptInterface
    fun openOverlaySettings() {
        activity.startActivity(
            Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                android.net.Uri.parse("package:${activity.packageName}")
            )
        )
    }

    @JavascriptInterface
    fun getBlockingStatus(): String = runCatching {
        val prefs = activity.getSharedPreferences("blocking_prefs", Context.MODE_PRIVATE)
        val apps = database.blockedAppDao().getAllOnce(userId).count { it.isEnabled }
        val sites = database.blockedWebsiteDao().getAllOnce(userId).count { it.isEnabled }
        gson.toJson(
            mapOf(
                "mode" to (prefs.getString("blocking_mode", "focus") ?: "focus"),
                "active" to prefs.getBoolean("focus_active", false),
                "endTime" to prefs.getLong("focus_end_time", 0L),
                "webBlockingEnabled" to BlockingPrefs.isWebBlockingEnabled(activity),
                "accessibilityEnabled" to isAccessibilityEnabled(),
                "overlayAllowed" to Settings.canDrawOverlays(activity),
                "blockedApps" to apps,
                "blockedSites" to sites,
                "webStrictUntilTs" to BlockingPrefs.getWebStrictUntil(activity)
            )
        )
    }.getOrElse {
        Log.e("EseWebBridge", "getBlockingStatus failed", it)
        "{}"
    }

    /** Master switch for the website shield (Regain "Turn off block").
     *  Refused ("blocked_by_strict") while the strict lockout is in force. */
    @JavascriptInterface
    fun setWebBlockingEnabled(enabled: Boolean): String {
        if (!enabled && BlockingPrefs.isWebStrictActive(activity)) {
            Log.w("EseWebBridge", "setWebBlockingEnabled refused: strict mode active")
            return "blocked_by_strict"
        }
        BlockingPrefs.setWebBlockingEnabled(activity, enabled)
        return if (enabled) "on" else "off"
    }

    /** Whether the accessibility URL-sniffing shield is currently on. */
    @JavascriptInterface
    fun isWebBlockingEnabled(): Boolean = BlockingPrefs.isWebBlockingEnabled(activity)

    @JavascriptInterface
    fun startNativeFocus(duration: Int, breakMinutes: Int, loop: Boolean, strict: Boolean, soundMode: String, volume: Float, remainingSeconds: Int = -1) {
        activity.startService(Intent(activity, FocusTimerService::class.java).apply {
            action = FocusTimerService.ACTION_START
            putExtra(FocusTimerService.EXTRA_DURATION, duration)
            putExtra(FocusTimerService.EXTRA_BREAK_DURATION, breakMinutes)
            putExtra(FocusTimerService.EXTRA_LOOP, loop)
            putExtra(FocusTimerService.EXTRA_STRICT_MODE, strict)
            putExtra(FocusTimerService.EXTRA_SOUND_MODE, soundMode)
            putExtra(FocusTimerService.EXTRA_SOUND_VOLUME, volume)
            if (remainingSeconds > 0) putExtra(FocusTimerService.EXTRA_REMAINING, remainingSeconds)
        })
    }

    @JavascriptInterface
    fun pauseNativeFocus() = sendFocusAction(FocusTimerService.ACTION_PAUSE)

    @JavascriptInterface
    fun stopNativeFocus(force: Boolean) {
        activity.startService(Intent(activity, FocusTimerService::class.java).apply {
            action = FocusTimerService.ACTION_STOP
            putExtra(FocusTimerService.EXTRA_FORCE_STOP, force)
        })
    }

    @JavascriptInterface
    fun skipNativeFocus() = sendFocusAction(FocusTimerService.ACTION_SKIP)

    @JavascriptInterface
    fun notificationPermission(): String {
        if (notificationRequestPending) return "pending"
        if (!NotificationManagerCompat.from(activity).areNotificationsEnabled()) return "denied"
        if (Build.VERSION.SDK_INT < 33) return "granted"
        return if (activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED) "granted" else "denied"
    }

    @JavascriptInterface
    fun requestNotificationPermission(): String {
        if (Build.VERSION.SDK_INT < 33) return "granted"
        if (notificationPermission() == "granted") return "granted"
        notificationRequestPending = true
        activity.runOnUiThread {
            activity.requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), NOTIFICATION_REQUEST_CODE)
        }
        return "pending"
    }

    fun onNotificationPermissionResult() {
        notificationRequestPending = false
    }

    @JavascriptInterface
    fun openNotificationSettings() {
        com.ese2027.studyos.util.PermissionUtils.openNotificationSettings(activity)
    }

    @JavascriptInterface
    fun isIgnoringBatteryOptimizations(): Boolean {
        val pm = activity.getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager ?: return false
        return pm.isIgnoringBatteryOptimizations(activity.packageName)
    }

    @JavascriptInterface
    fun openBatterySettings() {
        try {
            activity.startActivity(
                Intent(
                    android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                    android.net.Uri.parse("package:${activity.packageName}")
                )
            )
        } catch (e: Exception) {
            activity.startActivity(Intent(android.provider.Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
        }
    }

    @JavascriptInterface
    fun sessionNotificationsEnabled(): Boolean =
        NotificationHelper.areSessionNotificationsEnabled(activity)

    @JavascriptInterface
    fun setSessionNotificationsEnabled(enabled: Boolean) {
        NotificationHelper.setSessionNotificationsEnabled(activity, enabled)
    }

    @JavascriptInterface
    fun dailyRemindersEnabled(): Boolean =
        NotificationHelper.areDailyRemindersEnabled(activity)

    @JavascriptInterface
    fun setDailyRemindersEnabled(enabled: Boolean): Boolean {
        if (enabled && notificationPermission() != "granted") return false
        NotificationHelper.setDailyRemindersEnabled(activity, enabled)
        return true
    }

    @JavascriptInterface
    fun missedFocusRemindersEnabled(): Boolean =
        NotificationHelper.areMissedFocusRemindersEnabled(activity)

    @JavascriptInterface
    fun setMissedFocusRemindersEnabled(enabled: Boolean): Boolean {
        if (enabled && notificationPermission() != "granted") return false
        NotificationHelper.setMissedFocusRemindersEnabled(activity, enabled)
        return true
    }

    @JavascriptInterface
    fun getMissedFocusSettings(): String = gson.toJson(
        mapOf(
            "quietStartHour" to NotificationHelper.quietStartHour(activity),
            "quietEndHour" to NotificationHelper.quietEndHour(activity),
            "delayMinutes" to NotificationHelper.missedFocusDelayMinutes(activity),
            "dailyLimit" to NotificationHelper.reminderDailyLimit(activity),
            "noFocusHour" to NotificationHelper.noFocusReminderHour(activity)
        )
    )

    @JavascriptInterface
    fun setMissedFocusSettings(
        quietStartHour: Int,
        quietEndHour: Int,
        delayMinutes: Int,
        dailyLimit: Int,
        noFocusHour: Int
    ) {
        NotificationHelper.updateMissedFocusSettings(
            activity,
            quietStartHour,
            quietEndHour,
            delayMinutes,
            dailyLimit,
            noFocusHour
        )
    }

    @JavascriptInterface
    fun postNotification(title: String, body: String, kind: String) {
        if (!NotificationHelper.areSessionNotificationsEnabled(activity)) return
        NotificationHelper.showWebNotification(activity, title, body, kind)
    }

    private fun sendFocusAction(action: String) {
        activity.startService(Intent(activity, FocusTimerService::class.java).apply { this.action = action })
    }

    private fun backupStatusLocked(root: File): String {
        val backupFile = File(root, "backup.json")
        val previousBackupFile = File(root, "backup.prev.json")
        val metaFile = File(root, "backup.meta.json")
        val hasBackup = backupFile.exists()
        val count = listOf(backupFile, previousBackupFile).count { it.exists() }
        return gson.toJson(
            mapOf(
                "ok" to true,
                "folder" to root.absolutePath,
                "has_backup" to hasBackup,
                "count" to count,
                "meta" to if (metaFile.exists()) gson.fromJson(metaFile.readText(), Map::class.java) else null,
                "online" to ((activity.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager)
                    ?.activeNetwork != null)
            )
        )
    }

    @JavascriptInterface
    fun getBlockingMode(): String {
        val prefs = activity.getSharedPreferences("blocking_prefs", Context.MODE_PRIVATE)
        return prefs.getString("blocking_mode", "focus") ?: "focus"
    }

    /**
     * Toggle true full screen for the flip-clock focus overlay.
     *
     * The WebView ignores document.requestFullscreen() unless the client hosts a
     * custom view, so the web layer drives this bridge instead: it hides the
     * status/navigation bars and lets the page's fixed overlay cover the screen.
     */
    @JavascriptInterface
    fun setFullscreen(enable: Boolean) {
        if (enable) activity.enterImmersive() else activity.exitImmersive()
    }

    @JavascriptInterface
    fun setBlockingMode(mode: String) {
        val prefs = activity.getSharedPreferences("blocking_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("blocking_mode", mode).apply()
    }

    @JavascriptInterface
    fun getPlans(): String = runCatching {
        gson.toJson(runBlocking(Dispatchers.IO) { domainRepository.getPlans(userId) })
    }.getOrElse { "[]" }

    @JavascriptInterface
    fun savePlan(payload: String): String = runCatching {
        val json = gson.fromJson(payload, com.google.gson.JsonObject::class.java)
        val id = json.stringOrNull("id") ?: java.util.UUID.randomUUID().toString()
        val existing = runBlocking(Dispatchers.IO) { database.planDao().getById(userId, id) }
        val now = System.currentTimeMillis()
        val plan = (existing ?: PlanEntity(id = id, userId = userId, title = "" )).copy(
            userId = userId,
            title = json.stringOrNull("title") ?: existing?.title ?: "Untitled plan",
            description = json.stringOrNull("description") ?: existing?.description.orEmpty(),
            startDate = json.stringOrNull("startDate") ?: existing?.startDate,
            endDate = json.stringOrNull("endDate") ?: existing?.endDate,
            color = json.stringOrNull("color") ?: existing?.color ?: "#D71921",
            priority = json.intOrNull("priority") ?: existing?.priority ?: 0,
            status = json.stringOrNull("status") ?: existing?.status ?: StudyStatus.PLANNED,
            source = existing?.source ?: "user",
            revision = (existing?.revision ?: 0) + 1,
            deletedAt = null,
            createdAt = existing?.createdAt ?: now,
            updatedAt = now,
            syncStatus = 1
        )
        runBlocking(Dispatchers.IO) { domainRepository.savePlan(plan) }
        requestSyncNow()
        gson.toJson(plan)
    }.getOrElse { gson.toJson(mapOf("error" to (it.message ?: "Could not save plan"))) }

    @JavascriptInterface
    fun getStudyBlocks(date: String): String = runCatching {
        gson.toJson(runBlocking(Dispatchers.IO) { domainRepository.getBlocks(userId, date.takeIf { it.isNotBlank() }) })
    }.getOrElse { "[]" }

    @JavascriptInterface
    fun saveStudyBlock(payload: String): String = runCatching {
        val json = gson.fromJson(payload, com.google.gson.JsonObject::class.java)
        val id = json.stringOrNull("id") ?: java.util.UUID.randomUUID().toString()
        val existing = runBlocking(Dispatchers.IO) { database.studyBlockDao().getById(userId, id) }
        require(existing?.source != "generated") { "Generated schedule blocks are read-only" }
        val now = System.currentTimeMillis()
        val start = json.longOrNull("startTime") ?: error("Block start time is required")
        val end = json.longOrNull("endTime") ?: error("Block end time is required")
        require(end > start) { "Block end must be after its start" }
        val block = (existing ?: StudyBlockEntity(
            id = id,
            userId = userId,
            title = "",
            date = json.stringOrNull("date") ?: error("Block date is required"),
            startTime = start,
            endTime = end,
            durationMinutes = ((end - start) / 60_000L).toInt().coerceAtLeast(1)
        )).copy(
            userId = userId,
            planId = json.stringOrNull("planId") ?: existing?.planId,
            title = json.stringOrNull("title") ?: existing?.title ?: "Study block",
            description = json.stringOrNull("description") ?: existing?.description.orEmpty(),
            date = json.stringOrNull("date") ?: existing?.date ?: error("Block date is required"),
            startTime = start,
            endTime = end,
            durationMinutes = ((end - start) / 60_000L).toInt().coerceAtLeast(1),
            category = json.stringOrNull("category") ?: existing?.category ?: "Study",
            color = json.stringOrNull("color") ?: existing?.color ?: "#D71921",
            priority = json.intOrNull("priority") ?: existing?.priority ?: 0,
            status = json.stringOrNull("status") ?: existing?.status ?: StudyStatus.PLANNED,
            completionPercentage = (json.intOrNull("completionPercentage") ?: existing?.completionPercentage ?: 0).coerceIn(0, 100),
            notes = json.stringOrNull("notes") ?: existing?.notes.orEmpty(),
            source = existing?.source ?: "user",
            scheduleKey = existing?.scheduleKey,
            linkedFocusSessionId = existing?.linkedFocusSessionId,
            followUpEnabled = json.booleanOrNull("followUpEnabled") ?: existing?.followUpEnabled ?: true,
            revision = (existing?.revision ?: 0) + 1,
            deletedAt = null,
            createdAt = existing?.createdAt ?: now,
            updatedAt = now,
            syncStatus = 1
        )
        runBlocking(Dispatchers.IO) { domainRepository.saveBlock(block) }
        MissedFocusScheduler.scheduleForBlock(activity, block)
        requestSyncNow()
        gson.toJson(block)
    }.getOrElse { gson.toJson(mapOf("error" to (it.message ?: "Could not save block"))) }

    @JavascriptInterface
    fun setStudyBlockStatus(blockId: String, status: String, completion: Int): String = runCatching {
        require(status in setOf(
            StudyStatus.PLANNED, StudyStatus.AVAILABLE, StudyStatus.IN_PROGRESS,
            StudyStatus.PAUSED, StudyStatus.COMPLETED, StudyStatus.PARTIALLY_COMPLETED,
            StudyStatus.SKIPPED, StudyStatus.MISSED, StudyStatus.RESCHEDULED, StudyStatus.CANCELLED
        )) { "Unknown block status" }
        val updated = runBlocking(Dispatchers.IO) {
            domainRepository.setBlockStatus(userId, blockId, status, completion)
        }
        MissedFocusScheduler.scheduleForBlock(activity, updated)
        requestSyncNow()
        gson.toJson(updated)
    }.getOrElse { gson.toJson(mapOf("error" to (it.message ?: "Could not change block status"))) }

    @JavascriptInterface
    fun deleteStudyBlock(blockId: String): Boolean = runCatching {
        runBlocking(Dispatchers.IO) { domainRepository.deleteBlock(userId, blockId) }
        MissedFocusScheduler.cancelForBlock(activity, blockId)
        requestSyncNow()
        true
    }.getOrDefault(false)

    @JavascriptInterface
    fun getInAppNotifications(): String = runCatching {
        gson.toJson(runBlocking(Dispatchers.IO) { domainRepository.getNotifications(userId) })
    }.getOrElse { "[]" }

    @JavascriptInterface
    fun getUnreadNotificationCount(): Int = runCatching {
        runBlocking(Dispatchers.IO) { domainRepository.getUnreadCount(userId) }
    }.getOrDefault(0)

    @JavascriptInterface
    fun createInAppNotification(payload: String): String = runCatching {
        val json = gson.fromJson(payload, com.google.gson.JsonObject::class.java)
        val id = json.stringOrNull("id") ?: java.util.UUID.randomUUID().toString()
        val now = System.currentTimeMillis()
        val notification = InAppNotificationEntity(
            id = id,
            userId = userId,
            type = json.stringOrNull("type") ?: "system",
            title = json.stringOrNull("title") ?: "Study update",
            message = json.stringOrNull("message") ?: "Your next step is ready whenever you are.",
            route = json.stringOrNull("route") ?: "today",
            planId = json.stringOrNull("planId"),
            blockId = json.stringOrNull("blockId"),
            focusSessionId = json.stringOrNull("focusSessionId"),
            actionLabel = json.stringOrNull("actionLabel"),
            dedupeKey = json.stringOrNull("dedupeKey") ?: "$userId:${json.stringOrNull("type")}:${json.stringOrNull("blockId") ?: id}",
            createdAt = json.longOrNull("createdAt") ?: now,
            updatedAt = now
        )
        gson.toJson(runBlocking(Dispatchers.IO) { domainRepository.createNotification(notification) }).also { requestSyncNow() }
    }.getOrElse { gson.toJson(mapOf("error" to (it.message ?: "Could not create notification"))) }

    @JavascriptInterface
    fun setNotificationRead(notificationId: String, read: Boolean): Boolean = runCatching {
        runBlocking(Dispatchers.IO) { domainRepository.setNotificationRead(userId, notificationId, read) }
        requestSyncNow()
        true
    }.getOrDefault(false)

    @JavascriptInterface
    fun markAllNotificationsRead(): Int = runCatching {
        val n = runBlocking(Dispatchers.IO) { domainRepository.markAllNotificationsRead(userId) }
        requestSyncNow()
        n
    }.getOrDefault(0)

    @JavascriptInterface
    fun deleteInAppNotification(notificationId: String): Boolean = runCatching {
        runBlocking(Dispatchers.IO) { domainRepository.deleteNotification(userId, notificationId) }
        requestSyncNow()
        true
    }.getOrDefault(false)

    /**
     * Receives the Supabase session the web client minted and imports it into the
     * native client so SyncWorker stops seeing isLoggedIn()==false. Called from the
     * web app's afterLogin path every time onAuthStateChange produces a non-null
     * session (initial sign-in and each silent token refresh).
     */
    @JavascriptInterface
    fun setAuthSession(accessToken: String, refreshToken: String): Boolean = runCatching {
        if (accessToken.isBlank()) return@runCatching false
        val result = runBlocking(Dispatchers.IO) { supabase.importSession(accessToken, refreshToken) }
        if (!result.isSuccess) {
            Log.w("EseWebBridge", "importSession failed: ${result.exceptionOrNull()?.message}")
        }
        // Drain whatever was queued before the session arrived — offline-first replay.
        requestSyncNow()
        result.isSuccess
    }.getOrDefault(false)

    /** Mirrors the web sign-out so the native Supabase client doesn't retain a
     *  session in storage after the user has signed out of the web side. */
    @JavascriptInterface
    fun signOutSupabase(): Boolean = runCatching {
        runBlocking(Dispatchers.IO) { supabase.signOut() }
        true
    }.getOrDefault(false)

    @JavascriptInterface
    fun getSyncStatus(): String = runCatching {
        val count = runBlocking(Dispatchers.IO) { database.syncQueueDao().getPendingCountFlow().first() }
        val online = (activity.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager)
            ?.activeNetwork != null
        gson.toJson(
            mapOf(
                "pending" to count,
                "online" to online,
                "loggedIn" to supabase.isLoggedIn(),
                "lastSyncAt" to com.ese2027.studyos.data.sync.SyncState.lastSyncAt(activity)
            )
        )
    }.getOrElse { gson.toJson(mapOf("pending" to 0, "online" to false, "loggedIn" to false, "lastSyncAt" to 0L)) }

    @JavascriptInterface
    fun requestCloudSync(): String {
        SyncScheduler.requestSyncNow(activity)
        return "queued"
    }

    /** Fire a one-shot SyncWorker immediately so a just-made change reaches the
     *  cloud without waiting up to 15 min for the periodic worker. */
    private fun requestSyncNow() = SyncScheduler.requestSyncNow(activity)

    @JavascriptInterface
    fun getFocusContext(): String = runCatching {
        val active = runBlocking(Dispatchers.IO) { database.focusSessionDao().getActiveSession(userId) }
        gson.toJson(active?.let { mapOf("session" to it, "blockId" to it.blockId, "planId" to it.planId) })
    }.getOrElse { "null" }

    @JavascriptInterface
    fun getFocusSessions(): String = runCatching {
        gson.toJson(
            runBlocking(Dispatchers.IO) {
                database.focusSessionDao().getAllOnce(userId).filter { it.deletedAt == null }
            }
        )
    }.getOrElse { "[]" }

    @JavascriptInterface
    fun restoreFocusSession(payload: String): Boolean = runCatching {
        val incoming = gson.fromJson(payload, FocusSessionEntity::class.java)
        runBlocking(Dispatchers.IO) {
            val existing = database.focusSessionDao().getByIdForUser(userId, incoming.id)
            val wasRunning = incoming.status in setOf("active", "paused")
            val restored = incoming.copy(
                userId = userId,
                status = if (wasRunning) "cancelled" else incoming.status,
                timeLeft = if (wasRunning) 0 else incoming.timeLeft,
                revision = (existing?.revision ?: incoming.revision).coerceAtLeast(1) + 1,
                updatedAt = System.currentTimeMillis(),
                syncStatus = 1
            )
            database.focusSessionDao().insert(restored)
            syncManager.enqueueMutation(
                "focus_session",
                restored.id,
                "UPSERT",
                restored,
                restored.revision,
                restored.userId
            )
        }
        true
    }.getOrDefault(false)

    @JavascriptInterface
    fun startNativeBlockFocus(blockId: String, planId: String, duration: Int, breakMinutes: Int, loop: Boolean, strict: Boolean, soundMode: String, volume: Float, remainingSeconds: Int = -1) {
        activity.startService(Intent(activity, FocusTimerService::class.java).apply {
            action = FocusTimerService.ACTION_START
            putExtra(FocusTimerService.EXTRA_BLOCK_ID, blockId)
            putExtra(FocusTimerService.EXTRA_PLAN_ID, planId)
            putExtra(FocusTimerService.EXTRA_DURATION, duration)
            putExtra(FocusTimerService.EXTRA_BREAK_DURATION, breakMinutes)
            putExtra(FocusTimerService.EXTRA_LOOP, loop)
            putExtra(FocusTimerService.EXTRA_STRICT_MODE, strict)
            putExtra(FocusTimerService.EXTRA_SOUND_MODE, soundMode)
            putExtra(FocusTimerService.EXTRA_SOUND_VOLUME, volume)
            if (remainingSeconds > 0) putExtra(FocusTimerService.EXTRA_REMAINING, remainingSeconds)
        })
    }

    private fun sha256(value: String): String = MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }

    private fun escape(value: String): String = value.replace("\\", "\\\\").replace("\"", "\\\"")

    private fun com.google.gson.JsonObject.stringOrNull(key: String): String? = get(key)?.takeUnless { it.isJsonNull }?.asString?.takeIf { it.isNotBlank() }
    private fun com.google.gson.JsonObject.longOrNull(key: String): Long? = get(key)?.takeUnless { it.isJsonNull }?.asLong
    private fun com.google.gson.JsonObject.intOrNull(key: String): Int? = get(key)?.takeUnless { it.isJsonNull }?.asInt
    private fun com.google.gson.JsonObject.booleanOrNull(key: String): Boolean? = get(key)?.takeUnless { it.isJsonNull }?.asBoolean

    fun close() {
        executor.shutdownNow()
    }
}
