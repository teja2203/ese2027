package com.ese2027.studyos.service

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.ese2027.studyos.data.local.AppDatabase
import com.ese2027.studyos.data.remote.SupabaseService
import com.ese2027.studyos.data.sync.SyncManager
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
                Result.success()
            } else {
                Result.retry()
            }
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
