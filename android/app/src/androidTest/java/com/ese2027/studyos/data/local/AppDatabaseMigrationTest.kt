package com.ese2027.studyos.data.local

import androidx.room.testing.MigrationTestHelper
import androidx.sqlite.db.framework.FrameworkSQLiteOpenHelperFactory
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AppDatabaseMigrationTest {

    private val databaseName = "migration-test"
    @get:Rule
    val helper = MigrationTestHelper(
        InstrumentationRegistry.getInstrumentation(),
        AppDatabase::class.java,
        emptyList(),
        FrameworkSQLiteOpenHelperFactory()
    )

    @Test
    fun migrateVersion3To4PreservesFocusSessions() {
        helper.createDatabase(databaseName, 3).apply {
            execSQL(
                "INSERT INTO focus_sessions " +
                    "(id, userId, startTime, endTime, duration, phase, status, timeLeft, logged, loop, strictMode, soundMode, createdAt, updatedAt, syncStatus) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                arrayOf(
                    "session-1", "local_user", 1000L, 2000L, 50, "work", "paused", 25,
                    0, 1, 0, "off", 1000L, 1000L, 0
                )
            )
            close()
        }

        helper.runMigrationsAndValidate(databaseName, 4, false, AppDatabase.MIGRATION_3_4).use { database ->
            database.query("SELECT duration, breakDuration, status FROM focus_sessions WHERE id = 'session-1'").use { cursor ->
                assertTrue(cursor.moveToFirst())
                assertEquals(50, cursor.getInt(0))
                assertEquals(10, cursor.getInt(1))
                assertEquals("paused", cursor.getString(2))
            }
        }
    }

    @Test
    fun migrateVersion4To5PreservesFocusSessionsAndAddsDomainTables() {
        helper.createDatabase(databaseName, 4).apply {
            execSQL(
                "INSERT INTO focus_sessions " +
                    "(id, userId, startTime, endTime, duration, phase, status, timeLeft, breakDuration, logged, loop, strictMode, soundMode, createdAt, updatedAt, syncStatus) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                arrayOf(
                    "session-v4", "local_user", 1000L, 2000L, 50, "work", "paused", 25,
                    10, 12, 1, 0, "off", 1000L, 1000L, 0
                )
            )
            close()
        }

        helper.runMigrationsAndValidate(databaseName, 5, true, AppDatabase.MIGRATION_4_5).use { database ->
            database.query("SELECT plannedDuration, actualDuration, revision FROM focus_sessions WHERE id = 'session-v4'").use { cursor ->
                assertTrue(cursor.moveToFirst())
                assertEquals(50, cursor.getInt(0))
                assertEquals(12, cursor.getInt(1))
                assertEquals(1, cursor.getLong(2))
            }
            database.query("SELECT COUNT(*) FROM plans").use { cursor ->
                assertTrue(cursor.moveToFirst())
                assertEquals(0, cursor.getInt(0))
            }
            database.query("SELECT COUNT(*) FROM study_blocks").use { cursor ->
                assertTrue(cursor.moveToFirst())
                assertEquals(0, cursor.getInt(0))
            }
            database.query("SELECT COUNT(*) FROM in_app_notifications").use { cursor ->
                assertTrue(cursor.moveToFirst())
                assertEquals(0, cursor.getInt(0))
            }
        }
    }
}
