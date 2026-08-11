package com.ese2027.studyos

import android.app.Application
import androidx.work.*
import com.ese2027.studyos.data.remote.SupabaseService
import com.ese2027.studyos.service.SyncWorker
import com.ese2027.studyos.util.NotificationHelper
import java.util.concurrent.TimeUnit

class StudyOsApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        // 0. Initialise the shared Supabase client on the main thread — its Auth
        // plugin requires it, and everything else (services, WebView bridge,
        // workers) reuses this instance from background threads.
        SupabaseService.getInstance()

        // 1. Initialize all notification channels
        NotificationHelper.createNotificationChannels(this)

        // 2. Schedule daily study slot reminders via AlarmManager
        NotificationHelper.scheduleAllDailySlotAlarms(this)

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
    }
}
