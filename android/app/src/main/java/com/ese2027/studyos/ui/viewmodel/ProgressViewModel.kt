package com.ese2027.studyos.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ese2027.studyos.data.local.MockScore
import com.ese2027.studyos.data.local.StudySession
import com.ese2027.studyos.data.repository.MockScoreRepository
import com.ese2027.studyos.data.repository.StudyRepository
import com.ese2027.studyos.data.repository.HabitRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.time.LocalDate
import java.util.*

data class HeatmapDay(
    val dateStr: String,
    val intensity: Int // 0 to 4
)

data class ProgressUiState(
    val totalMinutes: Int = 0,
    val currentStreak: Int = 0,
    val bestStreak: Int = 0,
    val mockScores: List<MockScore> = emptyList(),
    val heatmapDays: List<HeatmapDay> = emptyList(),
    val averageDailyMinutes: Int = 0,
    val tasksDone: Int = 0,
    val totalTasks: Int = 0,
    val daysCleared: Int = 0,
    val totalSessions: Int = 0,
    val habits: List<com.ese2027.studyos.ui.viewmodel.HabitWithStatus> = emptyList()
)

class ProgressViewModel(
    private val studyRepository: StudyRepository,
    private val mockScoreRepository: MockScoreRepository,
    private val habitRepository: HabitRepository,
    private val userId: String
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProgressUiState())
    val uiState: StateFlow<ProgressUiState> = _uiState.asStateFlow()

    init {
        observeProgressData()
        observeHabits()
    }

    private fun observeHabits() {
        val date = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        viewModelScope.launch {
            combine(habitRepository.getHabits(userId), habitRepository.getHabitLogsForDateFlow(userId, date)) { habits, logs ->
                val done = logs.filter { it.completed }.map { it.habitId }.toSet()
                habits.map { HabitWithStatus(it, done.contains(it.id)) }
            }.collect { _uiState.update { state -> state.copy(habits = it) } }
        }
    }

    fun toggleHabit(habitId: String) {
        val date = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        viewModelScope.launch {
            val current = _uiState.value.habits.firstOrNull { it.habit.id == habitId }?.isCompletedToday ?: false
            habitRepository.toggleHabitLog(userId, habitId, date, !current)
        }
    }

    fun addHabit(name: String) { if (name.isNotBlank()) viewModelScope.launch { habitRepository.createHabit(userId, name.trim()) } }

    private fun observeProgressData() {
        viewModelScope.launch {
            combine(
                studyRepository.getStudySessions(userId),
                mockScoreRepository.getMockScores(userId),
                studyRepository.getCheckedTasksFlow(userId)
            ) { sessions, mocks, checks ->
                val totalMin = sessions.sumOf { it.minutes }
                val (currStreak, maxStreak) = calculateStreaks(sessions)
                val heatmap = generateHeatmap(sessions)
                val avg = if (sessions.isNotEmpty()) totalMin / sessions.size else 0
                val allDays = studyRepository.getAllScheduleDays()
                val totalTasks = allDays.sumOf { day -> day.sessions.sumOf { it.tasks.size } }
                val checked = checks.filter { it.isChecked }.map { it.taskKey }.toSet()
                val tasksDone = checked.size
                val daysCleared = allDays.count { day ->
                    day.sessions.flatMapIndexed { si, s -> s.tasks.mapIndexed { ti, _ -> "${day.dayIndex}-$si-$ti" } }.all { checked.contains(it) }
                }

                ProgressUiState(
                    totalMinutes = totalMin,
                    currentStreak = currStreak,
                    bestStreak = maxStreak,
                    mockScores = mocks,
                    heatmapDays = heatmap,
                    averageDailyMinutes = avg,
                    tasksDone = tasksDone,
                    totalTasks = totalTasks,
                    daysCleared = daysCleared,
                    totalSessions = sessions.sumOf { it.sessions }
                )
            }.collect { state ->
                _uiState.value = state
            }
        }
    }

    private fun calculateStreaks(sessions: List<StudySession>): Pair<Int, Int> {
        if (sessions.isEmpty()) return Pair(0, 0)
        val activeDates = sessions.filter { it.minutes > 0 }.map { it.date }.toSet()

        var current = 0
        var max = 0
        var tempStreak = 0

        var checkDate = LocalDate.now()
        // Check today / yesterday for current streak
        if (activeDates.contains(checkDate.toString())) {
            while (activeDates.contains(checkDate.toString())) {
                current++
                checkDate = checkDate.minusDays(1)
            }
        } else if (activeDates.contains(checkDate.minusDays(1).toString())) {
            checkDate = checkDate.minusDays(1)
            while (activeDates.contains(checkDate.toString())) {
                current++
                checkDate = checkDate.minusDays(1)
            }
        }

        max = current.coerceAtLeast(max)
        return Pair(current, max)
    }

    private fun generateHeatmap(sessions: List<StudySession>): List<HeatmapDay> {
        val map = sessions.associate { it.date to it.minutes }
        val list = mutableListOf<HeatmapDay>()

        // Generate past 70 days for compact mobile matrix
        val start = LocalDate.now().minusDays(69)
        var curr = start
        val today = LocalDate.now()

        while (!curr.isAfter(today)) {
            val dateStr = curr.toString()
            val mins = map[dateStr] ?: 0
            val intensity = when {
                mins >= 180 -> 4
                mins >= 120 -> 3
                mins >= 60 -> 2
                mins > 0 -> 1
                else -> 0
            }
            list.add(HeatmapDay(dateStr, intensity))
            curr = curr.plusDays(1)
        }
        return list
    }

    fun addMockScore(name: String, score: Float, max: Float, negative: Float) {
        viewModelScope.launch {
            val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val scoreObj = MockScore(
                id = UUID.randomUUID().toString(),
                userId = userId,
                name = name,
                score = score,
                max = max,
                negative = negative,
                date = dateFormat.format(Date())
            )
            mockScoreRepository.addMockScore(scoreObj)
        }
    }

    fun deleteMockScore(id: String) {
        viewModelScope.launch {
            mockScoreRepository.deleteMockScore(id)
        }
    }
}
