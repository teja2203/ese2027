package com.ese2027.studyos.data.repository

import com.ese2027.studyos.data.local.*
import com.ese2027.studyos.data.schedule.DaySchedule
import com.ese2027.studyos.data.schedule.ScheduleData
import com.ese2027.studyos.data.sync.SyncManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import java.util.UUID

class StudyRepository(
    private val database: AppDatabase,
    private val syncManager: SyncManager
) {
    fun getStudySessions(userId: String): Flow<List<StudySession>> {
        return database.studySessionDao().getAll(userId)
    }

    fun getSessionByDateFlow(userId: String, date: String): Flow<StudySession?> {
        return database.studySessionDao().getByDateFlow(userId, date)
    }

    suspend fun getSessionByDate(userId: String, date: String): StudySession? = withContext(Dispatchers.IO) {
        database.studySessionDao().getByDate(userId, date)
    }

    fun getTotalMinutesFlow(userId: String): Flow<Int?> {
        return database.studySessionDao().getTotalMinutesFlow(userId)
    }

    fun getCheckedTasksFlow(userId: String): Flow<List<TaskCheck>> {
        return database.taskCheckDao().getAll(userId)
    }

    fun getRatingByDateFlow(userId: String, date: String): Flow<Rating?> =
        database.ratingDao().getByDateFlow(userId, date)

    suspend fun saveRating(userId: String, date: String, value: Int) = withContext(Dispatchers.IO) {
        val rating = Rating(
            id = "$userId-$date",
            userId = userId,
            date = date,
            rating = value.coerceIn(1, 5),
            createdAt = System.currentTimeMillis(),
            syncStatus = 1
        )
        database.ratingDao().insert(rating)
        syncManager.enqueueMutation("rating", rating.id, "UPSERT", rating)
    }

    suspend fun toggleTaskCheck(userId: String, taskKey: String, isChecked: Boolean) = withContext(Dispatchers.IO) {
        val check = TaskCheck(
            id = "$userId-$taskKey",
            userId = userId,
            taskKey = taskKey,
            isChecked = isChecked,
            updatedAt = System.currentTimeMillis(),
            syncStatus = 1
        )
        database.taskCheckDao().insert(check)
        syncManager.enqueueMutation("task_check", check.id, "UPSERT", check)
    }

    fun getShakyFlagsFlow(userId: String): Flow<List<ShakyFlag>> = database.shakyFlagDao().getAll(userId)

    suspend fun toggleShakyFlag(userId: String, flag: ShakyFlag, enabled: Boolean) = withContext(Dispatchers.IO) {
        if (enabled) {
            val saved = flag.copy(id = "$userId-${flag.taskKey}", userId = userId, syncStatus = 1)
            database.shakyFlagDao().insert(saved)
            syncManager.enqueueMutation("shaky_flag", saved.id, "UPSERT", saved)
        } else {
            val existing = database.shakyFlagDao().getByKey(userId, flag.taskKey)
            if (existing != null) {
                database.shakyFlagDao().delete(existing.id)
                syncManager.enqueueMutation("shaky_flag", existing.id, "DELETE", mapOf("id" to existing.id))
            }
        }
    }

    suspend fun logStudyMinutes(userId: String, date: String, addedMinutes: Int) = withContext(Dispatchers.IO) {
        val existing = database.studySessionDao().getByDate(userId, date)
        val updated = if (existing != null) {
            existing.copy(
                minutes = existing.minutes + addedMinutes,
                sessions = existing.sessions + 1,
                updatedAt = System.currentTimeMillis(),
                syncStatus = 1
            )
        } else {
            StudySession(
                id = UUID.randomUUID().toString(),
                userId = userId,
                date = date,
                minutes = addedMinutes,
                sessions = 1,
                createdAt = System.currentTimeMillis(),
                updatedAt = System.currentTimeMillis(),
                syncStatus = 1
            )
        }
        database.studySessionDao().insert(updated)
        syncManager.enqueueMutation("study_session", updated.id, "UPSERT", updated)
    }

    fun getAllScheduleDays(): List<DaySchedule> {
        return ScheduleData.allDays
    }
}

