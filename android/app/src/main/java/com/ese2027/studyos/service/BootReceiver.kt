package com.ese2027.studyos.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.*
import com.ese2027.studyos.data.local.AppDatabase
import com.ese2027.studyos.data.remote.SupabaseService
import com.ese2027.studyos.data.repository.FocusRepository
import com.ese2027.studyos.data.sync.SyncManager
import com.ese2027.studyos.util.NotificationHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            // 1. Restore only consented slot reminders
            NotificationHelper.scheduleAllDailySlotAlarms(context)
            if (NotificationHelper.areMissedFocusRemindersEnabled(context)) {
                MissedFocusScheduler.schedulePeriodic(context)
                MissedFocusScheduler.scheduleSweep(context)
            }

            // 2. Schedule periodic sync
            val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
                15, TimeUnit.MINUTES,
                5, TimeUnit.MINUTES
            ).setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            ).build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "sync_worker",
                ExistingPeriodicWorkPolicy.KEEP,
                syncRequest
            )

            // 3. Restore active focus session if running
            WorkManager.getInstance(context).enqueue(
                OneTimeWorkRequestBuilder<RestoreFocusWorker>().build()
            )
        }
    }
}

class RestoreFocusWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val database = AppDatabase.getInstance(applicationContext)
            val supabase = SupabaseService.getInstance()
            val syncManager = SyncManager(database, supabase)
            val repository = FocusRepository(database, syncManager)
            val userId = supabase.getCurrentUserId() ?: "local_user"
            val activeSession = repository.getActiveSession(userId)

            if (activeSession != null && activeSession.status == "active") {
                val now = System.currentTimeMillis()
                if (activeSession.endTime > now) {
                    val intent = Intent(applicationContext, FocusTimerService::class.java).apply {
                        action = FocusTimerService.ACTION_START
                        putExtra(
                            FocusTimerService.EXTRA_DURATION,
                            activeSession.duration.coerceAtLeast(1)
                        )
                        putExtra(FocusTimerService.EXTRA_BREAK_DURATION, activeSession.breakDuration)
                        putExtra(FocusTimerService.EXTRA_LOOP, activeSession.loop)
                        putExtra(FocusTimerService.EXTRA_STRICT_MODE, activeSession.strictMode)
                        putExtra(FocusTimerService.EXTRA_SOUND_MODE, activeSession.soundMode)
                        // Exact end time + remaining so the restored timer keeps
                        // the original countdown instead of a full new phase.
                        putExtra(FocusTimerService.EXTRA_END_TIME, activeSession.endTime)
                        putExtra(
                            FocusTimerService.EXTRA_REMAINING,
                            ((activeSession.endTime - now) / 1000).toInt().coerceAtLeast(1)
                        )
                    }
                    applicationContext.startForegroundService(intent)
                }
            }
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
