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
@Entity(tableName = "focus_sessions")
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
    val operation: String,     // "UPSERT" or "DELETE"
    val payload: String,       // JSON serialized payload
    val createdAt: Long = System.currentTimeMillis(),
    val retryCount: Int = 0,
    val lastError: String? = null
)
