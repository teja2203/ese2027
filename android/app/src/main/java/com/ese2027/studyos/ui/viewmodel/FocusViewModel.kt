package com.ese2027.studyos.ui.viewmodel

import android.content.Context
import android.content.Intent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ese2027.studyos.data.local.FocusSessionEntity
import com.ese2027.studyos.data.preferences.UserPreferences
import com.ese2027.studyos.data.repository.FocusRepository
import com.ese2027.studyos.data.repository.StudyRepository
import com.ese2027.studyos.service.FocusTimerService
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

data class FocusUiState(
    val isRunning: Boolean = false,
    val isPaused: Boolean = false,
    val phase: String = "work",        // "work" or "break"
    val durationMinutes: Int = 50,
    val breakMinutes: Int = 10,
    val remainingSeconds: Int = 50 * 60,
    val strictMode: Boolean = false,
    val soundMode: String = "off",     // "off", "brown", "pink", "sol528"
    val soundVolume: Float = 0.4f,
    val loop: Boolean = true,
    val holdCancelProgress: Float = 0f,
    val activeSession: FocusSessionEntity? = null
)

class FocusViewModel(
    private val focusRepository: FocusRepository,
    private val studyRepository: StudyRepository,
    private val userPreferences: UserPreferences,
    private val userId: String
) : ViewModel() {

    private val _uiState = MutableStateFlow(FocusUiState())
    val uiState: StateFlow<FocusUiState> = _uiState.asStateFlow()

    private var localTimerJob: Job? = null

    init {
        observeActiveSession()
        observePreferences()
    }

    private fun observeActiveSession() {
        viewModelScope.launch {
            focusRepository.getActiveSessionFlow(userId).collect { session ->
                if (session != null) {
                    val remaining = if (session.status == "paused") {
                        session.timeLeft.coerceAtLeast(0)
                    } else {
                        ((session.endTime - System.currentTimeMillis()) / 1000).toInt().coerceAtLeast(0)
                    }
                    _uiState.update {
                        it.copy(
                            isRunning = session.status == "active",
                            isPaused = session.status == "paused",
                            phase = session.phase,
                            durationMinutes = session.duration,
                            remainingSeconds = remaining,
                            strictMode = session.strictMode,
                            soundMode = session.soundMode,
                            loop = session.loop,
                            activeSession = session
                        )
                    }
                    if (session.status == "active") {
                        startLocalCountdown(session.endTime)
                    } else {
                        localTimerJob?.cancel()
                    }
                } else {
                    _uiState.update {
                        it.copy(
                            isRunning = false,
                            isPaused = false,
                            remainingSeconds = it.durationMinutes * 60,
                            activeSession = null
                        )
                    }
                    localTimerJob?.cancel()
                }
            }
        }
    }

    private fun observePreferences() {
        viewModelScope.launch {
            combine(
                userPreferences.soundModeFlow,
                userPreferences.soundVolumeFlow,
                userPreferences.strictModeFlow
            ) { mode, vol, strict ->
                Triple(mode, vol, strict)
            }.collect { (mode, vol, strict) ->
                _uiState.update {
                    it.copy(soundMode = mode, soundVolume = vol, strictMode = strict)
                }
            }
        }
    }

    private fun startLocalCountdown(endTimeMs: Long) {
        localTimerJob?.cancel()
        localTimerJob = viewModelScope.launch {
            while (true) {
                val now = System.currentTimeMillis()
                val remaining = ((endTimeMs - now) / 1000).toInt()
                if (remaining <= 0) {
                    _uiState.update { it.copy(remainingSeconds = 0, isRunning = false) }
                    break
                }
                _uiState.update { it.copy(remainingSeconds = remaining) }
                delay(500)
            }
        }
    }

    fun selectPreset(workMins: Int, breakMins: Int) {
        if (_uiState.value.isRunning) return
        _uiState.update {
            it.copy(
                durationMinutes = workMins,
                breakMinutes = breakMins,
                remainingSeconds = if (it.phase == "work") workMins * 60 else breakMins * 60
            )
        }
    }

    fun setSoundMode(mode: String) {
        viewModelScope.launch {
            userPreferences.setSoundMode(mode)
        }
    }

    fun setSoundMode(mode: String, context: Context) {
        setSoundMode(mode)
        if (_uiState.value.isRunning || _uiState.value.isPaused) {
            context.startService(Intent(context, FocusTimerService::class.java).apply {
                action = FocusTimerService.ACTION_SOUND
                putExtra(FocusTimerService.EXTRA_SOUND_MODE, mode)
                putExtra(FocusTimerService.EXTRA_SOUND_VOLUME, _uiState.value.soundVolume)
            })
        }
    }

    fun setSoundVolume(vol: Float) {
        viewModelScope.launch {
            userPreferences.setSoundVolume(vol)
        }
    }

    fun toggleStrictMode(enabled: Boolean) {
        if (_uiState.value.isRunning) return
        viewModelScope.launch {
            userPreferences.setStrictMode(enabled)
        }
    }

    fun startSession(context: Context) {
        val duration = _uiState.value.durationMinutes
        val strict = _uiState.value.strictMode
        val intent = Intent(context, FocusTimerService::class.java).apply {
            action = FocusTimerService.ACTION_START
            putExtra(FocusTimerService.EXTRA_DURATION, duration)
            putExtra(FocusTimerService.EXTRA_STRICT_MODE, strict)
            putExtra(FocusTimerService.EXTRA_BREAK_DURATION, _uiState.value.breakMinutes)
            putExtra(FocusTimerService.EXTRA_LOOP, _uiState.value.loop)
            putExtra(FocusTimerService.EXTRA_SOUND_MODE, _uiState.value.soundMode)
            putExtra(FocusTimerService.EXTRA_SOUND_VOLUME, _uiState.value.soundVolume)
        }
        context.startForegroundService(intent)
    }

    fun pauseSession(context: Context) {
        val intent = Intent(context, FocusTimerService::class.java).apply {
            action = FocusTimerService.ACTION_PAUSE
        }
        context.startService(intent)
    }

    fun stopSession(context: Context) {
        val intent = Intent(context, FocusTimerService::class.java).apply {
            action = FocusTimerService.ACTION_STOP
            putExtra(FocusTimerService.EXTRA_FORCE_STOP, true)
        }
        context.startService(intent)
    }

    fun skipPhase(context: Context) {
        context.startService(Intent(context, FocusTimerService::class.java).apply { action = FocusTimerService.ACTION_SKIP })
    }

    fun setPhase(phase: String) {
        if (_uiState.value.isRunning) return
        _uiState.update { it.copy(phase = phase, remainingSeconds = if (phase == "work") it.durationMinutes * 60 else it.breakMinutes * 60) }
    }

    fun adjustDuration(work: Boolean, delta: Int) {
        if (_uiState.value.isRunning) return
        _uiState.update {
            if (work) {
                val v = (it.durationMinutes + delta).coerceIn(5, 180)
                it.copy(durationMinutes = v, remainingSeconds = if (it.phase == "work") v * 60 else it.remainingSeconds)
            } else {
                val v = (it.breakMinutes + delta).coerceIn(1, 60)
                it.copy(breakMinutes = v, remainingSeconds = if (it.phase == "break") v * 60 else it.remainingSeconds)
            }
        }
    }

    fun toggleLoop() {
        if (_uiState.value.isRunning) return
        _uiState.update { it.copy(loop = !it.loop) }
    }

    fun updateHoldCancelProgress(progress: Float) {
        _uiState.update { it.copy(holdCancelProgress = progress) }
    }
}
