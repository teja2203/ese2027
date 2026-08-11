package com.ese2027.studyos.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.ese2027.studyos.data.local.AppDatabase
import com.ese2027.studyos.data.preferences.UserPreferences
import com.ese2027.studyos.data.remote.SupabaseService
import com.ese2027.studyos.data.repository.*
import com.ese2027.studyos.data.sync.SyncManager

class AppViewModelFactory(
    private val database: AppDatabase,
    private val supabase: SupabaseService,
    private val userPreferences: UserPreferences
) : ViewModelProvider.Factory {

    private val syncManager = SyncManager(database, supabase)
    private val authRepository = AuthRepository(supabase)
    private val studyRepository = StudyRepository(database, syncManager)
    private val focusRepository = FocusRepository(database, syncManager)
    private val habitRepository = HabitRepository(database, syncManager)
    private val achievementRepository = AchievementRepository(database, syncManager)
    private val mockScoreRepository = MockScoreRepository(database, syncManager)
    private val blockingRepository = BlockingRepository(database, syncManager)

    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        val userId = authRepository.getUserId()

        return when {
            modelClass.isAssignableFrom(TodayViewModel::class.java) -> {
                TodayViewModel(
                    studyRepository = studyRepository,
                    focusRepository = focusRepository,
                    habitRepository = habitRepository,
                    achievementRepository = achievementRepository,
                    userId = userId
                ) as T
            }
            modelClass.isAssignableFrom(PlanViewModel::class.java) -> {
                PlanViewModel(
                    studyRepository = studyRepository,
                    userPreferences = userPreferences,
                    userId = userId
                ) as T
            }
            modelClass.isAssignableFrom(FocusViewModel::class.java) -> {
                FocusViewModel(
                    focusRepository = focusRepository,
                    studyRepository = studyRepository,
                    userPreferences = userPreferences,
                    userId = userId
                ) as T
            }
            modelClass.isAssignableFrom(ProgressViewModel::class.java) -> {
                ProgressViewModel(
                    studyRepository = studyRepository,
                    mockScoreRepository = mockScoreRepository,
                    habitRepository = habitRepository,
                    userId = userId
                ) as T
            }
            modelClass.isAssignableFrom(SettingsViewModel::class.java) -> {
                SettingsViewModel(
                    userPreferences = userPreferences,
                    achievementRepository = achievementRepository,
                    blockingRepository = blockingRepository,
                    studyRepository = studyRepository,
                    syncManager = syncManager,
                    userId = userId
                ) as T
            }
            modelClass.isAssignableFrom(AuthViewModel::class.java) -> {
                AuthViewModel(
                    authRepository = authRepository
                ) as T
            }
            else -> throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
        }
    }
}
