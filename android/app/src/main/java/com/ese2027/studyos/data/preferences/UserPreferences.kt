package com.ese2027.studyos.data.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "ese2027_preferences")

class UserPreferences(private val context: Context) {

    companion object {
        val THEME_KEY = stringPreferencesKey("app_theme")
        val SOUND_MODE_KEY = stringPreferencesKey("sound_mode")
        val SOUND_VOLUME_KEY = floatPreferencesKey("sound_volume")
        val STRICT_MODE_KEY = booleanPreferencesKey("strict_mode")
        val NOTIFICATIONS_KEY = booleanPreferencesKey("notifications_enabled")
        val REST_DAY_BANK_KEY = intPreferencesKey("rest_day_bank")
        val LAST_BACKUP_KEY = stringPreferencesKey("last_backup")
        val LAST_VIEWED_DAY_INDEX = intPreferencesKey("last_viewed_day_index")
    }

    val themeFlow: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[THEME_KEY] ?: "ember"
    }

    suspend fun setTheme(themeId: String) {
        context.dataStore.edit { preferences ->
            preferences[THEME_KEY] = themeId
        }
    }

    val soundModeFlow: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[SOUND_MODE_KEY] ?: "off"
    }

    suspend fun setSoundMode(mode: String) {
        context.dataStore.edit { preferences ->
            preferences[SOUND_MODE_KEY] = mode
        }
    }

    val soundVolumeFlow: Flow<Float> = context.dataStore.data.map { preferences ->
        preferences[SOUND_VOLUME_KEY] ?: 0.4f
    }

    suspend fun setSoundVolume(volume: Float) {
        context.dataStore.edit { preferences ->
            preferences[SOUND_VOLUME_KEY] = volume
        }
    }

    val strictModeFlow: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[STRICT_MODE_KEY] ?: false
    }

    suspend fun setStrictMode(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[STRICT_MODE_KEY] = enabled
        }
    }

    val notificationsFlow: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[NOTIFICATIONS_KEY] ?: true
    }

    suspend fun setNotifications(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[NOTIFICATIONS_KEY] = enabled
        }
    }

    val restDayBankFlow: Flow<Int> = context.dataStore.data.map { preferences ->
        preferences[REST_DAY_BANK_KEY] ?: 7
    }

    suspend fun setRestDayBank(days: Int) {
        context.dataStore.edit { preferences ->
            preferences[REST_DAY_BANK_KEY] = days
        }
    }

    val lastViewedDayIndexFlow: Flow<Int> = context.dataStore.data.map { preferences ->
        preferences[LAST_VIEWED_DAY_INDEX] ?: 0
    }

    suspend fun setLastViewedDayIndex(index: Int) {
        context.dataStore.edit { preferences ->
            preferences[LAST_VIEWED_DAY_INDEX] = index
        }
    }
}