class FocusRepository(
    private val database: AppDatabase,
    private val syncManager: SyncManager
) {
    fun getActiveSessionFlow(userId: String): Flow<FocusSessionEntity?> {
        return database.focusSessionDao().getActiveSessionFlow(userId)
    }

    suspend fun getActiveSession(userId: String): FocusSessionEntity? = withContext(Dispatchers.IO) {
        database.focusSessionDao().getActiveSession(userId)
    }

    suspend fun saveSession(session: FocusSessionEntity) = withContext(Dispatchers.IO) {
        val saved = session.copy(
            revision = session.revision.coerceAtLeast(1),
            plannedDuration = session.plannedDuration.coerceAtLeast(session.duration),
            actualDuration = session.actualDuration.coerceAtLeast(session.logged),
            syncStatus = 1
        )
        database.focusSessionDao().insert(saved)
        syncManager.enqueueMutation("focus_session", saved.id, "UPSERT", saved)
    }

    suspend fun updateSession(session: FocusSessionEntity) = withContext(Dispatchers.IO) {
        val saved = session.copy(
            revision = session.revision + 1,
            actualDuration = session.actualDuration.coerceAtLeast(session.logged),
            updatedAt = System.currentTimeMillis(),
            syncStatus = 1
        )
        database.focusSessionDao().update(saved)
        syncManager.enqueueMutation("focus_session", saved.id, "UPSERT", saved)
    }

    suspend fun deleteSession(id: String) = withContext(Dispatchers.IO) {
        val current = database.focusSessionDao().getById(id)
        if (current == null) {
            database.focusSessionDao().delete(id)
            syncManager.enqueueMutation("focus_session", id, "DELETE", mapOf("id" to id))
        } else {
            val deleted = current.copy(
                status = "cancelled",
                deletedAt = System.currentTimeMillis(),
                revision = current.revision + 1,
                updatedAt = System.currentTimeMillis(),
                syncStatus = 1
            )
            database.focusSessionDao().insert(deleted)
            syncManager.enqueueMutation("focus_session", id, "DELETE", deleted, deleted.revision, deleted.userId)
        }
    }
}

class HabitRepository(
    private val database: AppDatabase,
    private val syncManager: SyncManager
) {
    fun getHabits(userId: String): Flow<List<Habit>> {
        return database.habitDao().getAll(userId)
    }

    suspend fun createHabit(userId: String, name: String) = withContext(Dispatchers.IO) {
        val habit = Habit(
            id = UUID.randomUUID().toString(),
            userId = userId,
            name = name,
            createdAt = System.currentTimeMillis(),
            syncStatus = 1
        )
        database.habitDao().insert(habit)
        syncManager.enqueueMutation("habit", habit.id, "UPSERT", habit)
    }

    suspend fun deleteHabit(habitId: String) = withContext(Dispatchers.IO) {
        database.habitDao().delete(habitId)
        syncManager.enqueueMutation("habit", habitId, "DELETE", mapOf("id" to habitId))
    }

    fun getHabitLogsForDateFlow(userId: String, date: String): Flow<List<HabitLog>> {
        return database.habitLogDao().getByDateFlow(userId, date)
    }

    suspend fun toggleHabitLog(userId: String, habitId: String, date: String, completed: Boolean) = withContext(Dispatchers.IO) {
        val log = HabitLog(
            id = "$userId-$habitId-$date",
            userId = userId,
            habitId = habitId,
            date = date,
            completed = completed,
            createdAt = System.currentTimeMillis(),
            syncStatus = 1
        )
        database.habitLogDao().insert(log)
        syncManager.enqueueMutation("habit_log", log.id, "UPSERT", log)
    }
}

class MockScoreRepository(
    private val database: AppDatabase,
    private val syncManager: SyncManager
) {
    fun getMockScores(userId: String): Flow<List<MockScore>> {
        return database.mockScoreDao().getAll(userId)
    }

    suspend fun addMockScore(score: MockScore) = withContext(Dispatchers.IO) {
        val entity = score.copy(syncStatus = 1)
        database.mockScoreDao().insert(entity)
        syncManager.enqueueMutation("mock_score", entity.id, "UPSERT", entity)
    }

    suspend fun deleteMockScore(id: String) = withContext(Dispatchers.IO) {
        database.mockScoreDao().delete(id)
        syncManager.enqueueMutation("mock_score", id, "DELETE", mapOf("id" to id))
    }
}

