package com.ese2027.studyos.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

// 1. Study Session Entity (Daily study aggregate & slot hits)
@Entity(
    tableName = "study_sessions",
    indices = [Index(value = ["userId", "date"], unique = true)]
)
data class StudySession(
    @PrimaryKey val id: String,
    val userId: String,
    val date: String,          // Format: "YYYY-MM-DD" (e.g. "2026-07-08")
    val minutes: Int,
    val sessions: Int,
    val slotHits: String? = null, // JSON array of completed slot indices e.g. "[0,1,2]"
    val distract: Int = 0,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val syncStatus: Int = 0    // 0=synced, 1=pending, 2=error
)

// 2. Task Checklist Entity (Checked tasks per day/session)
@Entity(
    tableName = "task_checks",
    indices = [Index(value = ["userId", "taskKey"], unique = true)]
)
data class TaskCheck(
    @PrimaryKey val id: String,
    val userId: String,
    val taskKey: String,       // e.g. "0-0-0" (dayIndex-sessionIndex-taskIndex)
    val isChecked: Boolean,
    val updatedAt: Long = System.currentTimeMillis(),
    val syncStatus: Int = 0
)

// Weak-topic flags used by the web revision queue.
@Entity(
    tableName = "shaky_flags",
    indices = [Index(value = ["userId", "taskKey"], unique = true)]
)
data class ShakyFlag(
    @PrimaryKey val id: String,
    val userId: String,
    val taskKey: String,
    val taskText: String,
    val subject: String,
    val date: String,
    val updatedAt: Long = System.currentTimeMillis(),
    val syncStatus: Int = 0
)

// 3. Focus Session Entity (Pomodoro state & history)
@Entity(
    tableName = "focus_sessions",
    indices = [Index(value = ["userId", "blockId"]), Index(value = ["userId", "planId"])]
)
data class FocusSessionEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val startTime: Long,
    val endTime: Long,
    val duration: Int,         // minutes — always the WORK length for the whole session
    val phase: String,         // "work" or "break"
    val status: String,        // "active", "paused", "completed", "cancelled"
    val timeLeft: Int,         // seconds remaining
    val breakDuration: Int = 10, // minutes — break length for the loop
    val logged: Int = 0,       // minutes logged so far
    val loop: Boolean = true,
    val strictMode: Boolean = false,
    val soundMode: String = "off", // "off", "brown", "pink", "sol528"
    val planId: String? = null,
    val blockId: String? = null,
    val plannedDuration: Int = duration,
    val actualDuration: Int = logged,
    val pauseDuration: Int = 0,
    val completionPercentage: Int = 0,
    val revision: Long = 1,
    val deletedAt: Long? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val syncStatus: Int = 0
)

// 4. Achievement Entity (30 Unlocked Badges)
@Entity(
    tableName = "achievements",
    indices = [Index(value = ["userId", "achievementType"], unique = true)]
)
data class Achievement(
    @PrimaryKey val id: String,
    val userId: String,
    val achievementType: String, // e.g. "first_step", "fire_streak_7", "mock_master"
    val unlockedAt: Long = System.currentTimeMillis(),
    val syncStatus: Int = 0
)

// 5. Mock Score Entity
@Entity(tableName = "mock_scores")
data class MockScore(
    @PrimaryKey val id: String,
    val userId: String,
    val name: String,
    val score: Float,
    val max: Float,
    val negative: Float = 0f,
    val note: String? = null,
    val date: String,          // "YYYY-MM-DD"
    val createdAt: Long = System.currentTimeMillis(),
    val syncStatus: Int = 0
)

// 6. Rating Entity (Daily 1-5 star self-assessment)
@Entity(
    tableName = "ratings",
    indices = [Index(value = ["userId", "date"], unique = true)]
)
data class Rating(
    @PrimaryKey val id: String,
    val userId: String,
    val date: String,          // "YYYY-MM-DD"
    val rating: Int,           // 1 to 5
    val createdAt: Long = System.currentTimeMillis(),
    val syncStatus: Int = 0
)

// 7. Habit Entity (Defined habits)
@Entity(tableName = "habits")
data class Habit(
    @PrimaryKey val id: String,
    val userId: String,
    val name: String,
    val createdAt: Long = System.currentTimeMillis(),
    val syncStatus: Int = 0
)

// 8. Habit Log Entity (Daily habit checkboxes)
@Entity(
    tableName = "habit_logs",
    indices = [Index(value = ["userId", "habitId", "date"], unique = true)]
)
data class HabitLog(
    @PrimaryKey val id: String,
    val userId: String,
    val habitId: String,
    val date: String,          // "YYYY-MM-DD"
    val completed: Boolean,
    val createdAt: Long = System.currentTimeMillis(),
    val syncStatus: Int = 0
)

