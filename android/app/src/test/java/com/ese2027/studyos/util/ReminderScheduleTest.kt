package com.ese2027.studyos.util

import java.time.LocalDateTime
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Test

class ReminderScheduleTest {

    private val zone = ZoneId.of("Asia/Kolkata")

    @Test
    fun schedulesLaterTodayWhenSlotIsAhead() {
        val now = LocalDateTime.of(2026, 8, 14, 8, 0).atZone(zone).toInstant().toEpochMilli()
        val expected = LocalDateTime.of(2026, 8, 14, 8, 30).atZone(zone).toInstant().toEpochMilli()
        assertEquals(expected, ReminderSchedule.nextTriggerMillis(now, 8, 30, zone))
    }

    @Test
    fun schedulesTomorrowWhenSlotHasPassed() {
        val now = LocalDateTime.of(2026, 8, 14, 8, 31).atZone(zone).toInstant().toEpochMilli()
        val expected = LocalDateTime.of(2026, 8, 15, 8, 30).atZone(zone).toInstant().toEpochMilli()
        assertEquals(expected, ReminderSchedule.nextTriggerMillis(now, 8, 30, zone))
    }
}
