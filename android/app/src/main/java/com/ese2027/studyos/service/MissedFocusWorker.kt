package com.ese2027.studyos.service

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.ese2027.studyos.data.local.AppDatabase
import com.ese2027.studyos.data.local.InAppNotificationEntity
import com.ese2027.studyos.data.local.StudyBlockEntity
import com.ese2027.studyos.data.local.StudyStatus
import com.ese2027.studyos.data.remote.SupabaseService
import com.ese2027.studyos.data.repository.StudyDomainRepository
import com.ese2027.studyos.data.schedule.ScheduleData
import com.ese2027.studyos.data.sync.SyncManager
import com.ese2027.studyos.util.MissedFocusPolicy
import com.ese2027.studyos.util.NotificationHelper
import com.ese2027.studyos.util.NotificationRoute
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID
import java.util.concurrent.TimeUnit

class MissedFocusWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        if (!NotificationHelper.areMissedFocusRemindersEnabled(applicationContext)) {
            return@withContext Result.success()
        }

        val database = AppDatabase.getInstance(applicationContext)
        val supabase = SupabaseService.getInstance()
        val syncManager = SyncManager(database, supabase)
        val repository = StudyDomainRepository(database, syncManager)
        val userId = inputData.getString(KEY_USER_ID)
            ?: supabase.getCurrentUserId()
            ?: "local_user"
        val now = System.currentTimeMillis()

        if (NotificationHelper.isInReminderQuietHours(applicationContext, now)) {
            MissedFocusScheduler.scheduleSweepAt(
                applicationContext,
                NotificationHelper.nextReminderAllowedAt(applicationContext, now)
            )
            return@withContext Result.success()
        }

        if (!NotificationHelper.canPostNotifications(applicationContext)) {
            return@withContext Result.success()
        }

        val blockId = inputData.getString(KEY_BLOCK_ID)
        if (blockId != null) {
            evaluateBlock(repository, database, userId, blockId, now)
        } else {
            val delayMillis = NotificationHelper.missedFocusDelayMinutes(applicationContext) * 60_000L
            database.studyBlockDao().getAllOnce(userId)
                .filter { it.deletedAt == null && it.followUpEnabled && it.endTime + delayMillis <= now }
                .sortedBy { it.endTime }
                .forEach { block ->
                    if (!NotificationHelper.canSendAnotherReminder(applicationContext, now)) return@forEach
                    evaluateBlock(repository, database, userId, block.id, now)
                }
            evaluateNoFocusDay(repository, database, userId, now)
        }
        Result.success()
    }

    private suspend fun evaluateBlock(
        repository: StudyDomainRepository,
        database: AppDatabase,
        userId: String,
        blockId: String,
        now: Long
    ) {
        val block = database.studyBlockDao().getById(userId, blockId) ?: return
        val delayMillis = NotificationHelper.missedFocusDelayMinutes(applicationContext) * 60_000L
        val eligibleAt = block.endTime + delayMillis
        if (eligibleAt > now) {
            MissedFocusScheduler.scheduleForBlock(applicationContext, block)
            return
        }
        if (!block.followUpEnabled || block.deletedAt != null) return
        if (block.status in setOf(
                StudyStatus.COMPLETED,
                StudyStatus.CANCELLED,
                StudyStatus.RESCHEDULED
            )
        ) return
        if (!NotificationHelper.canSendAnotherReminder(applicationContext, now)) return

        val dedupeKey = "missed_block:${block.id}:${block.date}"
        if (database.inAppNotificationDao().getByDedupeKey(userId, dedupeKey) != null) return

        val updatedBlock = if (block.status in setOf(StudyStatus.PLANNED, StudyStatus.AVAILABLE)) {
            repository.setBlockStatus(userId, block.id, StudyStatus.MISSED, block.completionPercentage)
        } else {
            block
        }
        val message = NotificationHelper.nextSupportiveMessage(applicationContext)
        val notification = InAppNotificationEntity(
            id = UUID.randomUUID().toString(),
            userId = userId,
            type = "missed_block",
            title = if (updatedBlock.status == StudyStatus.MISSED) "A study block is still available" else "Your block is still open",
            message = message,
            route = NotificationRoute.FOCUS,
            planId = updatedBlock.planId,
            blockId = updatedBlock.id,
            actionLabel = "Start focus",
            dedupeKey = dedupeKey,
            createdAt = now,
            updatedAt = now
        )
        repository.createNotification(notification)
        NotificationHelper.showMissedFocusNotification(applicationContext, notification)
        NotificationHelper.recordReminderSent(applicationContext, now)
    }

    private suspend fun evaluateNoFocusDay(
        repository: StudyDomainRepository,
        database: AppDatabase,
        userId: String,
        now: Long
    ) {
        if (!NotificationHelper.canSendAnotherReminder(applicationContext, now)) return
        val zoneId = ZoneId.systemDefault()
        val zonedNow = Instant.ofEpochMilli(now).atZone(zoneId)
        if (zonedNow.hour < NotificationHelper.noFocusReminderHour(applicationContext)) return
        val date = zonedNow.toLocalDate()
        if (ScheduleData.forDate(date)?.badge == "RECOVERY") return
        val dayStart = date.atStartOfDay(zoneId).toInstant().toEpochMilli()
        val dayEnd = date.plusDays(1).atStartOfDay(zoneId).toInstant().toEpochMilli()
        val hasMeaningfulFocus = database.focusSessionDao().getForWindow(userId, dayStart, dayEnd)
            .any { it.status == "completed" && it.actualDuration >= 5 }
        val dailyAggregate = database.studySessionDao().getByDate(userId, date.toString())
        if (hasMeaningfulFocus || (dailyAggregate?.minutes ?: 0) >= 5) return

        val dedupeKey = "no_focus_day:$date"
        if (database.inAppNotificationDao().getByDedupeKey(userId, dedupeKey) != null) return
        val notification = InAppNotificationEntity(
            id = UUID.randomUUID().toString(),
            userId = userId,
            type = "missed_focus",
            title = "One small session can restart today",
            message = "You do not need a perfect day. One focused block is enough to restart.",
            route = NotificationRoute.FOCUS,
            actionLabel = "Start focus",
            dedupeKey = dedupeKey,
            createdAt = now,
            updatedAt = now
        )
        repository.createNotification(notification)
        NotificationHelper.showMissedFocusNotification(applicationContext, notification)
        NotificationHelper.recordReminderSent(applicationContext, now)
    }

    companion object {
        const val KEY_BLOCK_ID = "block_id"
        const val KEY_USER_ID = "user_id"
    }
}

