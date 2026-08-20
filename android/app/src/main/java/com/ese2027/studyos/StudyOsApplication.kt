package com.ese2027.studyos

import android.app.Application
import android.net.ConnectivityManager
import android.net.Network
import androidx.work.*
import com.ese2027.studyos.data.remote.SupabaseService
import com.ese2027.studyos.data.sync.SyncScheduler
import com.ese2027.studyos.service.SyncWorker
import com.ese2027.studyos.service.MissedFocusScheduler
import com.ese2027.studyos.util.NotificationHelper
import java.util.concurrent.TimeUnit

class StudyOsApplication : Application() {

    /** Pending connectivity-rebound callback: when the device regains a network,
     *  drain the sync outbox immediately so offline writes reach the cloud without
     *  waiting up to 15 min for the periodic [SyncWorker]. Registered once per process
     *  in [onCreate] and never unregistered — the callback lives as long as the app. */
    private val networkReboundCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            SyncScheduler.requestSyncNow(this@StudyOsApplication)
        }
    }

    override fun onCreate() {
        super.onCreate()
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            getSharedPreferences("crash_prefs", android.content.Context.MODE_PRIVATE).edit().putString("last_crash", throwable.stackTraceToString()).commit()
            defaultHandler?.uncaughtException(thread, throwable)
        }

        // 0. Initialise the shared Supabase client on the main thread — its Auth
        // plugin requires it, and everything else (services, WebView bridge,
        // workers) reuses this instance from background threads.
        SupabaseService.getInstance()

        // 1. Initialize all notification channels
        NotificationHelper.createNotificationChannels(this)

        // 2. Restore only reminders the user explicitly enabled
        NotificationHelper.scheduleAllDailySlotAlarms(this)
        if (NotificationHelper.areMissedFocusRemindersEnabled(this)) {
            MissedFocusScheduler.schedulePeriodic(this)
            MissedFocusScheduler.scheduleSweep(this)
        }

        // 3. Initialize WorkManager for periodic background sync
        val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
            15, TimeUnit.MINUTES,
            5, TimeUnit.MINUTES
        ).setConstraints(
            Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
        ).build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "sync_worker",
            ExistingPeriodicWorkPolicy.KEEP,
            syncRequest
        )

        // 4. Reactive rebound: a change made offline drains the moment a network
        // reappears, instead of waiting for the 15-min periodic tick.
        runCatching {
            val cm = getSystemService(ConnectivityManager::class.java)
            cm?.registerDefaultNetworkCallback(networkReboundCallback)
        }
    }
}
