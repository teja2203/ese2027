package com.ese2027.studyos.util

import java.time.Instant
import java.time.ZoneId

object MissedFocusPolicy {
    fun isQuietHour(hour: Int, quietStartHour: Int, quietEndHour: Int): Boolean {
        val normalizedHour = hour.coerceIn(0, 23)
        val start = quietStartHour.coerceIn(0, 23)
        val end = quietEndHour.coerceIn(0, 23)
        return if (start == end) false
        else if (start < end) normalizedHour in start until end
        else normalizedHour >= start || normalizedHour < end
    }

    fun nextAllowedMillis(
        nowMillis: Long,
        quietStartHour: Int,
        quietEndHour: Int,
        zoneId: ZoneId = ZoneId.systemDefault()
    ): Long {
        val now = Instant.ofEpochMilli(nowMillis).atZone(zoneId)
        if (!isQuietHour(now.hour, quietStartHour, quietEndHour)) return nowMillis
        var target = now.withHour(quietEndHour.coerceIn(0, 23)).withMinute(0).withSecond(0).withNano(0)
        if (!target.isAfter(now)) target = target.plusDays(1)
        return target.toInstant().toEpochMilli()
    }
}
