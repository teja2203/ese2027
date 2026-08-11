package com.ese2027.studyos.ui.screens.you

import android.Manifest
import android.content.Intent
import android.net.VpnService
import android.os.Build
import androidx.activity.ComponentActivity
import androidx.core.app.ActivityCompat
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalContext
import com.ese2027.studyos.data.repository.AuthState
import com.ese2027.studyos.ui.components.NothingButton
import com.ese2027.studyos.ui.components.NothingButtonVariant
import com.ese2027.studyos.ui.components.NothingCard
import com.ese2027.studyos.ui.components.NothingDialog
import com.ese2027.studyos.ui.theme.LocalNothingColors
import com.ese2027.studyos.ui.viewmodel.AuthViewModel
import com.ese2027.studyos.ui.viewmodel.SettingsViewModel
import com.ese2027.studyos.util.PermissionUtils

val ALL_30_ACHIEVEMENTS = listOf(
    "first_session" to "First Focus Session",
    "first_day" to "Day One Done",
    "sessions10" to "10 Sessions",
    "sessions50" to "50 Sessions",
    "sessions150" to "150 Sessions",
    "streak3" to "3-Day Streak",
    "streak7" to "7-Day Streak",
    "streak30" to "30-Day Streak",
    "streak60" to "60-Day Streak",
    "streak100" to "100-Day Streak",
    "sstreak3" to "On Schedule ×3",
    "sstreak7" to "On Schedule ×7",
    "sstreak21" to "Slot Sniper",
    "hours10" to "10 Study Hours",
    "hours50" to "50 Study Hours",
    "hours100" to "100 Study Hours",
    "hours250" to "250 Study Hours",
    "hours500" to "500 Study Hours",
    "tasks100" to "100 Tasks Done",
    "tasks500" to "500 Tasks Done",
    "tasks1000" to "1000 Tasks Done",
    "tasks2000" to "2000 Tasks Done",
    "days10" to "10 Days Cleared",
    "days50" to "50 Days Cleared",
    "days100" to "100 Days Cleared",
    "mock1" to "First Mock Logged",
    "mock5" to "5 Mocks Logged",
    "mock15" to "15 Mocks Logged",
    "subject1" to "First Subject Mastered",
    "subject3" to "Three Subjects Down"
)

