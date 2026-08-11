package com.ese2027.studyos.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ese2027.studyos.data.local.TaskCheck
import com.ese2027.studyos.data.preferences.UserPreferences
import com.ese2027.studyos.data.repository.StudyRepository
import com.ese2027.studyos.data.schedule.DaySchedule
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

data class PlanUiState(
    val selectedDayIndex: Int = 0,
    val allDays: List<DaySchedule> = emptyList(),
    val currentDay: DaySchedule? = null,
    val checkedTasks: Set<String> = emptySet(), // Set of task keys "dayIndex-sessionIndex-taskIndex"
    val shakyFlags: Set<String> = emptySet(),
    val restDayBank: Int = 7,
    val isRestDay: Boolean = false,
    val expandedSlots: Set<Int> = setOf(0, 1, 2, 3, 4) // All slots expanded by default
)

class PlanViewModel(
    private val studyRepository: StudyRepository,
    private val userPreferences: UserPreferences,
    private val userId: String
) : ViewModel() {

    private val _uiState = MutableStateFlow(PlanUiState())
    val uiState: StateFlow<PlanUiState> = _uiState.asStateFlow()

    init {
        observeCheckedTasks()
        observeShakyFlags()
        // ScheduleData builds the complete 208-day plan. Do not construct it
        // from the Activity/Compose thread; on low-memory tablets that caused
        // multi-second stalls and skipped frames on first Plan navigation.
        viewModelScope.launch(Dispatchers.Default) {
            val days = studyRepository.getAllScheduleDays()
            _uiState.update { it.copy(allDays = days, currentDay = days.firstOrNull()) }
            observePreferences()
        }
    }

    private fun observeCheckedTasks() {
        viewModelScope.launch {
            studyRepository.getCheckedTasksFlow(userId).collect { list ->
                val checkedSet = list.filter { it.isChecked }.map { it.taskKey }.toSet()
                _uiState.update { it.copy(checkedTasks = checkedSet) }
            }
        }
    }

    private fun observeShakyFlags() {
        viewModelScope.launch {
            studyRepository.getShakyFlagsFlow(userId).collect { flags ->
                _uiState.update { it.copy(shakyFlags = flags.map { f -> f.taskKey }.toSet()) }
            }
        }
    }

    private fun observePreferences() {
        viewModelScope.launch {
            combine(
                userPreferences.lastViewedDayIndexFlow,
                userPreferences.restDayBankFlow
            ) { dayIdx, restDays ->
                Pair(dayIdx, restDays)
            }.collect { (dayIdx, restDays) ->
                val validIdx = dayIdx.coerceIn(0, (_uiState.value.allDays.size - 1).coerceAtLeast(0))
                val day = _uiState.value.allDays.getOrNull(validIdx)
                _uiState.update {
                    it.copy(
                        selectedDayIndex = validIdx,
                        currentDay = day,
                        restDayBank = restDays
                    )
                }
            }
        }
    }

    fun selectDay(index: Int) {
        val days = _uiState.value.allDays
        if (index in days.indices) {
            val day = days[index]
            _uiState.update { it.copy(selectedDayIndex = index, currentDay = day) }
            viewModelScope.launch {
                userPreferences.setLastViewedDayIndex(index)
            }
        }
    }

    fun toggleTask(sessionIndex: Int, taskIndex: Int) {
        val dayIndex = _uiState.value.selectedDayIndex
        val key = "$dayIndex-$sessionIndex-$taskIndex"
        val isCurrentlyChecked = _uiState.value.checkedTasks.contains(key)

        viewModelScope.launch {
            studyRepository.toggleTaskCheck(userId, key, !isCurrentlyChecked)
        }
    }

    fun toggleSlotExpanded(slotIndex: Int) {
        _uiState.update { current ->
            val set = current.expandedSlots.toMutableSet()
            if (set.contains(slotIndex)) set.remove(slotIndex) else set.add(slotIndex)
            current.copy(expandedSlots = set)
        }
    }

    fun toggleShaky(sessionIndex: Int, taskIndex: Int, taskText: String, subject: String, date: String) {
        val dayIndex = _uiState.value.selectedDayIndex
        val key = "$dayIndex-$sessionIndex-$taskIndex"
        viewModelScope.launch {
            val flag = com.ese2027.studyos.data.local.ShakyFlag("", userId, key, taskText, subject, date)
            studyRepository.toggleShakyFlag(userId, flag, !_uiState.value.shakyFlags.contains(key))
        }
    }
}