class BlockingRepository(
    private val database: AppDatabase,
    private val syncManager: SyncManager? = null
) {
    fun getBlockedApps(userId: String): Flow<List<BlockedApp>> {
        return database.blockedAppDao().getAll(userId)
    }

    fun getEnabledBlockedApps(userId: String): Flow<List<BlockedApp>> {
        return database.blockedAppDao().getEnabled(userId)
    }

    suspend fun saveBlockedApp(app: BlockedApp) = withContext(Dispatchers.IO) {
        database.blockedAppDao().insert(app)
        syncManager?.enqueueMutation("blocked_app", app.id, "UPSERT", app)
    }

    suspend fun updateBlockedApp(app: BlockedApp) = withContext(Dispatchers.IO) {
        database.blockedAppDao().update(app)
        syncManager?.enqueueMutation("blocked_app", app.id, "UPSERT", app)
    }

    suspend fun deleteBlockedApp(id: String) = withContext(Dispatchers.IO) {
        database.blockedAppDao().delete(id)
        syncManager?.enqueueMutation("blocked_app", id, "DELETE", mapOf("id" to id))
    }

    fun getBlockedWebsites(userId: String): Flow<List<BlockedWebsite>> {
        return database.blockedWebsiteDao().getAll(userId)
    }

    fun getEnabledBlockedWebsites(userId: String): Flow<List<BlockedWebsite>> {
        return database.blockedWebsiteDao().getEnabled(userId)
    }

    suspend fun saveBlockedWebsite(website: BlockedWebsite) = withContext(Dispatchers.IO) {
        database.blockedWebsiteDao().insert(website)
        syncManager?.enqueueMutation("blocked_website", website.id, "UPSERT", website)
    }

    suspend fun updateBlockedWebsite(website: BlockedWebsite) = withContext(Dispatchers.IO) {
        database.blockedWebsiteDao().update(website)
        syncManager?.enqueueMutation("blocked_website", website.id, "UPSERT", website)
    }

    suspend fun deleteBlockedWebsite(id: String) = withContext(Dispatchers.IO) {
        database.blockedWebsiteDao().delete(id)
        syncManager?.enqueueMutation("blocked_website", id, "DELETE", mapOf("id" to id))
    }
}

class AchievementRepository(
    private val database: AppDatabase,
    private val syncManager: SyncManager
) {
    fun getAchievements(userId: String): Flow<List<Achievement>> {
        return database.achievementDao().getAll(userId)
    }

    fun getUnlockedCountFlow(userId: String): Flow<Int> {
        return database.achievementDao().getCountFlow(userId)
    }

    suspend fun unlockAchievement(userId: String, type: String) = withContext(Dispatchers.IO) {
        val achievement = Achievement(
            id = "$userId-$type",
            userId = userId,
            achievementType = type,
            unlockedAt = System.currentTimeMillis(),
            syncStatus = 1
        )
        database.achievementDao().insert(achievement)
        syncManager.enqueueMutation("achievement", achievement.id, "UPSERT", achievement)
    }
}

