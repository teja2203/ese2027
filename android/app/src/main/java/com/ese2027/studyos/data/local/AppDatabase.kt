package com.ese2027.studyos.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [
        StudySession::class,
        TaskCheck::class,
        ShakyFlag::class,
        FocusSessionEntity::class,
        Achievement::class,
        MockScore::class,
        Rating::class,
        Habit::class,
        HabitLog::class,
        BlockedApp::class,
        BlockedWebsite::class,
        SyncQueue::class,
        PlanEntity::class,
        StudyBlockEntity::class,
        InAppNotificationEntity::class
    ],
    version = 7,
    exportSchema = true
)
@TypeConverters(RoomTypeConverters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun studySessionDao(): StudySessionDao
    abstract fun taskCheckDao(): TaskCheckDao
    abstract fun shakyFlagDao(): ShakyFlagDao
    abstract fun focusSessionDao(): FocusSessionDao
    abstract fun achievementDao(): AchievementDao
    abstract fun mockScoreDao(): MockScoreDao
    abstract fun ratingDao(): RatingDao
    abstract fun habitDao(): HabitDao
    abstract fun habitLogDao(): HabitLogDao
    abstract fun blockedAppDao(): BlockedAppDao
    abstract fun blockedWebsiteDao(): BlockedWebsiteDao
    abstract fun syncQueueDao(): SyncQueueDao
    abstract fun planDao(): PlanDao
    abstract fun studyBlockDao(): StudyBlockDao
    abstract fun inAppNotificationDao(): InAppNotificationDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "ese2027_database"
                )
                    .addMigrations(MIGRATION_2_3, MIGRATION_3_4, MIGRATION_4_5, MIGRATION_5_6, MIGRATION_6_7)
                    .fallbackToDestructiveMigrationOnDowngrade()
                    .build()
                INSTANCE = instance
                instance
            }
        }

        val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("CREATE TABLE IF NOT EXISTS shaky_flags (id TEXT NOT NULL, userId TEXT NOT NULL, taskKey TEXT NOT NULL, taskText TEXT NOT NULL, subject TEXT NOT NULL, date TEXT NOT NULL, updatedAt INTEGER NOT NULL, syncStatus INTEGER NOT NULL, PRIMARY KEY(id))")
                db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS index_shaky_flags_userId_taskKey ON shaky_flags(userId, taskKey)")
            }
        }

        val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Keep the WORK minutes in `duration` for the whole session and
                // track the loop break length separately so later work phases
                // never shrink to the break length.
                db.execSQL("ALTER TABLE focus_sessions ADD COLUMN breakDuration INTEGER NOT NULL DEFAULT 10")
            }
        }

        val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE focus_sessions ADD COLUMN planId TEXT")
                db.execSQL("ALTER TABLE focus_sessions ADD COLUMN blockId TEXT")
                db.execSQL("ALTER TABLE focus_sessions ADD COLUMN plannedDuration INTEGER NOT NULL DEFAULT 0")
                db.execSQL("UPDATE focus_sessions SET plannedDuration = duration WHERE plannedDuration = 0")
                db.execSQL("ALTER TABLE focus_sessions ADD COLUMN actualDuration INTEGER NOT NULL DEFAULT 0")
                db.execSQL("UPDATE focus_sessions SET actualDuration = logged WHERE actualDuration = 0")
                db.execSQL("ALTER TABLE focus_sessions ADD COLUMN pauseDuration INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE focus_sessions ADD COLUMN completionPercentage INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE focus_sessions ADD COLUMN revision INTEGER NOT NULL DEFAULT 1")
                db.execSQL("ALTER TABLE focus_sessions ADD COLUMN deletedAt INTEGER")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_focus_sessions_userId_blockId ON focus_sessions(userId, blockId)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_focus_sessions_userId_planId ON focus_sessions(userId, planId)")

                db.execSQL("ALTER TABLE sync_queue RENAME TO sync_queue_legacy")
                db.execSQL("CREATE TABLE IF NOT EXISTS sync_queue (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, entityType TEXT NOT NULL, entityId TEXT NOT NULL, userId TEXT NOT NULL, operation TEXT NOT NULL, payload TEXT NOT NULL, mutationId TEXT NOT NULL, revision INTEGER NOT NULL, createdAt INTEGER NOT NULL, nextAttemptAt INTEGER NOT NULL, retryCount INTEGER NOT NULL, lastError TEXT)")
                db.execSQL("INSERT INTO sync_queue (id, entityType, entityId, userId, operation, payload, mutationId, revision, createdAt, nextAttemptAt, retryCount, lastError) SELECT id, entityType, entityId, 'local_user', operation, payload, 'legacy-' || id, 1, createdAt, 0, retryCount, lastError FROM sync_queue_legacy")
                db.execSQL("DROP TABLE sync_queue_legacy")

                db.execSQL("CREATE TABLE IF NOT EXISTS plans (id TEXT NOT NULL, userId TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, startDate TEXT, endDate TEXT, color TEXT NOT NULL, priority INTEGER NOT NULL, status TEXT NOT NULL, source TEXT NOT NULL, revision INTEGER NOT NULL, deletedAt INTEGER, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL, syncStatus INTEGER NOT NULL, PRIMARY KEY(id))")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_plans_userId_updatedAt ON plans(userId, updatedAt)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_plans_userId_deletedAt ON plans(userId, deletedAt)")

                db.execSQL("CREATE TABLE IF NOT EXISTS study_blocks (id TEXT NOT NULL, userId TEXT NOT NULL, planId TEXT, title TEXT NOT NULL, description TEXT NOT NULL, date TEXT NOT NULL, startTime INTEGER NOT NULL, endTime INTEGER NOT NULL, durationMinutes INTEGER NOT NULL, category TEXT NOT NULL, color TEXT NOT NULL, priority INTEGER NOT NULL, status TEXT NOT NULL, completionPercentage INTEGER NOT NULL, notes TEXT NOT NULL, source TEXT NOT NULL, scheduleKey TEXT, linkedFocusSessionId TEXT, followUpEnabled INTEGER NOT NULL, revision INTEGER NOT NULL, deletedAt INTEGER, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL, syncStatus INTEGER NOT NULL, PRIMARY KEY(id))")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_study_blocks_userId_date_startTime ON study_blocks(userId, date, startTime)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_study_blocks_userId_planId ON study_blocks(userId, planId)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_study_blocks_userId_status ON study_blocks(userId, status)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_study_blocks_userId_deletedAt ON study_blocks(userId, deletedAt)")

                db.execSQL("CREATE TABLE IF NOT EXISTS in_app_notifications (id TEXT NOT NULL, userId TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, route TEXT NOT NULL, planId TEXT, blockId TEXT, focusSessionId TEXT, actionLabel TEXT, dedupeKey TEXT NOT NULL, readAt INTEGER, revision INTEGER NOT NULL, deletedAt INTEGER, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL, syncStatus INTEGER NOT NULL, PRIMARY KEY(id))")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_in_app_notifications_userId_createdAt ON in_app_notifications(userId, createdAt)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_in_app_notifications_userId_readAt ON in_app_notifications(userId, readAt)")
                db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS index_in_app_notifications_userId_dedupeKey ON in_app_notifications(userId, dedupeKey)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_in_app_notifications_userId_deletedAt ON in_app_notifications(userId, deletedAt)")
            }
        }

        val MIGRATION_5_6 = object : Migration(5, 6) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Regain-style per-app time budgets + Shorts/Reels sub-blocking
                // + today's spent-time counter (refreshed from UsageStatsManager).
                db.execSQL("ALTER TABLE blocked_apps ADD COLUMN dailyLimitMin INTEGER")
                db.execSQL("ALTER TABLE blocked_apps ADD COLUMN blockShortsOnly INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE blocked_apps ADD COLUMN spentTodayMin INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE blocked_apps ADD COLUMN spentResetAt INTEGER NOT NULL DEFAULT 0")
            }
        }

        val MIGRATION_6_7 = object : Migration(6, 7) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Regain-style strict-mode lockout deadline per blocked app.
                db.execSQL("ALTER TABLE blocked_apps ADD COLUMN strictUntilTs INTEGER")
            }
        }
    }
}
