package com.ese2027.studyos.data.schedule

data class SlotDefinition(
    val slotIndex: Int,
    val icon: String,
    val label: String,
    val time: String,
    val desc: String
)

data class SessionItem(
    val tag: String,
    val title: String,
    val tasks: List<String>
)

data class DaySchedule(
    val dayIndex: Int, // 0 to 207
    val date: String,  // e.g. "Jul 8"
    val day: String,   // e.g. "Tue"
    val subject: String,
    val badge: String,
    val sessions: List<SessionItem>
)

val SLOTS_DEFINITION = listOf(
    SlotDefinition(0, "📖", "Slot 1", "8:30–10:30", "New / Hard Topics"),
    SlotDefinition(1, "✏️", "Slot 2", "11:00–1:00", "Problem Solving"),
    SlotDefinition(2, "📚", "Slot 3", "3:00–6:00", "Lecture Revision"),
    SlotDefinition(3, "✍️", "Slot 4", "6:30–8:30", "PYQ + Statement Qs"),
    SlotDefinition(4, "📝", "Slot 5", "9:30–10:30", "Formula Revision")
)
