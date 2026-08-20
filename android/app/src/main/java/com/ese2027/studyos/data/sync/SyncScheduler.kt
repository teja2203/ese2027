package com.ese2027.studyos.data.sync

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.ese2027.studyos.service.SyncWorker

/**
 * Single source for the one-shot "drain the outbox now" trigger.
 *
 * Used by:
 *  - every domain-mutating bridge method, so a just-made plan/block/notification
 *    reaches Supabase immediately rather than waiting up to 15 min for the periodic
 *    worker.
 *  - the connectivity rebound callback registered in [com.ese2027.studyos.StudyOsApplication],
 *    so a write made while offline is replayed the instant a network is available.
 *
 * NetworkType.CONNECTED is the constraint: offline, WorkManager simply defers it;
 * we never run-and-fail, never spin the worker uselessly. ExistingWorkPolicy.REPLACE
 * collapses a burst of writes into one drain so we don't queue dozens of overlapping
 * passes — last-write-wins for the work request, the SyncManager itself drains every
 * pending row in [SyncManager.performFullSync].
 */
object SyncScheduler {

    private const val ONE_SHOT_WORK_NAME = "sync_now"

    fun requestSyncNow(context: Context) {
        runCatching {
            val request = OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                ONE_SHOT_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                request
            )
        }
    }
}
