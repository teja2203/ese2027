package com.ese2027.studyos.service

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import com.ese2027.studyos.data.local.AppDatabase
import com.ese2027.studyos.util.BlockingPrefs
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Detects when a blocked app comes to the foreground and shows the focus-lock
 * overlay. All state is read from [BlockingPrefs] (written by the timer
 * service) and the Room blocklist, so there is a single source of truth.
 */
class AppBlockingService : AccessibilityService() {

    companion object {
        @Volatile
        var isServiceRunning: Boolean = false
            private set

        private const val TAG = "AppBlockingService"
        private const val RE_SHOW_DEBOUNCE_MS = 1500L
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    @Volatile private var blockedPackages: Set<String> = emptySet()
    private var lastBlockedPackage: String? = null
    private var lastBlockTime = 0L

    override fun onServiceConnected() {
        super.onServiceConnected()
        isServiceRunning = true
        val database = AppDatabase.getInstance(this)

        // Reactive blocklist from Room: adding/removing apps applies instantly.
        scope.launch {
            database.blockedAppDao().getEnabled(blockingUserId()).collect { apps ->
                blockedPackages = apps.map { it.packageName }.toSet()
                Log.d(TAG, "Blocklist loaded (${blockedPackages.size} apps): $blockedPackages")
            }
        }
    }

    private fun blockingUserId(): String =
        runCatching { com.ese2027.studyos.data.remote.SupabaseService.getInstance().getCurrentUserId() }
            .getOrNull() ?: "local_user"

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val packageName = event.packageName?.toString() ?: return
        if (packageName == this.packageName) return // never lock our own app

        val now = System.currentTimeMillis()
        if (packageName == lastBlockedPackage && (now - lastBlockTime) < RE_SHOW_DEBOUNCE_MS) return

        if (!BlockingPrefs.isAppBlockingActive(this)) {
            Log.d(TAG, "Event $packageName: blocking inactive (mode=${BlockingPrefs.getMode(this)}, active=${BlockingPrefs.isActive(this)})")
            return
        }
        if (packageName !in blockedPackages) {
            Log.d(TAG, "Event $packageName: not in blocklist (${blockedPackages.size} apps)")
            return
        }

        Log.i(TAG, "Blocking $packageName (mode=${BlockingPrefs.getMode(this)})")
        lastBlockedPackage = packageName
        lastBlockTime = now

        val endTime = BlockingPrefs.getBlockedUntil(this)
        val intent = Intent(this, BlockingOverlayService::class.java).apply {
            action = BlockingOverlayService.ACTION_SHOW
            putExtra("blocked_package", packageName)
            putExtra("end_time", endTime)
        }
        startForegroundService(intent)
    }

    override fun onInterrupt() {}

    override fun onDestroy() {
        super.onDestroy()
        isServiceRunning = false
        scope.cancel()
    }
}
