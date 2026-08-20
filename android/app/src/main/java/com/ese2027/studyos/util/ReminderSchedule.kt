package com.ese2027.studyos.util

import java.time.Instant
import java.time.ZoneId

object ReminderSchedule {
    fun nextTriggerMillis(
        nowMillis: Long,
        hour: Int,
        minute: Int,
        zoneId: ZoneId = ZoneId.systemDefault()
    ): Long {
        val now = Instant.ofEpochMilli(nowMillis).atZone(zoneId)
        var target = now.withHour(hour).withMinute(minute).withSecond(0).withNano(0)
        if (!target.isAfter(now)) target = target.plusDays(1)
        return target.toInstant().toEpochMilli()
    }
}