// 9. Blocked App Entity
@Entity(
    tableName = "blocked_apps",
    indices = [Index(value = ["userId", "packageName"], unique = true)]
)
data class BlockedApp(
    @PrimaryKey val id: String,
    val userId: String,
    val packageName: String,
    val appName: String,
    val isEnabled: Boolean = true,
    /** Regain-style per-app daily limit in minutes. null = no budget (binary block). */
    val dailyLimitMin: Long? = null,
    /** When true, only block the Shorts/Reels sub-activity of the app, not the whole app. */
    val blockShortsOnly: Boolean = false,
    /** Minutes spent in this app today (refreshed from UsageStatsManager, runtime-only — not synced). */
    val spentTodayMin: Long = 0,
    /** UTC epoch-ms of the midnight that reset spentTodayMin last; used to roll over at 00:00 local. */
    val spentResetAt: Long = 0,
    /** Regain-style strict-mode lockout deadline (epoch ms, local 23:59:59.999 of the chosen day).
     *  While in the future, the block cannot be turned off or edited (UI locks + service hard-blocks). */
    val strictUntilTs: Long? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val syncStatus: Int = 0
)

// 10. Blocked Website Entity
@Entity(
    tableName = "blocked_websites",
    indices = [Index(value = ["userId", "domain"], unique = true)]
)
data class BlockedWebsite(
    @PrimaryKey val id: String,
    val userId: String,
    val domain: String,
    val isEnabled: Boolean = true,
    val createdAt: Long = System.currentTimeMillis(),
    val syncStatus: Int = 0
)

// 11. Sync Queue Entity (Outbox pattern for resilient offline sync)
@Entity(tableName = "sync_queue")
data class SyncQueue(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val entityType: String,    // "study_session", "task_check", "mock_score", "rating", "habit_log", "achievement"
    val entityId: String,
    val userId: String = "local_user",
    val operation: String,     // "UPSERT" or "DELETE"
    val payload: String,       // JSON serialized payload
    val mutationId: String,
    val revision: Long = 1,
    val createdAt: Long = System.currentTimeMillis(),
    val nextAttemptAt: Long = 0,
    val retryCount: Int = 0,
    val lastError: String? = null
)

@Entity(
    tableName = "plans",
    indices = [Index(value = ["userId", "updatedAt"]), Index(value = ["userId", "deletedAt"])]
)
data class PlanEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val title: String,
    val description: String = "",
    val startDate: String? = null,
    val endDate: String? = null,
    val color: String = "#D71921",
    val priority: Int = 0,
    val status: String = StudyStatus.PLANNED,
    val source: String = "user",
    val revision: Long = 1,
    val deletedAt: Long? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val syncStatus: Int = 1
)

@Entity(
    tableName = "study_blocks",
    indices = [
        Index(value = ["userId", "date", "startTime"]),
        Index(value = ["userId", "planId"]),
        Index(value = ["userId", "status"]),
        Index(value = ["userId", "deletedAt"])
    ]
)
data class StudyBlockEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val planId: String? = null,
    val title: String,
    val description: String = "",
    val date: String,
    val startTime: Long,
    val endTime: Long,
    val durationMinutes: Int,
    val category: String = "Study",
    val color: String = "#D71921",
    val priority: Int = 0,
    val status: String = StudyStatus.PLANNED,
    val completionPercentage: Int = 0,
    val notes: String = "",
    val source: String = "user",
    val scheduleKey: String? = null,
    val linkedFocusSessionId: String? = null,
    val followUpEnabled: Boolean = true,
    val revision: Long = 1,
    val deletedAt: Long? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val syncStatus: Int = 1
)

@Entity(
    tableName = "in_app_notifications",
    indices = [
        Index(value = ["userId", "createdAt"]),
        Index(value = ["userId", "readAt"]),
        Index(value = ["userId", "dedupeKey"], unique = true),
        Index(value = ["userId", "deletedAt"])
    ]
)
data class InAppNotificationEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val type: String,
    val title: String,
    val message: String,
    val route: String,
    val planId: String? = null,
    val blockId: String? = null,
    val focusSessionId: String? = null,
    val actionLabel: String? = null,
    val dedupeKey: String,
    val readAt: Long? = null,
    val revision: Long = 1,
    val deletedAt: Long? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val syncStatus: Int = 1
)

object StudyStatus {
    const val PLANNED = "planned"
    const val AVAILABLE = "available"
    const val IN_PROGRESS = "in_progress"
    const val PAUSED = "paused"
    const val COMPLETED = "completed"
    const val PARTIALLY_COMPLETED = "partially_completed"
    const val SKIPPED = "skipped"
    const val MISSED = "missed"
    const val RESCHEDULED = "rescheduled"
    const val CANCELLED = "cancelled"

    private val transitions = mapOf(
        PLANNED to setOf(AVAILABLE, IN_PROGRESS, SKIPPED, MISSED, RESCHEDULED, CANCELLED),
        AVAILABLE to setOf(IN_PROGRESS, SKIPPED, MISSED, RESCHEDULED, CANCELLED),
        IN_PROGRESS to setOf(PAUSED, COMPLETED, PARTIALLY_COMPLETED, CANCELLED),
        PAUSED to setOf(IN_PROGRESS, COMPLETED, PARTIALLY_COMPLETED, CANCELLED),
        PARTIALLY_COMPLETED to setOf(IN_PROGRESS, COMPLETED, RESCHEDULED, CANCELLED),
        SKIPPED to setOf(PLANNED, RESCHEDULED, CANCELLED),
        MISSED to setOf(PLANNED, RESCHEDULED, CANCELLED),
        RESCHEDULED to setOf(PLANNED, CANCELLED),
        COMPLETED to emptySet(),
        CANCELLED to emptySet()
    )

    fun canTransition(from: String, to: String): Boolean = from == to || transitions[from]?.contains(to) == true
}
