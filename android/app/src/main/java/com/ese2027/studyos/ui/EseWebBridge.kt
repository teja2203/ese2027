package com.ese2027.studyos.ui

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.net.ConnectivityManager
import android.net.VpnService
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.util.Log
import android.webkit.JavascriptInterface
import com.ese2027.studyos.data.local.AppDatabase
import com.ese2027.studyos.data.local.BlockedApp
import com.ese2027.studyos.data.local.BlockedWebsite
import com.ese2027.studyos.data.remote.SupabaseService
import com.ese2027.studyos.data.repository.BlockingRepository
import com.ese2027.studyos.data.sync.SyncManager
import com.ese2027.studyos.service.FocusTimerService
import com.ese2027.studyos.service.WebsiteBlockingVpnService
import com.ese2027.studyos.util.NotificationHelper
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
        const val VPN_REQUEST_CODE = 7401
        const val NOTIFICATION_REQUEST_CODE = 7402
    }

    private val executor = Executors.newSingleThreadExecutor()
    private val gson = Gson()
    private val database by lazy { AppDatabase.getInstance(activity) }
    private val supabase by lazy { SupabaseService.getInstance() }
    private val repository by lazy { BlockingRepository(database, SyncManager(database, supabase)) }
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
    fun setBlockedApp(packageName: String, appName: String, enabled: Boolean): Boolean = runCatching {
        Log.d("EseWebBridge", "setBlockedApp: pkg=$packageName, app=$appName, enabled=$enabled, user=$userId")
        val id = "$userId-$packageName"
        if (enabled) {
            database.blockedAppDao().insert(
                BlockedApp(
                    id = id,
                    userId = userId,
                    packageName = packageName,
                    appName = appName,
                    isEnabled = true,
                    syncStatus = 1
                )
            )
        } else {
            database.blockedAppDao().delete(id)
        }
        true
    }.getOrElse {
        Log.e("EseWebBridge", "setBlockedApp failed for $packageName", it)
        false
    }

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
        Log.d("EseWebBridge", "setBlockedWebsite: domain=$clean, enabled=$enabled, user=$userId")
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
        val updateIntent = Intent(activity, WebsiteBlockingVpnService::class.java).apply {
            action = WebsiteBlockingVpnService.ACTION_UPDATE_RULES
        }
        activity.startService(updateIntent)
        true
    }.getOrElse {
        Log.e("EseWebBridge", "setBlockedWebsite failed for $domain", it)
        false
    }

    @JavascriptInterface
    fun isAccessibilityEnabled(): Boolean {
        val enabled = Settings.Secure.getString(
            activity.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        return enabled.split(':').any { it.startsWith(activity.packageName + "/") }
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
                "vpnRunning" to WebsiteBlockingVpnService.isRunning,
                "accessibilityEnabled" to isAccessibilityEnabled(),
                "overlayAllowed" to Settings.canDrawOverlays(activity),
                "blockedApps" to apps,
                "blockedSites" to sites
            )
        )
    }.getOrElse {
        Log.e("EseWebBridge", "getBlockingStatus failed", it)
        "{}"
    }

    @JavascriptInterface
    fun requestWebsiteBlocking(): String {
        val intent = VpnService.prepare(activity)
        if (intent != null) {
            activity.startActivityForResult(intent, VPN_REQUEST_CODE)
            return "permission_requested"
        }
        return "ready_for_focus"
    }

    @JavascriptInterface
    fun stopWebsiteBlocking() {
        activity.stopService(Intent(activity, WebsiteBlockingVpnService::class.java).apply {
            action = WebsiteBlockingVpnService.ACTION_STOP
        })
    }

    fun onVpnResult(resultCode: Int) {
        // FocusTimerService starts the VPN only when a focus session begins.
        // Permission is granted here, but browsing remains unrestricted at rest.
    }

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
        if (Build.VERSION.SDK_INT < 33) return "granted"
        return if (activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED) "granted" else "denied"
    }

    @JavascriptInterface
    fun requestNotificationPermission(): String {
        if (Build.VERSION.SDK_INT < 33) return "granted"
        if (notificationPermission() == "granted") return "granted"
        activity.requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), NOTIFICATION_REQUEST_CODE)
        return "pending"
    }

    @JavascriptInterface
    fun postNotification(title: String, body: String, kind: String) {
        NotificationHelper.showWebNotification(activity, title, body, kind)
    }

    private fun sendFocusAction(action: String) {
        activity.startService(Intent(activity, FocusTimerService::class.java).apply { this.action = action })
    }

    private fun backupStatusLocked(root: File): String {
        val backupFile = File(root, "backup.json")
        val metaFile = File(root, "backup.meta.json")
        val hasBackup = backupFile.exists()
        return gson.toJson(
            mapOf(
                "ok" to true,
                "folder" to root.absolutePath,
                "has_backup" to hasBackup,
                "meta" to if (metaFile.exists()) gson.fromJson(metaFile.readText(), Map::class.java) else null,
                "online" to ((activity.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager)
                    ?.activeNetwork != null)
            )
        )
    }

    @JavascriptInterface
    fun isVpnRunning(): Boolean {
        return WebsiteBlockingVpnService.isRunning
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
    fun startWebsiteBlocking(): String {
        val intent = VpnService.prepare(activity)
        if (intent != null) {
            activity.startActivityForResult(intent, VPN_REQUEST_CODE)
            return "permission_requested"
        }
        activity.startService(Intent(activity, WebsiteBlockingVpnService::class.java).apply {
            action = WebsiteBlockingVpnService.ACTION_START
        })
        return "started"
    }

    @JavascriptInterface
    fun getBlockingMode(): String {
        val prefs = activity.getSharedPreferences("blocking_prefs", Context.MODE_PRIVATE)
        return prefs.getString("blocking_mode", "focus") ?: "focus"
    }

    @JavascriptInterface
    fun setBlockingMode(mode: String) {
        val prefs = activity.getSharedPreferences("blocking_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("blocking_mode", mode).apply()
    }

    private fun sha256(value: String): String = MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }

    private fun escape(value: String): String = value.replace("\\", "\\\\").replace("\"", "\\\"")
}
