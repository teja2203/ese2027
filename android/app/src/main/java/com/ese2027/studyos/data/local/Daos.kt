package com.ese2027.studyos.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface StudySessionDao {
    @Query("SELECT * FROM study_sessions WHERE userId = :userId ORDER BY date DESC")
    fun getAll(userId: String): Flow<List<StudySession>>

    @Query("SELECT * FROM study_sessions WHERE userId = :userId AND date = :date LIMIT 1")
    fun getByDateFlow(userId: String, date: String): Flow<StudySession?>

    @Query("SELECT * FROM study_sessions WHERE userId = :userId AND date = :date LIMIT 1")
    suspend fun getByDate(userId: String, date: String): StudySession?

    @Query("SELECT SUM(minutes) FROM study_sessions WHERE userId = :userId")
    fun getTotalMinutesFlow(userId: String): Flow<Int?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(session: StudySession)

    @Update
    suspend fun update(session: StudySession)

    @Query("SELECT * FROM study_sessions WHERE syncStatus != 0")
    suspend fun getPendingSync(): List<StudySession>

    @Query("UPDATE study_sessions SET syncStatus = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: Int)
}

@Dao
interface TaskCheckDao {
    @Query("SELECT * FROM task_checks WHERE userId = :userId")
    fun getAll(userId: String): Flow<List<TaskCheck>>

    @Query("SELECT * FROM task_checks WHERE userId = :userId AND taskKey = :taskKey LIMIT 1")
    suspend fun getByKey(userId: String, taskKey: String): TaskCheck?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(check: TaskCheck)

    @Query("SELECT * FROM task_checks WHERE syncStatus != 0")
    suspend fun getPendingSync(): List<TaskCheck>

    @Query("UPDATE task_checks SET syncStatus = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: Int)
}

@Dao
interface ShakyFlagDao {
    @Query("SELECT * FROM shaky_flags WHERE userId = :userId ORDER BY updatedAt DESC")
    fun getAll(userId: String): Flow<List<ShakyFlag>>

    @Query("SELECT * FROM shaky_flags WHERE userId = :userId AND taskKey = :taskKey LIMIT 1")
    suspend fun getByKey(userId: String, taskKey: String): ShakyFlag?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(flag: ShakyFlag)

    @Query("DELETE FROM shaky_flags WHERE id = :id")
    suspend fun delete(id: String)
}

@Dao
interface FocusSessionDao {
    @Query("SELECT * FROM focus_sessions WHERE userId = :userId AND status IN ('active', 'paused') ORDER BY startTime DESC LIMIT 1")
    fun getActiveSessionFlow(userId: String): Flow<FocusSessionEntity?>

    @Query("SELECT * FROM focus_sessions WHERE userId = :userId AND status IN ('active', 'paused') ORDER BY startTime DESC LIMIT 1")
    suspend fun getActiveSession(userId: String): FocusSessionEntity?

    @Query("SELECT * FROM focus_sessions WHERE userId = :userId ORDER BY startTime DESC LIMIT 20")
    fun getRecentHistory(userId: String): Flow<List<FocusSessionEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(session: FocusSessionEntity)

    @Update
    suspend fun update(session: FocusSessionEntity)

    @Query("DELETE FROM focus_sessions WHERE id = :id")
    suspend fun delete(id: String)
}

@Dao
interface AchievementDao {
    @Query("SELECT * FROM achievements WHERE userId = :userId")
    fun getAll(userId: String): Flow<List<Achievement>>

    @Query("SELECT COUNT(*) FROM achievements WHERE userId = :userId")
    fun getCountFlow(userId: String): Flow<Int>

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(achievement: Achievement)

    @Query("SELECT * FROM achievements WHERE syncStatus != 0")
    suspend fun getPendingSync(): List<Achievement>

    @Query("UPDATE achievements SET syncStatus = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: Int)
}

@Dao
interface MockScoreDao {
    @Query("SELECT * FROM mock_scores WHERE userId = :userId ORDER BY date DESC")
    fun getAll(userId: String): Flow<List<MockScore>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(score: MockScore)

    @Query("DELETE FROM mock_scores WHERE id = :id")
    suspend fun delete(id: String)

    @Query("SELECT * FROM mock_scores WHERE syncStatus != 0")
    suspend fun getPendingSync(): List<MockScore>

    @Query("UPDATE mock_scores SET syncStatus = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: Int)
}

@Dao
interface RatingDao {
    @Query("SELECT * FROM ratings WHERE userId = :userId ORDER BY date DESC")
    fun getAll(userId: String): Flow<List<Rating>>

    @Query("SELECT * FROM ratings WHERE userId = :userId AND date = :date LIMIT 1")
    fun getByDateFlow(userId: String, date: String): Flow<Rating?>

    @Query("SELECT * FROM ratings WHERE userId = :userId AND date = :date LIMIT 1")
    suspend fun getByDate(userId: String, date: String): Rating?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(rating: Rating)

    @Query("SELECT * FROM ratings WHERE syncStatus != 0")
    suspend fun getPendingSync(): List<Rating>

    @Query("UPDATE ratings SET syncStatus = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: Int)
}

@Dao
interface HabitDao {
    @Query("SELECT * FROM habits WHERE userId = :userId ORDER BY createdAt ASC")
    fun getAll(userId: String): Flow<List<Habit>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(habit: Habit)

    @Query("DELETE FROM habits WHERE id = :id")
    suspend fun delete(id: String)

    @Query("SELECT * FROM habits WHERE syncStatus != 0")
    suspend fun getPendingSync(): List<Habit>

    @Query("UPDATE habits SET syncStatus = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: Int)
}

@Dao
interface HabitLogDao {
    @Query("SELECT * FROM habit_logs WHERE userId = :userId AND habitId = :habitId ORDER BY date DESC")
    fun getByHabit(userId: String, habitId: String): Flow<List<HabitLog>>

    @Query("SELECT * FROM habit_logs WHERE userId = :userId AND date = :date")
    fun getByDateFlow(userId: String, date: String): Flow<List<HabitLog>>

    @Query("SELECT * FROM habit_logs WHERE userId = :userId AND date = :date")
    suspend fun getByDate(userId: String, date: String): List<HabitLog>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(log: HabitLog)

    @Query("SELECT * FROM habit_logs WHERE syncStatus != 0")
    suspend fun getPendingSync(): List<HabitLog>

    @Query("UPDATE habit_logs SET syncStatus = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: Int)
}

@Dao
interface BlockedAppDao {
    @Query("SELECT * FROM blocked_apps WHERE userId = :userId AND isEnabled = 1")
    fun getEnabled(userId: String): Flow<List<BlockedApp>>

    @Query("SELECT * FROM blocked_apps WHERE userId = :userId ORDER BY appName ASC")
    fun getAll(userId: String): Flow<List<BlockedApp>>

    @Query("SELECT * FROM blocked_apps WHERE userId = :userId ORDER BY appName ASC")
    fun getAllOnce(userId: String): List<BlockedApp>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insert(app: BlockedApp)

    @Update
    fun update(app: BlockedApp)

    @Query("DELETE FROM blocked_apps WHERE id = :id")
    fun delete(id: String)
}

@Dao
interface BlockedWebsiteDao {
    @Query("SELECT * FROM blocked_websites WHERE userId = :userId AND isEnabled = 1")
    fun getEnabled(userId: String): Flow<List<BlockedWebsite>>

    @Query("SELECT * FROM blocked_websites WHERE userId = :userId ORDER BY domain ASC")
    fun getAll(userId: String): Flow<List<BlockedWebsite>>

    @Query("SELECT * FROM blocked_websites WHERE userId = :userId ORDER BY domain ASC")
    fun getAllOnce(userId: String): List<BlockedWebsite>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insert(website: BlockedWebsite)

    @Update
    fun update(website: BlockedWebsite)

    @Query("DELETE FROM blocked_websites WHERE id = :id")
    fun delete(id: String)
}

@Dao
interface SyncQueueDao {
    @Query("SELECT * FROM sync_queue ORDER BY createdAt ASC LIMIT 50")
    suspend fun getPending(): List<SyncQueue>

    @Query("SELECT COUNT(*) FROM sync_queue")
    fun getPendingCountFlow(): Flow<Int>

    @Insert
    suspend fun insert(item: SyncQueue)

    @Query("DELETE FROM sync_queue WHERE id = :id")
    suspend fun delete(id: Long)

    @Query("UPDATE sync_queue SET retryCount = retryCount + 1, lastError = :error WHERE id = :id")
    suspend fun incrementRetry(id: Long, error: String)

    @Query("DELETE FROM sync_queue")
    suspend fun clearAll()
}
