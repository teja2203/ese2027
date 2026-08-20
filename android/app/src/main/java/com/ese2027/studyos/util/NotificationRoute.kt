package com.ese2027.studyos.util

object NotificationRoute {
    const val TODAY = "today"
    const val PLAN = "plan"
    const val FOCUS = "focus"
    const val PROGRESS = "progress"
    const val BLOCKS = "blocks"
    const val YOU = "you"

    private val routes = setOf(TODAY, PLAN, FOCUS, PROGRESS, BLOCKS, YOU)

    fun normalize(route: String?): String? = route?.lowercase()?.takeIf(routes::contains)

    fun forKind(kind: String): String = when (kind.lowercase()) {
        "achievement", "day", "progress" -> PROGRESS
        "reminder", "study" -> TODAY
        else -> FOCUS
    }
}
