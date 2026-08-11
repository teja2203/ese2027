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
        SyncQueue::class
    ],
    version = 4,
    exportSchema = false
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
                    .addMigrations(MIGRATION_2_3, MIGRATION_3_4)
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }

        private val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("CREATE TABLE IF NOT EXISTS shaky_flags (id TEXT NOT NULL, userId TEXT NOT NULL, taskKey TEXT NOT NULL, taskText TEXT NOT NULL, subject TEXT NOT NULL, date TEXT NOT NULL, updatedAt INTEGER NOT NULL, syncStatus INTEGER NOT NULL, PRIMARY KEY(id))")
                db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS index_shaky_flags_userId_taskKey ON shaky_flags(userId, taskKey)")
            }
        }

        private val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Keep the WORK minutes in `duration` for the whole session and
                // track the loop break length separately so later work phases
                // never shrink to the break length.
                db.execSQL("ALTER TABLE focus_sessions ADD COLUMN breakDuration INTEGER NOT NULL DEFAULT 10")
            }
        }
    }
}
