package com.ese2027.studyos.ui.screens.progress

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ese2027.studyos.ui.components.NothingButton
import com.ese2027.studyos.ui.components.NothingButtonVariant
import com.ese2027.studyos.ui.components.NothingCard
import com.ese2027.studyos.ui.components.NothingDialog
import com.ese2027.studyos.ui.theme.FixedColors
import com.ese2027.studyos.ui.theme.LocalNothingColors
import com.ese2027.studyos.ui.viewmodel.ProgressViewModel

@Composable
fun ProgressScreen(
    viewModel: ProgressViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val colors = LocalNothingColors.current
    var showAddMockDialog by remember { mutableStateOf(false) }
    var showAddHabitDialog by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        item {
            Text(
                text = "PROGRESS & STATS",
                style = MaterialTheme.typography.titleLarge,
                color = colors.ink
            )
            Text(
                text = "CONSISTENCY OVER TIME",
                style = MaterialTheme.typography.labelSmall,
                color = colors.inkTertiary
            )
        }

        item {
            val pct = if (uiState.totalTasks == 0) 0 else uiState.tasksDone * 100 / uiState.totalTasks
            NothingCard {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text("OVERALL COMPLETE", style = MaterialTheme.typography.labelSmall, color = colors.inkTertiary)
                        Text("$pct%", style = MaterialTheme.typography.displayMedium, color = colors.accent)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text("${uiState.tasksDone} / ${uiState.totalTasks} TASKS", style = MaterialTheme.typography.labelLarge, color = colors.ink)
                        Text("${uiState.daysCleared} DAYS CLEARED · ${uiState.totalSessions} SESSIONS", style = MaterialTheme.typography.labelSmall, color = colors.inkTertiary)
                    }
                }
            }
        }

        // Streak Card
        item {
            NothingCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "ACTIVE STREAK",
                            style = MaterialTheme.typography.labelSmall,
                            color = colors.inkTertiary
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "🔥 ${uiState.currentStreak}",
                                style = MaterialTheme.typography.displayMedium,
                                color = FixedColors.Fire2
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "DAYS",
                                style = MaterialTheme.typography.labelLarge,
                                color = colors.ink
                            )
                        }
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "BEST RECORD",
                            style = MaterialTheme.typography.labelSmall,
                            color = colors.inkTertiary
                        )
                        Text(
                            text = "${uiState.bestStreak} DAYS",
                            style = MaterialTheme.typography.titleMedium,
                            color = colors.ink
                        )
                    }
                }
            }
        }

        item {
            NothingCard {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("HABITS · DAILY CHECKLIST", style = MaterialTheme.typography.titleSmall, color = colors.ink)
                    NothingButton(onClick = { showAddHabitDialog = true }, variant = NothingButtonVariant.GHOST, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 3.dp)) { Text("+ ADD") }
                }
                if (uiState.habits.isEmpty()) {
                    Text("No habits yet — add your first one below.", style = MaterialTheme.typography.bodySmall, color = colors.inkTertiary)
                } else {
                    uiState.habits.forEach { habit ->
                        Row(Modifier.fillMaxWidth().clickable { viewModel.toggleHabit(habit.habit.id) }.padding(vertical = 6.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text(habit.habit.name, style = MaterialTheme.typography.bodyMedium, color = if (habit.isCompletedToday) colors.inkTertiary else colors.ink)
                            Text(if (habit.isCompletedToday) "DONE" else "OPEN", style = MaterialTheme.typography.labelSmall, color = if (habit.isCompletedToday) colors.accent else colors.inkTertiary)
                        }
                    }
                }
            }
        }

        // 70-Day Heatmap Grid
        item {
            NothingCard {
                Text(
                    text = "STUDY HEATMAP (LAST 70 DAYS)",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.inkTertiary
                )
                Spacer(modifier = Modifier.height(12.dp))

                // 10 columns x 7 rows grid
                val days = uiState.heatmapDays
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    for (col in 0 until 10) {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            for (row in 0 until 7) {
                                val index = (col * 7) + row
                                val day = days.getOrNull(index)
                                val intensity = day?.intensity ?: 0

                                val cellColor = when (intensity) {
                                    4 -> colors.accent
                                    3 -> FixedColors.Heat3
                                    2 -> FixedColors.Heat2
                                    1 -> FixedColors.Heat1
                                    else -> if (colors.isLight) FixedColors.Heat0Light else FixedColors.Heat0Dark
                                }

                                Box(
                                    modifier = Modifier
                                        .size(14.dp)
                                        .clip(RoundedCornerShape(2.dp))
                                        .background(cellColor)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Mock Scores Header & Add Button
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "MOCK TEST SCORES",
                    style = MaterialTheme.typography.titleMedium,
                    color = colors.ink
                )

                NothingButton(
                    onClick = { showAddMockDialog = true },
                    variant = NothingButtonVariant.OUTLINE,
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Add Mock Score",
                        tint = colors.accent,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("LOG SCORE")
                }
            }
        }

        // Mock Score List
        if (uiState.mockScores.isEmpty()) {
            item {
                NothingCard {
                    Text(
                        text = "No mock test scores logged yet.\nTap 'LOG SCORE' to track your test series results.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.inkTertiary
                    )
                }
            }
        } else {
            items(uiState.mockScores) { mock ->
                NothingCard {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = mock.name.uppercase(),
                                style = MaterialTheme.typography.titleSmall,
                                color = colors.ink
                            )
                            Text(
                                text = "${mock.date} · -${mock.negative} Negative",
                                style = MaterialTheme.typography.bodySmall,
                                color = colors.inkTertiary
                            )
                        }

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            val percentage = if (mock.max > 0) (mock.score / mock.max * 100).toInt() else 0
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = colors.accentDim,
                                border = BorderStroke(1.dp, colors.accent)
                            ) {
                                Text(
                                    text = "${mock.score}/${mock.max} ($percentage%)",
                                    style = MaterialTheme.typography.labelLarge,
                                    color = colors.accent,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }

                            Spacer(modifier = Modifier.width(8.dp))

                            IconButton(
                                onClick = { viewModel.deleteMockScore(mock.id) },
                                modifier = Modifier.size(28.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Delete,
                                    contentDescription = "Delete score",
                                    tint = colors.inkTertiary,
                                    modifier = Modifier.size(16.dp)
                                )
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

    if (showAddMockDialog) {
        var testName by remember { mutableStateOf("") }
        var scoreStr by remember { mutableStateOf("") }
        var maxStr by remember { mutableStateOf("100") }
        var negStr by remember { mutableStateOf("0") }

        NothingDialog(
            onDismissRequest = { showAddMockDialog = false },
            title = "Log Mock Test"
        ) {
            OutlinedTextField(
                value = testName,
                onValueChange = { testName = it },
                label = { Text("Test Series / Subject") },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = scoreStr,
                onValueChange = { scoreStr = it },
                label = { Text("Score Obtained") },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = maxStr,
                    onValueChange = { maxStr = it },
                    label = { Text("Max Marks") },
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = negStr,
                    onValueChange = { negStr = it },
                    label = { Text("Negative Marks") },
                    modifier = Modifier.weight(1f)
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            NothingButton(
                onClick = {
                    val score = scoreStr.toFloatOrNull() ?: 0f
                    val max = maxStr.toFloatOrNull() ?: 100f
                    val neg = negStr.toFloatOrNull() ?: 0f
                    if (testName.isNotBlank()) {
                        viewModel.addMockScore(testName, score, max, neg)
                        showAddMockDialog = false
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                variant = NothingButtonVariant.SOLID_ACCENT
            ) {
                Text("SAVE SCORE")
            }
        }
    }

    if (showAddHabitDialog) {
        var habitName by remember { mutableStateOf("") }
        NothingDialog(onDismissRequest = { showAddHabitDialog = false }, title = "Add Daily Habit") {
            OutlinedTextField(habitName, { habitName = it }, label = { Text("Habit name") }, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(12.dp))
            NothingButton(onClick = { if (habitName.isNotBlank()) { viewModel.addHabit(habitName); showAddHabitDialog = false } }, modifier = Modifier.fillMaxWidth(), variant = NothingButtonVariant.SOLID_ACCENT) { Text("ADD HABIT") }
        }
    }
}
