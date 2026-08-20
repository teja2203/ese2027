package com.ese2027.studyos.util

import java.time.LocalDateTime
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MissedFocusPolicyTest {
    private val zone = ZoneId.of("Asia/Kolkata")

    @Test
    fun handlesQuietHoursThatCrossMidnight() {
        assertTrue(MissedFocusPolicy.isQuietHour(23, 22, 7))
        assertTrue(MissedFocusPolicy.isQuietHour(6, 22, 7))
        assertFalse(MissedFocusPolicy.isQuietHour(12, 22, 7))
    }

    @Test
    fun defersUntilQuietHoursEnd() {
        val now = LocalDateTime.of(2026, 8, 15, 23, 30).atZone(zone).toInstant().toEpochMilli()
        val expected = LocalDateTime.of(2026, 8, 16, 7, 0).atZone(zone).toInstant().toEpochMilli()
        assertEquals(expected, MissedFocusPolicy.nextAllowedMillis(now, 22, 7, zone))
    }

    @Test
    fun leavesAllowedTimeUnchanged() {
        val now = LocalDateTime.of(2026, 8, 15, 12, 0).atZone(zone).toInstant().toEpochMilli()
        assertEquals(now, MissedFocusPolicy.nextAllowedMillis(now, 22, 7, zone))
    }
}