class StudyDomainRepository(
    private val database: AppDatabase,
    private val syncManager: SyncManager
) {
    suspend fun getPlans(userId: String): List<PlanEntity> = withContext(Dispatchers.IO) {
        database.planDao().getAllOnce(userId)
    }

    suspend fun getBlocks(userId: String, date: String? = null): List<StudyBlockEntity> = withContext(Dispatchers.IO) {
        if (date == null) database.studyBlockDao().getAllOnce(userId)
        else database.studyBlockDao().getForDate(userId, date)
    }

    suspend fun getBlock(userId: String, blockId: String): StudyBlockEntity? = withContext(Dispatchers.IO) {
        database.studyBlockDao().getById(userId, blockId)
    }

    suspend fun savePlan(plan: PlanEntity) = withContext(Dispatchers.IO) {
        val now = System.currentTimeMillis()
        val saved = plan.copy(updatedAt = now, revision = plan.revision.coerceAtLeast(1), syncStatus = 1)
        database.planDao().insert(saved)
        syncManager.enqueueMutation("plan", saved.id, "UPSERT", saved, saved.revision, saved.userId)
    }

    suspend fun saveBlock(block: StudyBlockEntity) = withContext(Dispatchers.IO) {
        require(block.title.trim().isNotEmpty()) { "Block title is required" }
        require(block.endTime > block.startTime) { "Block end must be after its start" }
        val now = System.currentTimeMillis()
        val saved = block.copy(
            title = block.title.trim(),
            durationMinutes = ((block.endTime - block.startTime) / 60_000L).toInt().coerceAtLeast(1),
            completionPercentage = block.completionPercentage.coerceIn(0, 100),
            updatedAt = now,
            revision = block.revision.coerceAtLeast(1),
            syncStatus = 1
        )
        database.studyBlockDao().insert(saved)
        syncManager.enqueueMutation("study_block", saved.id, "UPSERT", saved, saved.revision, saved.userId)
    }

    suspend fun setBlockStatus(userId: String, blockId: String, nextStatus: String, completion: Int? = null): StudyBlockEntity = withContext(Dispatchers.IO) {
        val current = database.studyBlockDao().getById(userId, blockId) ?: error("Block not found")
        require(StudyStatus.canTransition(current.status, nextStatus)) {
            "Cannot move block from ${current.status} to $nextStatus"
        }
        val now = System.currentTimeMillis()
        val nextCompletion = when (nextStatus) {
            StudyStatus.COMPLETED -> 100
            StudyStatus.PARTIALLY_COMPLETED -> (completion ?: current.completionPercentage).coerceIn(1, 99)
            StudyStatus.IN_PROGRESS, StudyStatus.PAUSED -> (completion ?: current.completionPercentage).coerceIn(0, 99)
            else -> completion?.coerceIn(0, 100) ?: current.completionPercentage
        }
        val updated = current.copy(
            status = nextStatus,
            completionPercentage = nextCompletion,
            updatedAt = now,
            revision = current.revision + 1,
            syncStatus = 1
        )
        database.studyBlockDao().insert(updated)
        syncManager.enqueueMutation("study_block", updated.id, "UPSERT", updated, updated.revision, updated.userId)
        updated
    }

    suspend fun deletePlan(userId: String, planId: String) = withContext(Dispatchers.IO) {
        val current = database.planDao().getById(userId, planId) ?: return@withContext
        val now = System.currentTimeMillis()
        database.studyBlockDao().getByPlan(userId, planId).forEach { block ->
            val cancelled = block.copy(
                status = StudyStatus.CANCELLED,
                deletedAt = now,
                updatedAt = now,
                revision = block.revision + 1,
                syncStatus = 1
            )
            database.studyBlockDao().insert(cancelled)
            syncManager.enqueueMutation("study_block", cancelled.id, "DELETE", cancelled, cancelled.revision, cancelled.userId)
        }
        val deleted = current.copy(
            status = StudyStatus.CANCELLED,
            deletedAt = now,
            updatedAt = now,
            revision = current.revision + 1,
            syncStatus = 1
        )
        database.planDao().insert(deleted)
        syncManager.enqueueMutation("plan", deleted.id, "DELETE", deleted, deleted.revision, deleted.userId)
    }

    suspend fun deleteBlock(userId: String, blockId: String) = withContext(Dispatchers.IO) {
        val current = database.studyBlockDao().getById(userId, blockId) ?: return@withContext
        val now = System.currentTimeMillis()
        val deleted = current.copy(
            status = StudyStatus.CANCELLED,
            deletedAt = now,
            updatedAt = now,
            revision = current.revision + 1,
            syncStatus = 1
        )
        database.studyBlockDao().insert(deleted)
        syncManager.enqueueMutation("study_block", deleted.id, "DELETE", deleted, deleted.revision, deleted.userId)
    }

    suspend fun createNotification(notification: InAppNotificationEntity): InAppNotificationEntity = withContext(Dispatchers.IO) {
        val now = System.currentTimeMillis()
        val saved = notification.copy(createdAt = notification.createdAt.coerceAtMost(now), updatedAt = now, syncStatus = 1)
        database.inAppNotificationDao().insert(saved)
        syncManager.enqueueMutation("notification", saved.id, "UPSERT", saved, saved.revision, saved.userId)
        saved
    }

    suspend fun getNotifications(userId: String): List<InAppNotificationEntity> = withContext(Dispatchers.IO) {
        database.inAppNotificationDao().getAllOnce(userId)
    }

    suspend fun getUnreadCount(userId: String): Int = withContext(Dispatchers.IO) {
        database.inAppNotificationDao().getUnreadCount(userId)
    }

    suspend fun setNotificationRead(userId: String, id: String, read: Boolean): InAppNotificationEntity? = withContext(Dispatchers.IO) {
        val current = database.inAppNotificationDao().getById(userId, id) ?: return@withContext null
        val now = System.currentTimeMillis()
        database.inAppNotificationDao().setReadState(userId, id, if (read) now else null, now)
        val updated = current.copy(readAt = if (read) now else null, updatedAt = now, revision = current.revision + 1, syncStatus = 1)
        syncManager.enqueueMutation("notification", updated.id, "UPSERT", updated, updated.revision, updated.userId)
        updated
    }

    suspend fun markAllNotificationsRead(userId: String): Int = withContext(Dispatchers.IO) {
        val current = database.inAppNotificationDao().getAllOnce(userId).filter { it.readAt == null }
        val now = System.currentTimeMillis()
        database.inAppNotificationDao().markAllRead(userId, now, now)
        current.forEach {
            val updated = it.copy(readAt = now, updatedAt = now, revision = it.revision + 1, syncStatus = 1)
            syncManager.enqueueMutation("notification", updated.id, "UPSERT", updated, updated.revision, updated.userId)
        }
        current.size
    }

    suspend fun deleteNotification(userId: String, id: String) = withContext(Dispatchers.IO) {
        val current = database.inAppNotificationDao().getById(userId, id) ?: return@withContext
        val now = System.currentTimeMillis()
        val deleted = current.copy(
            deletedAt = now,
            updatedAt = now,
            revision = current.revision + 1,
            syncStatus = 1
        )
        database.inAppNotificationDao().insert(deleted)
        syncManager.enqueueMutation("notification", deleted.id, "DELETE", deleted, deleted.revision, deleted.userId)
    }
}
