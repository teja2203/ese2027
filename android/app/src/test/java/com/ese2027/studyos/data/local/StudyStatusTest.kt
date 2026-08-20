package com.ese2027.studyos.data.local

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class StudyStatusTest {

    @Test
    fun allowsSupportedStudyFlowTransitions() {
        assertTrue(StudyStatus.canTransition(StudyStatus.PLANNED, StudyStatus.IN_PROGRESS))
        assertTrue(StudyStatus.canTransition(StudyStatus.IN_PROGRESS, StudyStatus.PAUSED))
        assertTrue(StudyStatus.canTransition(StudyStatus.PAUSED, StudyStatus.IN_PROGRESS))
        assertTrue(StudyStatus.canTransition(StudyStatus.IN_PROGRESS, StudyStatus.PARTIALLY_COMPLETED))
        assertTrue(StudyStatus.canTransition(StudyStatus.PARTIALLY_COMPLETED, StudyStatus.COMPLETED))
        assertTrue(StudyStatus.canTransition(StudyStatus.MISSED, StudyStatus.RESCHEDULED))
    }

    @Test
    fun allowsIdempotentStatusUpdates() {
        assertTrue(StudyStatus.canTransition(StudyStatus.COMPLETED, StudyStatus.COMPLETED))
    }

    @Test
    fun rejectsTerminalAndUnknownTransitions() {
        assertFalse(StudyStatus.canTransition(StudyStatus.COMPLETED, StudyStatus.IN_PROGRESS))
        assertFalse(StudyStatus.canTransition(StudyStatus.CANCELLED, StudyStatus.PLANNED))
        assertFalse(StudyStatus.canTransition("unknown", StudyStatus.PLANNED))
        assertFalse(StudyStatus.canTransition(StudyStatus.PLANNED, "unknown"))
    }
}
