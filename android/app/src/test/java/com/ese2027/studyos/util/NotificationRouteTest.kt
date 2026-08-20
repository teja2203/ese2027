package com.ese2027.studyos.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NotificationRouteTest {

    @Test
    fun mapsNotificationKindsToUsefulDestinations() {
        assertEquals(NotificationRoute.PROGRESS, NotificationRoute.forKind("achievement"))
        assertEquals(NotificationRoute.PROGRESS, NotificationRoute.forKind("day"))
        assertEquals(NotificationRoute.TODAY, NotificationRoute.forKind("reminder"))
        assertEquals(NotificationRoute.FOCUS, NotificationRoute.forKind("session"))
    }

    @Test
    fun rejectsUnknownRoutes() {
        assertEquals(NotificationRoute.BLOCKS, NotificationRoute.normalize("BLOCKS"))
        assertNull(NotificationRoute.normalize("unknown"))
    }
}
