package com.ese2027.studyos.ui.screens.today

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ese2027.studyos.data.schedule.SLOTS_DEFINITION
import com.ese2027.studyos.ui.components.*
import com.ese2027.studyos.ui.theme.LocalNothingColors
import com.ese2027.studyos.ui.viewmodel.TodayUiState
import com.ese2027.studyos.ui.viewmodel.TodayViewModel

@Composable
fun TodayScreen(
    viewModel: TodayViewModel,
    onNavigateToPlan: () -> Unit,
    onNavigateToFocus: () -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val colors = LocalNothingColors.current
    var showAddHabitDialog by remember { mutableStateOf(false) }
    var burst by remember { mutableIntStateOf(0) }
    var quoteIndex by remember { mutableIntStateOf(0) }
    val quotes = listOf(
        "Consistent daily execution is the difference between an aspirant and a ranker.",
        "The syllabus is shrinking. Keep the signal red.",
        "Momentum looks good on you."
    )

    Box(modifier.fillMaxSize()) {
      LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
      ) {
        item {
            WebTopDeck(modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(20.dp))
            Text("NIGHT SESSION · TEJA", style = MaterialTheme.typography.labelSmall, color = colors.inkTertiary)
            Text("SUN AUG 9", fontFamily = com.ese2027.studyos.ui.theme.NdotFontFamily, fontSize = 38.sp, color = colors.ink)
        }

        if (false) {
        // Legacy native header; the web command deck above is the source of truth.
        // Hero Header
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "ESE2027 STUDY OS",
                        style = MaterialTheme.typography.titleLarge,
                        color = colors.ink
                    )
                    Text(
                        text = "${uiState.currentDate.uppercase()} · TODAY'S FOCUS",
                        style = MaterialTheme.typography.labelSmall,
                        color = colors.inkTertiary
                    )
                }

                NothingButton(
                    onClick = onNavigateToFocus,
                    variant = NothingButtonVariant.SOLID_ACCENT,
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = "Start Focus",
                        tint = colors.accentInk,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("FOCUS")
                }
            }
        }

        }

        if (false) {
        // Countdowns Row
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                CountdownPill(
                    label = "APTRANSCO",
                    daysLeft = uiState.aptDaysLeft,
                    modifier = Modifier.weight(1f),
                    tier = BadgeTier.HOT
                )
                CountdownPill(
                    label = "ESE 2027",
                    daysLeft = uiState.eseDaysLeft,
                    modifier = Modifier.weight(1f),
                    tier = BadgeTier.CORE
                )
            }
        }

        }

        // Current-session hero — the web Today screen's primary action
        item {
            val schedule = uiState.todaySchedule
            val dayIndex = schedule?.dayIndex ?: 0
            val pair = schedule?.sessions?.mapIndexed { index, session -> index to session }
                ?.firstOrNull { (index, session) -> session.tasks.indices.any { taskIndex -> !uiState.checkedTasks.contains("$dayIndex-$index-$taskIndex") } }
                ?: schedule?.sessions?.mapIndexed { index, session -> index to session }?.lastOrNull()
            val currentIndex = pair?.first ?: 0
            val currentSession = pair?.second
            if (currentSession != null) {
                val done = currentSession.tasks.indices.count { taskIndex -> uiState.checkedTasks.contains("$dayIndex-$currentIndex-$taskIndex") }
                val allDone = done == currentSession.tasks.size
                NothingCard {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(if (allDone) "SESSION CLEARED" else "STUDY NOW", style = MaterialTheme.typography.labelSmall, color = colors.accent)
                        Text("S${currentIndex + 1}", style = MaterialTheme.typography.labelSmall, color = colors.inkTertiary)
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(currentSession.title, style = MaterialTheme.typography.titleLarge, color = colors.ink)
                    Text("${currentSession.tasks.size} TASKS · $done DONE · ${if (currentSession.tasks.isEmpty()) 0 else done * 100 / currentSession.tasks.size}%", style = MaterialTheme.typography.labelSmall, color = colors.inkTertiary)
                    Spacer(Modifier.height(8.dp))
                    currentSession.tasks.forEachIndexed { taskIndex, task ->
                        val key = "$dayIndex-$currentIndex-$taskIndex"
                        val checked = uiState.checkedTasks.contains(key)
                        Row(Modifier.fillMaxWidth().clickable { if (!checked) burst++; viewModel.toggleTask(dayIndex, currentIndex, taskIndex) }.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                            Surface(Modifier.size(18.dp), RoundedCornerShape(4.dp), color = if (checked) colors.accent else colors.surface, border = BorderStroke(1.dp, if (checked) colors.accent else colors.border)) {
                                if (checked) Icon(Icons.Default.Check, "Done", tint = colors.accentInk, modifier = Modifier.padding(2.dp))
                            }
                            Spacer(Modifier.width(8.dp))
                            Text(task, style = MaterialTheme.typography.bodySmall, color = if (checked) colors.inkTertiary else colors.ink, modifier = Modifier.weight(1f))
                            Text("!", style = MaterialTheme.typography.labelLarge, color = if (uiState.shakyFlags.contains(key)) colors.accent else colors.inkTertiary, modifier = Modifier.clickable { viewModel.toggleShaky(dayIndex, currentIndex, taskIndex, task, schedule?.subject.orEmpty(), schedule?.date.orEmpty()) })
                        }
                    }
                    NothingButton(onClick = onNavigateToFocus, variant = NothingButtonVariant.SOLID_ACCENT, modifier = Modifier.fillMaxWidth()) {
                        Text(if (allDone) "REVIEW IN FOCUS" else "ENTER FOCUS SPACE")
                    }
                }
            }
        }

        // Today's Study Metrics Card
        item {
            NothingCard {
                Text(
                    text = "TODAY'S STUDY LOG",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.inkTertiary
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "${uiState.todayMinutes} MIN",
                            style = MaterialTheme.typography.displayMedium,
                            color = colors.accent
                        )
                        Text(
                            text = "${uiState.todaySessions} Sessions logged today",
                            style = MaterialTheme.typography.bodyMedium,
                            color = colors.inkSecondary
                        )
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "TOTAL PREP",
                            style = MaterialTheme.typography.labelSmall,
                            color = colors.inkTertiary
                        )
                        Text(
                            text = "${uiState.totalStudyMinutes / 60}h ${uiState.totalStudyMinutes % 60}m",
                            style = MaterialTheme.typography.titleMedium,
                            color = colors.ink
                        )
                    }
                }
            }
        }

        item {
            NothingCard(onClick = { quoteIndex = (quoteIndex + 1) % quotes.size }) {
                Text("\"${quotes[quoteIndex]}\"", style = MaterialTheme.typography.bodyMedium, color = colors.ink)
                Spacer(Modifier.height(6.dp))
                Text("— ESE TOPPER INSIGHT · TAP TO CYCLE", style = MaterialTheme.typography.labelSmall, color = colors.inkTertiary)
            }
        }

        if (false) {
        // legacy slot timetable retained only for Plan; web Today uses the current-session hero above
        // 5 Daily Schedule Slots
        item {
            NothingSectionHeader(title = "TODAY'S 5-SLOT TIMETABLE")
        }

        val schedule = uiState.todaySchedule
        if (schedule != null) {
            items(schedule.sessions.take(5)) { session ->
                val sessionIndex = schedule.sessions.indexOf(session)
                val slotDef = SLOTS_DEFINITION.getOrNull(sessionIndex)

                NothingCard(
                    onClick = onNavigateToPlan
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = slotDef?.icon ?: "📖",
                                fontSize = 18.sp
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = "${slotDef?.label} · ${slotDef?.time}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = colors.inkTertiary
                                )
                                Text(
                                    text = session.title,
                                    style = MaterialTheme.typography.titleSmall,
                                    color = colors.ink
                                )
                            }
                        }

                        SubjectTagBadge(tag = session.tag, label = session.tag)
                    }
                }
            }
        }

        }

        if (false) {
        // Habits and ratings live on the web Progress route, not Today.
        // Daily Habits Checklist
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "DAILY HABITS",
                    style = MaterialTheme.typography.titleSmall,
                    color = colors.ink
                )

                NothingButton(
                    onClick = { showAddHabitDialog = true },
                    variant = NothingButtonVariant.GHOST,
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Add Habit",
                        tint = colors.accent,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("ADD")
                }
            }
        }

        if (uiState.habits.isEmpty()) {
            item {
                NothingCard {
                    Text(
                        text = "No habits added yet. Tap 'ADD' to create daily habits (e.g. Formula sheet review, 8 hrs sleep).",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.inkTertiary
                    )
                }
            }
        } else {
            items(uiState.habits) { habitWithStatus ->
                NothingCard(
                    onClick = {
                        if (!habitWithStatus.isCompletedToday) burst++
                        viewModel.toggleHabit(habitWithStatus.habit.id)
                    }
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = habitWithStatus.habit.name,
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (habitWithStatus.isCompletedToday) colors.inkTertiary else colors.ink
                        )

                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = if (habitWithStatus.isCompletedToday) colors.accent else colors.surface,
                            border = BorderStroke(1.dp, if (habitWithStatus.isCompletedToday) colors.accent else colors.border),
                            modifier = Modifier.size(20.dp)
                        ) {
                            if (habitWithStatus.isCompletedToday) {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = "Done",
                                    tint = colors.accentInk,
                                    modifier = Modifier.padding(2.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Daily Self Rating
        item {
            NothingCard {
                Text(
                    text = "DAILY RATING",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.inkTertiary
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    for (star in 1..5) {
                        val isSelected = uiState.currentRating >= star
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 4.dp)
                                .clickable { viewModel.setRating(star) },
                            shape = RoundedCornerShape(6.dp),
                            color = if (isSelected) colors.accentDim else colors.surface,
                            border = BorderStroke(1.dp, if (isSelected) colors.accent else colors.border)
                        ) {
                            Text(
                                text = "★ $star",
                                style = MaterialTheme.typography.labelMedium,
                                color = if (isSelected) colors.accent else colors.inkTertiary,
                                modifier = Modifier.padding(vertical = 8.dp),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                        }
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
        }
        }
      }
      PixelBurst(trigger = burst)
    }

    if (showAddHabitDialog) {
        var habitName by remember { mutableStateOf("") }
        NothingDialog(
            onDismissRequest = { showAddHabitDialog = false },
            title = "Add Daily Habit"
        ) {
            OutlinedTextField(
                value = habitName,
                onValueChange = { habitName = it },
                label = { Text("Habit name (e.g. Formula Review)") },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(16.dp))
            NothingButton(
                onClick = {
                    if (habitName.isNotBlank()) {
                        viewModel.addHabit(habitName)
                        showAddHabitDialog = false
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                variant = NothingButtonVariant.SOLID_ACCENT
            ) {
                Text("ADD HABIT")
            }
        }
    }
}