object MissedFocusScheduler {
    private const val PERIODIC_WORK = "missed_focus_periodic"
    private const val SWEEP_WORK = "missed_focus_sweep"
    private const val MISSED_FOCUS_TAG = "missed_focus_work"

    fun schedulePeriodic(context: Context) {
        val request = PeriodicWorkRequestBuilder<MissedFocusWorker>(30, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiresBatteryNotLow(true).build())
            .addTag(MISSED_FOCUS_TAG)
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            PERIODIC_WORK,
            ExistingPeriodicWorkPolicy.UPDATE,
            request
        )
    }

    fun cancelPeriodic(context: Context) {
        WorkManager.getInstance(context).cancelAllWorkByTag(MISSED_FOCUS_TAG)
    }

    fun scheduleForBlock(context: Context, block: StudyBlockEntity) {
        if (!NotificationHelper.areMissedFocusRemindersEnabled(context)) return
        if (!block.followUpEnabled || block.deletedAt != null || block.status in setOf(
                StudyStatus.COMPLETED,
                StudyStatus.CANCELLED,
                StudyStatus.RESCHEDULED
            )
        ) {
            cancelForBlock(context, block.id)
            return
        }
        val target = block.endTime + NotificationHelper.missedFocusDelayMinutes(context) * 60_000L
        val delay = (target - System.currentTimeMillis()).coerceAtLeast(0L)
        val request = OneTimeWorkRequestBuilder<MissedFocusWorker>()
            .setInitialDelay(delay, TimeUnit.MILLISECONDS)
            .addTag(MISSED_FOCUS_TAG)
            .setInputData(
                Data.Builder()
                    .putString(MissedFocusWorker.KEY_BLOCK_ID, block.id)
                    .putString(MissedFocusWorker.KEY_USER_ID, block.userId)
                    .build()
            )
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            blockWorkName(block.id),
            ExistingWorkPolicy.REPLACE,
            request
        )
    }

    fun cancelForBlock(context: Context, blockId: String) {
        WorkManager.getInstance(context).cancelUniqueWork(blockWorkName(blockId))
    }

    fun scheduleSweep(context: Context) = scheduleSweepAt(context, System.currentTimeMillis())

    fun scheduleSweepAt(context: Context, targetMillis: Long) {
        val request = OneTimeWorkRequestBuilder<MissedFocusWorker>()
            .setInitialDelay((targetMillis - System.currentTimeMillis()).coerceAtLeast(0L), TimeUnit.MILLISECONDS)
            .addTag(MISSED_FOCUS_TAG)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            SWEEP_WORK,
            ExistingWorkPolicy.REPLACE,
            request
        )
    }

    private fun blockWorkName(blockId: String) = "missed_focus_block_$blockId"
}
