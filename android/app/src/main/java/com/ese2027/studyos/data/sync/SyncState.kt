package com.ese2027.studyos.data.sync

import android.content.Context
import androidx.core.content.edit

/**
 * Lightweight persistent record of the last successful cloud sync.
 *
 * The Settings tab reads [snapshotSyncState] to render a status line such as
 * "Synced · 3m ago" or "Pending: 2" rather than an opaque "ON". It is written
 * from [com.ese2027.studyos.service.SyncWorker] immediately after a successful
 * drain. Pending-count—or-zero, lastSyncAt and the number of rows uploaded this
 * pass are the only thing this object stores.
 *
 * Stored in SharedPreferences so it survives process death and reboots without
 * any DB migration cost; for a single-user local app this is sufficient and
 * keeps SyncManager itself free of Context/state.
 */
object SyncState {

    private const val PREFS_NAME = "ese_sync_state"
    private const val KEY_LAST_SYNC_AT = "last_sync_at"
    private const val KEY_LAST_PROCESS = "last_process_count"

    /** Stamp a successful drain. `processedCount` is the number of outbox rows
     *  actually uploaded this pass — zero means there was nothing to do but the
     *  run itself succeeded (still worth recording). */
    fun recordSyncNow(context: Context, processedCount: Int) {
        runCatching {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit {
                putLong(KEY_LAST_SYNC_AT, System.currentTimeMillis())
                putInt(KEY_LAST_PROCESS, processedCount)
            }
        }
    }

    /** Returns 0 if no sync has ever been recorded (fresh install / signed in but
     *  outbox never drained yet). */
    fun lastSyncAt(context: Context): Long =
        runCatching {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getLong(KEY_LAST_SYNC_AT, 0L)
        }.getOrDefault(0L)
}
