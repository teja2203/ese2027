package com.ese2027.studyos.ui.navigation

sealed class NavRoute(val route: String, val title: String) {
    data object Today : NavRoute("today", "TODAY")
    data object Plan : NavRoute("plan", "PLAN")
    data object Focus : NavRoute("focus", "FOCUS")
    data object Progress : NavRoute("progress", "STATS")
    data object You : NavRoute("you", "SETTINGS")
    data object Auth : NavRoute("auth", "ACCOUNT")
}

val BottomNavItems = listOf(
    NavRoute.Today,
    NavRoute.Plan,
    NavRoute.Focus,
    NavRoute.Progress,
    NavRoute.You
)
