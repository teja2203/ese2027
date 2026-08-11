package com.ese2027.studyos.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.ese2027.studyos.ui.screens.focus.FocusScreen
import com.ese2027.studyos.ui.screens.plan.PlanScreen
import com.ese2027.studyos.ui.screens.progress.ProgressScreen
import com.ese2027.studyos.ui.screens.today.TodayScreen
import com.ese2027.studyos.ui.screens.you.YouScreen
import com.ese2027.studyos.ui.viewmodel.*

@Composable
fun AppNavGraph(
    navController: NavHostController,
    todayViewModel: TodayViewModel,
    planViewModel: PlanViewModel,
    focusViewModel: FocusViewModel,
    progressViewModel: ProgressViewModel,
    settingsViewModel: SettingsViewModel,
    authViewModel: AuthViewModel,
    modifier: Modifier = Modifier
) {
    NavHost(
        navController = navController,
        startDestination = NavRoute.Today.route,
        modifier = modifier
    ) {
        composable(NavRoute.Today.route) {
            TodayScreen(
                viewModel = todayViewModel,
                onNavigateToPlan = { navController.navigate(NavRoute.Plan.route) },
                onNavigateToFocus = { navController.navigate(NavRoute.Focus.route) }
            )
        }
        composable(NavRoute.Plan.route) {
            PlanScreen(
                viewModel = planViewModel
            )
        }
        composable(NavRoute.Focus.route) {
            FocusScreen(
                viewModel = focusViewModel
            )
        }
        composable(NavRoute.Progress.route) {
            ProgressScreen(
                viewModel = progressViewModel
            )
        }
        composable(NavRoute.You.route) {
            YouScreen(
                settingsViewModel = settingsViewModel,
                authViewModel = authViewModel
            )
        }
    }
}