@Composable
fun YouScreen(
    settingsViewModel: SettingsViewModel,
    authViewModel: AuthViewModel,
    modifier: Modifier = Modifier
) {
    val settingsState by settingsViewModel.uiState.collectAsState()
    val authState by authViewModel.uiState.collectAsState()
    val colors = LocalNothingColors.current
    val context = LocalContext.current

    var showAddDomainDialog by remember { mutableStateOf(false) }
    var showAddAppDialog by remember { mutableStateOf(false) }
    var showAuthDialog by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        item {
            Text(
                text = "YOU & SETTINGS",
                style = MaterialTheme.typography.titleLarge,
                color = colors.ink
            )
            Text(
                text = "PREFERENCES · ACHIEVEMENTS · SYNC",
                style = MaterialTheme.typography.labelSmall,
                color = colors.inkTertiary
            )
        }

        // Theme Selector (4 Suits)
                item {
            NothingCard {
                Text(
                    text = "NOTHING OS THEME SUIT",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.inkTertiary
                )
                Spacer(modifier = Modifier.height(12.dp))

                val themes = listOf(
                    Triple("ember", "MONO BLACK", Color(0xFFD71921)),
                    Triple("lime", "GLYPH LIME", Color(0xFF9EEB3B)),
                    Triple("ice", "ARCTIC ICE", Color(0xFF7FB8D9)),
                    Triple("paper", "MONO WHITE", Color(0xFFC11218))
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    themes.forEach { (tId, tName, tColor) ->
                        val isSelected = settingsState.currentTheme == tId
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .clickable { settingsViewModel.setTheme(tId) },
                            shape = RoundedCornerShape(8.dp),
                            color = if (isSelected) colors.surfaceLift else colors.surface,
                            border = BorderStroke(1.dp, if (isSelected) colors.accent else colors.border)
                        ) {
                            Column(
                                modifier = Modifier.padding(vertical = 10.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(14.dp)
                                        .clip(CircleShape)
                                        .background(tColor)
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = tName.split(" ").first(),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (isSelected) colors.accent else colors.inkSecondary
                                )
                            }
                        }
                    }
                }
            }
        }

        // 30 Achievements Card
        item {
            val unlockedTypes = settingsState.achievements.map { it.achievementType }.toSet()
            NothingCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "30 ACHIEVEMENTS",
                        style = MaterialTheme.typography.titleSmall,
                        color = colors.ink
                    )
                    Text(
                        text = "${settingsState.unlockedCount} / 30 UNLOCKED",
                        style = MaterialTheme.typography.labelLarge,
                        color = colors.accent
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    ALL_30_ACHIEVEMENTS.forEach { (achKey, achTitle) ->
                        val isUnlocked = unlockedTypes.contains(achKey)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = if (isUnlocked) "🏆" else "🔒",
                                fontSize = 14.sp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = achTitle,
                                style = MaterialTheme.typography.bodySmall,
                                color = if (isUnlocked) colors.ink else colors.inkTertiary
                            )
                        }
                    }
                }
            }
        }

        // Distraction Blocking Manager
        item {
            NothingCard {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("REVISION QUEUE", style = MaterialTheme.typography.titleSmall, color = colors.ink)
                    Text("${settingsState.shakyFlags.size} SHAKY", style = MaterialTheme.typography.labelSmall, color = colors.accent)
                }
                Spacer(Modifier.height(8.dp))
                if (settingsState.shakyFlags.isEmpty()) {
                    Text("Nothing flagged. Tap ! on a task to queue it for revision.", style = MaterialTheme.typography.bodySmall, color = colors.inkTertiary)
                } else {
                    settingsState.shakyFlags.forEach { flag ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(flag.taskText, style = MaterialTheme.typography.bodySmall, color = colors.ink)
                                Text("${flag.subject} · ${flag.date}", style = MaterialTheme.typography.labelSmall, color = colors.inkTertiary)
                            }
                            TextButton(onClick = { settingsViewModel.clearShaky(flag) }) { Text("SOLID NOW", color = colors.accent) }
                        }
                    }
                }
            }
        }

        // Distraction Blocking Manager
        item {
            NothingCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "BLOCKED WEBSITES (VPN)",
                        style = MaterialTheme.typography.titleSmall,
                        color = colors.ink
                    )

                    NothingButton(
                        onClick = { showAddDomainDialog = true },
                        variant = NothingButtonVariant.OUTLINE,
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "Add Domain",
                            tint = colors.accent,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("ADD")
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                if (settingsState.blockedWebsites.isEmpty()) {
                    Text(
                        text = "No domains blocked. Add domains like 'youtube.com' to filter during focus.",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.inkTertiary
                    )
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        settingsState.blockedWebsites.forEach { site ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = site.domain,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = colors.ink
                                )
                                IconButton(
                                    onClick = { settingsViewModel.deleteBlockedWebsite(site.id) },
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Delete,
                                        contentDescription = "Delete",
                                        tint = colors.inkTertiary,
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Supabase Cloud Sync
        item {
            NothingCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "SUPABASE CLOUD SYNC",
                            style = MaterialTheme.typography.titleSmall,
                            color = colors.ink
                        )
                        Text(
                            text = if (authState.authState is AuthState.Authenticated) "Cloud backup connected" else "Offline local mode",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.inkTertiary
                        )
                    }

                    NothingButton(
                        onClick = { settingsViewModel.triggerManualSync() },
                        variant = NothingButtonVariant.SOLID_ACCENT,
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Sync",
                            tint = colors.accentInk,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("SYNC")
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
                when (val auth = authState.authState) {
                    is AuthState.Authenticated -> {
                        Text("SIGNED IN · ${auth.email ?: auth.userId}", style = MaterialTheme.typography.bodySmall, color = colors.accent)
                        NothingButton(onClick = { authViewModel.signOut() }, variant = NothingButtonVariant.GHOST,
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)) { Text("SIGN OUT") }
                    }
                    else -> {
                        Text("Sign in to synchronize progress across devices. Local Room data remains available offline.",
                            style = MaterialTheme.typography.bodySmall, color = colors.inkTertiary)
                        NothingButton(onClick = { showAuthDialog = true }, variant = NothingButtonVariant.OUTLINE,
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)) { Text("SIGN IN / SIGN UP") }
                    }
                }

                if (settingsState.syncMessage != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = settingsState.syncMessage ?: "",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.accent
                    )
                }
            }
        }

        // Native permissions and application blocking. These statuses are read
        // from Android itself, never inferred from a local toggle.
        item {
            NothingCard {
                Text("FOCUS PROTECTION", style = MaterialTheme.typography.titleSmall, color = colors.ink)
                Spacer(modifier = Modifier.height(8.dp))
                val accessibilityOn = PermissionUtils.isAccessibilityServiceEnabled(context)
                val vpnReady = PermissionUtils.isVpnPrepared(context)
                val notificationOn = PermissionUtils.isNotificationPermissionGranted(context)
                PermissionRow("App blocking", if (accessibilityOn) "ENABLED" else "ACTION REQUIRED", accessibilityOn, colors) {
                    PermissionUtils.openAccessibilitySettings(context)
                }
                PermissionRow("Website VPN", if (vpnReady) "READY" else "ACTION REQUIRED", vpnReady, colors) {
                    VpnService.prepare(context)?.let { context.startActivity(it) }
                }
                PermissionRow("Notifications", if (notificationOn) "ENABLED" else "ACTION REQUIRED", notificationOn, colors) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && context is ComponentActivity) {
                        ActivityCompat.requestPermissions(context, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 7001)
                    } else PermissionUtils.openNotificationSettings(context)
                }
            }
        }

        item {
            NothingCard {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("BLOCKED APPS", style = MaterialTheme.typography.titleSmall, color = colors.ink)
                    NothingButton(onClick = { showAddAppDialog = true }, variant = NothingButtonVariant.OUTLINE,
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)) { Text("ADD") }
                }
                Spacer(modifier = Modifier.height(8.dp))
                if (settingsState.blockedApps.isEmpty()) {
                    Text("No app rules yet. Add a package name, then enable Accessibility in Android settings.",
                        style = MaterialTheme.typography.bodySmall, color = colors.inkTertiary)
                } else {
                    settingsState.blockedApps.forEach { app ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(app.appName, style = MaterialTheme.typography.bodyMedium, color = colors.ink)
                                Text(app.packageName, style = MaterialTheme.typography.bodySmall, color = colors.inkTertiary)
                            }
                            Switch(checked = app.isEnabled, onCheckedChange = { settingsViewModel.toggleBlockedApp(app) })
                            IconButton(onClick = { settingsViewModel.deleteBlockedApp(app.id) }, modifier = Modifier.size(28.dp)) {
                                Icon(Icons.Default.Delete, "Delete", tint = colors.inkTertiary, modifier = Modifier.size(15.dp))
                            }
                        }
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
        }
    }

    if (showAddDomainDialog) {
        var domainText by remember { mutableStateOf("") }
        NothingDialog(
            onDismissRequest = { showAddDomainDialog = false },
            title = "Block Domain"
        ) {
            OutlinedTextField(
                value = domainText,
                onValueChange = { domainText = it },
                label = { Text("e.g. instagram.com") },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(16.dp))
            NothingButton(
                onClick = {
                    if (domainText.isNotBlank()) {
                        settingsViewModel.addBlockedWebsite(domainText)
                        showAddDomainDialog = false
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                variant = NothingButtonVariant.SOLID_ACCENT
            ) {
                Text("ADD DOMAIN")
            }
        }
    }

    if (showAddAppDialog) {
        var packageText by remember { mutableStateOf("") }
        var nameText by remember { mutableStateOf("") }
        NothingDialog(onDismissRequest = { showAddAppDialog = false }, title = "Block application") {
            OutlinedTextField(packageText, { packageText = it }, label = { Text("Package (e.g. com.instagram.android)") }, modifier = Modifier.fillMaxWidth())
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(nameText, { nameText = it }, label = { Text("Display name (optional)") }, modifier = Modifier.fillMaxWidth())
            Spacer(modifier = Modifier.height(16.dp))
            NothingButton(onClick = {
                if (packageText.isNotBlank()) {
                    settingsViewModel.addBlockedApp(packageText, nameText.ifBlank { packageText })
                    showAddAppDialog = false
                }
            }, modifier = Modifier.fillMaxWidth(), variant = NothingButtonVariant.SOLID_ACCENT) { Text("ADD APP RULE") }
        }
    }

    if (showAuthDialog) {
        var email by remember { mutableStateOf("") }
        var password by remember { mutableStateOf("") }
        var createAccount by remember { mutableStateOf(false) }
        NothingDialog(onDismissRequest = { showAuthDialog = false }, title = if (createAccount) "Create account" else "Sign in") {
            OutlinedTextField(email, { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth())
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(password, { password = it }, label = { Text("Password") }, modifier = Modifier.fillMaxWidth())
            Spacer(modifier = Modifier.height(12.dp))
            NothingButton(onClick = {
                if (email.isNotBlank() && password.length >= 6) {
                    if (createAccount) authViewModel.signUp(email.trim(), password) else authViewModel.signIn(email.trim(), password)
                    showAuthDialog = false
                }
            }, modifier = Modifier.fillMaxWidth(), variant = NothingButtonVariant.SOLID_ACCENT) {
                Text(if (createAccount) "CREATE ACCOUNT" else "SIGN IN")
            }
            Spacer(modifier = Modifier.height(8.dp))
            TextButton(onClick = { createAccount = !createAccount }) {
                Text(if (createAccount) "Already have an account? Sign in" else "Need an account? Sign up")
            }
            authState.errorMessage?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = colors.accent) }
        }
    }
}

@Composable
private fun PermissionRow(label: String, status: String, enabled: Boolean, colors: com.ese2027.studyos.ui.theme.NothingThemeColors, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 6.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = colors.ink)
        Text(status, style = MaterialTheme.typography.labelSmall, color = if (enabled) colors.accent else colors.inkTertiary)
    }
}
