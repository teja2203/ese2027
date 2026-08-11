package com.ese2027.studyos.ui.screens.focus

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ese2027.studyos.ui.components.NothingButton
import com.ese2027.studyos.ui.components.NothingButtonVariant
import com.ese2027.studyos.ui.components.NothingCard
import com.ese2027.studyos.ui.theme.LocalNothingColors
import com.ese2027.studyos.ui.viewmodel.FocusViewModel
import kotlinx.coroutines.delay

@Composable
fun FocusScreen(
    viewModel: FocusViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val colors = LocalNothingColors.current
    val context = LocalContext.current

    val minutes = uiState.remainingSeconds / 60
    val seconds = uiState.remainingSeconds % 60
    val timeFormatted = String.format("%02d:%02d", minutes, seconds)
    val scrollState = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "FOCUS TIMER",
                style = MaterialTheme.typography.titleLarge,
                color = colors.ink
            )

            Surface(
                shape = RoundedCornerShape(100.dp),
                color = if (uiState.isRunning) colors.accentDim else colors.surfaceLift,
                border = BorderStroke(1.dp, if (uiState.isRunning) colors.accent else colors.border)
            ) {
                Text(
                    text = uiState.phase.uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = if (uiState.isRunning) colors.accent else colors.inkSecondary,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("work" to "FOCUS ${uiState.durationMinutes}M", "break" to "BREAK ${uiState.breakMinutes}M").forEach { (phase, label) ->
                Surface(
                    modifier = Modifier.weight(1f).clickable(enabled = !uiState.isRunning) { viewModel.setPhase(phase) },
                    shape = RoundedCornerShape(8.dp),
                    color = if (uiState.phase == phase) colors.accentDim else colors.surface,
                    border = BorderStroke(1.dp, if (uiState.phase == phase) colors.accent else colors.border)
                ) { Text(label, style = MaterialTheme.typography.labelSmall, color = if (uiState.phase == phase) colors.accent else colors.inkTertiary, modifier = Modifier.padding(vertical = 10.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center) }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Large Digital Clock
        NothingCard(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = timeFormatted,
                    style = MaterialTheme.typography.displayLarge,
                    color = if (uiState.isRunning) colors.accent else colors.ink,
                    letterSpacing = 2.sp
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = if (uiState.isRunning) "SESSION IN PROGRESS" else "READY TO START",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.inkTertiary
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Presets (Only enabled when not running)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            val presets = listOf(
                Triple("25 · 5", 25, 5),
                Triple("50 · 10", 50, 10),
                Triple("90 · 20", 90, 20)
            )

            presets.forEach { (label, work, brk) ->
                val isSelected = uiState.durationMinutes == work
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .clickable(enabled = !uiState.isRunning) {
                            viewModel.selectPreset(work, brk)
                        },
                    shape = RoundedCornerShape(8.dp),
                    color = if (isSelected) colors.surfaceLift else colors.surface,
                    border = BorderStroke(1.dp, if (isSelected) colors.accent else colors.border)
                ) {
                    Text(
                        text = label,
                        style = MaterialTheme.typography.labelLarge,
                        color = if (isSelected) colors.accent else colors.inkSecondary,
                        modifier = Modifier.padding(vertical = 10.dp),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(Triple(true, "FOCUS MIN", uiState.durationMinutes), Triple(false, "BREAK MIN", uiState.breakMinutes)).forEach { item ->
                val isWork = item.first
                val label = item.second
                val value = item.third
                NothingCard(modifier = Modifier.weight(1f)) {
                    Text(label, style = MaterialTheme.typography.labelSmall, color = colors.inkTertiary)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("$value", style = MaterialTheme.typography.titleMedium, color = colors.ink)
                        Column {
                            Text("+", modifier = Modifier.clickable(enabled = !uiState.isRunning) { viewModel.adjustDuration(isWork, 5) }.padding(4.dp), color = colors.accent)
                            Text("−", modifier = Modifier.clickable(enabled = !uiState.isRunning) { viewModel.adjustDuration(isWork, -5) }.padding(4.dp), color = colors.inkTertiary)
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        NothingCard {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("AUTO LOOP", style = MaterialTheme.typography.titleSmall, color = colors.ink)
                    Text("FOCUS → BREAK → FOCUS", style = MaterialTheme.typography.bodySmall, color = colors.inkTertiary)
                }
                Switch(checked = uiState.loop, onCheckedChange = { viewModel.toggleLoop() }, enabled = !uiState.isRunning)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Ambient Sound Selector
        NothingCard {
            Text(
                text = "AMBIENT FOCUS SOUND",
                style = MaterialTheme.typography.labelSmall,
                color = colors.inkTertiary
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                val soundModes = listOf(
                    "off" to "OFF",
                    "brown" to "BROWN",
                    "pink" to "PINK",
                    "sol528" to "528 Hz"
                )

                soundModes.forEach { (modeId, modeLabel) ->
                    val isSelected = uiState.soundMode == modeId
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { viewModel.setSoundMode(modeId, context) },
                        shape = RoundedCornerShape(6.dp),
                        color = if (isSelected) colors.accentDim else colors.surface,
                        border = BorderStroke(1.dp, if (isSelected) colors.accent else colors.border)
                    ) {
                        Text(
                            text = modeLabel,
                            style = MaterialTheme.typography.labelSmall,
                            color = if (isSelected) colors.accent else colors.inkTertiary,
                            modifier = Modifier.padding(vertical = 8.dp),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Strict Mode Switch
        NothingCard {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "STRICT MODE",
                        style = MaterialTheme.typography.titleSmall,
                        color = colors.ink
                    )
                    Text(
                        text = "Blocks exit & requires 3s hold to cancel",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.inkTertiary
                    )
                }

                Switch(
                    checked = uiState.strictMode,
                    onCheckedChange = { viewModel.toggleStrictMode(it) },
                    enabled = !uiState.isRunning,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = colors.accentInk,
                        checkedTrackColor = colors.accent,
                        uncheckedThumbColor = colors.inkTertiary,
                        uncheckedTrackColor = colors.surfaceLift
                    )
                )
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        // Timer Controls
        if (!uiState.isRunning && !uiState.isPaused) {
            NothingButton(
                onClick = { viewModel.startSession(context) },
                modifier = Modifier.fillMaxWidth(),
                variant = NothingButtonVariant.SOLID_ACCENT
            ) {
                Text("START FOCUS (${uiState.durationMinutes} MIN)")
            }
        } else {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (uiState.isRunning) {
                    NothingButton(
                        onClick = { viewModel.pauseSession(context) },
                        modifier = Modifier.weight(1f),
                        variant = NothingButtonVariant.OUTLINE
                    ) {
                        Text("PAUSE")
                    }
                } else {
                    NothingButton(
                        onClick = { viewModel.startSession(context) },
                        modifier = Modifier.weight(1f),
                        variant = NothingButtonVariant.SOLID_ACCENT
                    ) {
                        Text("RESUME")
                    }
                }

                NothingButton(
                    onClick = { viewModel.skipPhase(context) },
                    modifier = Modifier.weight(1f),
                    variant = NothingButtonVariant.OUTLINE
                ) { Text("SKIP") }

                if (uiState.strictMode) {
                    var holdProgress by remember { mutableStateOf(0f) }
                    var isHolding by remember { mutableStateOf(false) }

                    LaunchedEffect(isHolding) {
                        if (isHolding) {
                            val start = System.currentTimeMillis()
                            while (isHolding) {
                                val elapsed = System.currentTimeMillis() - start
                                holdProgress = (elapsed / 3000f).coerceIn(0f, 1f)
                                if (holdProgress >= 1f) {
                                    viewModel.stopSession(context)
                                    holdProgress = 0f
                                    isHolding = false
                                    break
                                }
                                delay(50)
                            }
                        } else {
                            holdProgress = 0f
                        }
                    }

                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .pointerInput(Unit) {
                                detectTapGestures(
                                    onPress = {
                                        isHolding = true
                                        tryAwaitRelease()
                                        isHolding = false
                                    }
                                )
                            },
                        shape = RoundedCornerShape(8.dp),
                        color = colors.surfaceLift,
                        border = BorderStroke(1.dp, colors.accent)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 12.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = if (isHolding) "HOLD ${(3 - (holdProgress * 3)).toInt()}S..." else "HOLD TO CANCEL",
                                style = MaterialTheme.typography.labelLarge,
                                color = colors.accent
                            )
                        }
                    }
                } else {
                    NothingButton(
                        onClick = { viewModel.stopSession(context) },
                        modifier = Modifier.weight(1f),
                        variant = NothingButtonVariant.DANGER
                    ) {
                        Text("STOP")
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}
