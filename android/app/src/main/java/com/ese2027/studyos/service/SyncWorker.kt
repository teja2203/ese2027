package com.ese2027.studyos.service

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.ese2027.studyos.data.local.AppDatabase
import com.ese2027.studyos.data.remote.SupabaseService
import com.ese2027.studyos.data.sync.SyncManager
import com.ese2027.studyos.data.sync.SyncState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class SyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val database = AppDatabase.getInstance(applicationContext)
            val supabase = SupabaseService.getInstance()
            val syncManager = SyncManager(database, supabase)

            val result = syncManager.performFullSync()
            if (result.isSuccess) {
                // Only stamp "synced at now" when there was actually a session —
                // SyncManager.performFullSync() short-circuits to success(0) when
                // the native client is anonymous, and we must not record that as a
                // successful drain (it would lie to the settings tab and mask the
                // pending backlog forever).
                if (supabase.isLoggedIn()) {
                    SyncState.recordSyncNow(applicationContext, result.getOrNull() ?: 0)
                    if (com.ese2027.studyos.util.NotificationHelper.areMissedFocusRemindersEnabled(applicationContext)) {
                        MissedFocusScheduler.scheduleSweep(applicationContext)
                    }
                    Result.success()
                } else {
                    // Anonymous: don't lie "synced" and don't spin forever — back off
                    // by returning retry; the next login (or network rebound) will
                    // resume normal operation. WorkManager's default backoff applies.
                    Result.retry()
                }
            } else {
                Result.retry()
            }
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
