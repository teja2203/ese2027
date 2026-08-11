package com.ese2027.studyos.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ese2027.studyos.data.local.Achievement
import com.ese2027.studyos.data.local.BlockedApp
import com.ese2027.studyos.data.local.BlockedWebsite
import com.ese2027.studyos.data.preferences.UserPreferences
import com.ese2027.studyos.data.repository.AchievementRepository
import com.ese2027.studyos.data.repository.BlockingRepository
import com.ese2027.studyos.data.repository.StudyRepository
import com.ese2027.studyos.data.sync.SyncManager
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.UUID

data class SettingsUiState(
    val currentTheme: String = "ember",
    val soundMode: String = "off",
    val soundVolume: Float = 0.4f,
    val notificationsEnabled: Boolean = true,
    val achievements: List<Achievement> = emptyList(),
    val unlockedCount: Int = 0,
    val blockedApps: List<BlockedApp> = emptyList(),
    val blockedWebsites: List<BlockedWebsite> = emptyList(),
    val shakyFlags: List<com.ese2027.studyos.data.local.ShakyFlag> = emptyList(),
    val isSyncing: Boolean = false,
    val syncMessage: String? = null
)

class SettingsViewModel(
    private val userPreferences: UserPreferences,
    private val achievementRepository: AchievementRepository,
    private val blockingRepository: BlockingRepository,
    private val studyRepository: StudyRepository,
    private val syncManager: SyncManager,
    private val userId: String
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        observeSettings()
    }

    private fun observeSettings() {
        viewModelScope.launch {
            combine(
                userPreferences.themeFlow,
                userPreferences.soundModeFlow,
                userPreferences.soundVolumeFlow,
                userPreferences.notificationsFlow
            ) { theme, sound, vol, notifs ->
                _uiState.update {
                    it.copy(
                        currentTheme = theme,
                        soundMode = sound,
                        soundVolume = vol,
                        notificationsEnabled = notifs
                    )
                }
            }.collect()
        }

        viewModelScope.launch {
            combine(
                achievementRepository.getAchievements(userId),
                achievementRepository.getUnlockedCountFlow(userId),
                blockingRepository.getBlockedApps(userId),
                blockingRepository.getBlockedWebsites(userId),
                studyRepository.getShakyFlagsFlow(userId)
            ) { achs, achCount, apps, websites, shaky ->
                _uiState.update {
                    it.copy(
                        achievements = achs,
                        unlockedCount = achCount,
                        blockedApps = apps,
                        blockedWebsites = websites,
                        shakyFlags = shaky
                    )
                }
            }.collect()
        }
    }

    fun setTheme(themeId: String) {
        viewModelScope.launch {
            userPreferences.setTheme(themeId)
        }
    }

    fun toggleNotifications(enabled: Boolean) {
        viewModelScope.launch {
            userPreferences.setNotifications(enabled)
        }
    }

    fun addBlockedWebsite(domain: String) {
        if (domain.isBlank()) return
        viewModelScope.launch {
            val website = BlockedWebsite(
                id = UUID.randomUUID().toString(),
                userId = userId,
                domain = domain.trim().lowercase(),
                isEnabled = true
            )
            blockingRepository.saveBlockedWebsite(website)
        }
    }

    fun deleteBlockedWebsite(id: String) {
        viewModelScope.launch {
            blockingRepository.deleteBlockedWebsite(id)
        }
    }

    fun addBlockedApp(packageName: String, appName: String = packageName) {
        val pkg = packageName.trim()
        if (pkg.isBlank()) return
        viewModelScope.launch {
            blockingRepository.saveBlockedApp(
                BlockedApp(
                    id = "$userId-$pkg",
                    userId = userId,
                    packageName = pkg,
                    appName = appName.trim().ifBlank { pkg },
                    isEnabled = true,
                    createdAt = System.currentTimeMillis(),
                    syncStatus = 1
                )
            )
        }
    }

    fun toggleBlockedApp(app: BlockedApp) {
        viewModelScope.launch {
            blockingRepository.updateBlockedApp(app.copy(isEnabled = !app.isEnabled, syncStatus = 1))
        }
    }

    fun deleteBlockedApp(id: String) {
        viewModelScope.launch { blockingRepository.deleteBlockedApp(id) }
    }

    fun clearShaky(flag: com.ese2027.studyos.data.local.ShakyFlag) {
        viewModelScope.launch { studyRepository.toggleShakyFlag(userId, flag, false) }
    }

    fun triggerManualSync() {
        viewModelScope.launch {
            _uiState.update { it.copy(isSyncing = true, syncMessage = null) }
            val result = syncManager.performFullSync()
            if (result.isSuccess) {
                _uiState.update {
                    it.copy(isSyncing = false, syncMessage = "Synchronized ${result.getOrNull() ?: 0} items successfully")
                }
            } else {
                _uiState.update {
                    it.copy(isSyncing = false, syncMessage = "Sync failed: ${result.exceptionOrNull()?.message}")
                }
            }
        }
    }
}
