package com.ese2027.studyos.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ese2027.studyos.data.local.*
import com.ese2027.studyos.data.repository.*
import com.ese2027.studyos.data.schedule.DaySchedule
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.*

data class TodayUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val todayMinutes: Int = 0,
    val todaySessions: Int = 0,
    val activeFocusSession: FocusSessionEntity? = null,
    val habits: List<HabitWithStatus> = emptyList(),
    val recentAchievements: List<Achievement> = emptyList(),
    val totalStudyMinutes: Int = 0,
    val currentDate: String = "",
    val aptDaysLeft: Int = 0,
    val eseDaysLeft: Int = 0,
    val todaySchedule: DaySchedule? = null,
    val currentRating: Int = 0,
    val checkedTasks: Set<String> = emptySet(),
    val shakyFlags: Set<String> = emptySet()
)

data class HabitWithStatus(
    val habit: Habit,
    val isCompletedToday: Boolean
)

class TodayViewModel(
    private val studyRepository: StudyRepository,
    private val focusRepository: FocusRepository,
    private val habitRepository: HabitRepository,
    private val achievementRepository: AchievementRepository,
    private val userId: String
) : ViewModel() {

    private val _uiState = MutableStateFlow(TodayUiState())
    val uiState: StateFlow<TodayUiState> = _uiState.asStateFlow()

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    private val todayDate = dateFormat.format(Date())

    init {
        computeCountdowns()
        viewModelScope.launch(Dispatchers.Default) { loadScheduleForToday() }
        observeTodayData()
        observeTaskFlags()
    }

    private fun computeCountdowns() {
        val today = LocalDate.now()
        val aptDate = LocalDate.of(2026, 8, 22)
        val eseDate = LocalDate.of(2027, 1, 31)

        val aptDays = ChronoUnit.DAYS.between(today, aptDate).toInt().coerceAtLeast(0)
        val eseDays = ChronoUnit.DAYS.between(today, eseDate).toInt().coerceAtLeast(0)

        _uiState.update { it.copy(aptDaysLeft = aptDays, eseDaysLeft = eseDays, currentDate = todayDate) }
    }

    private fun loadScheduleForToday() {
        val days = studyRepository.getAllScheduleDays()
        // ScheduleData contains the complete dated plan. Resolve today's month/day
        // instead of always showing day 1 (the old implementation made Today a
        // different product for every date).
        val today = LocalDate.now()
        val month = today.month.name.lowercase().replaceFirstChar { it.uppercase() }.take(3)
        val todayLabel = "$month ${today.dayOfMonth}"
        val matchingDay = days.firstOrNull { it.date == todayLabel }
            ?: days.firstOrNull()
        _uiState.update { it.copy(todaySchedule = matchingDay) }
    }

    private fun observeTodayData() {
        viewModelScope.launch {
            // Group 1: Study session + Total minutes + Active focus
            val studyFlow = combine(
                studyRepository.getSessionByDateFlow(userId, todayDate),
                studyRepository.getTotalMinutesFlow(userId),
                focusRepository.getActiveSessionFlow(userId)
            ) { session, totalMinutes, activeFocus ->
                Triple(session, totalMinutes ?: 0, activeFocus)
            }

            // Group 2: Habits + Habit logs
            val habitsFlow = combine(
                habitRepository.getHabits(userId),
                habitRepository.getHabitLogsForDateFlow(userId, todayDate)
            ) { habits, todayHabitLogs ->
                val completedHabitIds = todayHabitLogs.filter { it.completed }.map { it.habitId }.toSet()
                habits.map { habit ->
                    HabitWithStatus(
                        habit = habit,
                        isCompletedToday = completedHabitIds.contains(habit.id)
                    )
                }
            }

            // Combine all groups with achievements
            combine(
                studyFlow,
                habitsFlow,
                achievementRepository.getAchievements(userId),
                studyRepository.getRatingByDateFlow(userId, todayDate)
            ) { (session, totalMinutes, activeFocus), habitsWithStatus, achievements, rating ->
                _uiState.update { current ->
                    current.copy(
                        isLoading = false,
                        error = null,
                        todayMinutes = session?.minutes ?: 0,
                        todaySessions = session?.sessions ?: 0,
                        activeFocusSession = activeFocus,
                        habits = habitsWithStatus,
                        recentAchievements = achievements.sortedByDescending { it.unlockedAt }.take(5),
                        totalStudyMinutes = totalMinutes,
                        currentRating = rating?.rating ?: 0
                    )
                }
            }.catch { e ->
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }.collect()
        }
    }

    private fun observeTaskFlags() {
        viewModelScope.launch {
            studyRepository.getCheckedTasksFlow(userId).collect { checks ->
                _uiState.update { it.copy(checkedTasks = checks.filter { c -> c.isChecked }.map { c -> c.taskKey }.toSet()) }
            }
        }
        viewModelScope.launch {
            studyRepository.getShakyFlagsFlow(userId).collect { flags ->
                _uiState.update { it.copy(shakyFlags = flags.map { f -> f.taskKey }.toSet()) }
            }
        }
    }

    fun toggleHabit(habitId: String) {
        viewModelScope.launch {
            val current = _uiState.value.habits.firstOrNull { it.habit.id == habitId }?.isCompletedToday ?: false
            habitRepository.toggleHabitLog(userId, habitId, todayDate, !current)
        }
    }

    fun addHabit(name: String) {
        if (name.isBlank()) return
        viewModelScope.launch {
            habitRepository.createHabit(userId, name.trim())
        }
    }

    fun setRating(stars: Int) {
        viewModelScope.launch {
            val value = stars.coerceIn(1, 5)
            _uiState.update { it.copy(currentRating = value) }
            studyRepository.saveRating(userId, todayDate, value)
        }
    }

    fun toggleTask(dayIndex: Int, sessionIndex: Int, taskIndex: Int) {
        val key = "$dayIndex-$sessionIndex-$taskIndex"
        viewModelScope.launch {
            studyRepository.toggleTaskCheck(userId, key, !_uiState.value.checkedTasks.contains(key))
        }
    }

    fun toggleShaky(dayIndex: Int, sessionIndex: Int, taskIndex: Int, taskText: String, subject: String, date: String) {
        val key = "$dayIndex-$sessionIndex-$taskIndex"
        viewModelScope.launch {
            val flag = ShakyFlag("", userId, key, taskText, subject, date)
            studyRepository.toggleShakyFlag(userId, flag, !_uiState.value.shakyFlags.contains(key))
        }
    }
}
