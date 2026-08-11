package com.ese2027.studyos.ui.screens.plan

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ese2027.studyos.data.schedule.SLOTS_DEFINITION
import com.ese2027.studyos.ui.components.BadgeTier
import com.ese2027.studyos.ui.components.CountdownPill
import com.ese2027.studyos.ui.components.NothingCard
import com.ese2027.studyos.ui.components.PixelBurst
import com.ese2027.studyos.ui.components.SubjectTagBadge
import com.ese2027.studyos.ui.components.WebTopDeck
import com.ese2027.studyos.ui.theme.LocalNothingColors
import com.ese2027.studyos.ui.viewmodel.PlanUiState
import com.ese2027.studyos.ui.viewmodel.PlanViewModel

@Composable
fun PlanScreen(
    viewModel: PlanViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val colors = LocalNothingColors.current
    val listState = rememberLazyListState()
    val dayStripState = rememberLazyListState()
    var burst by remember { mutableIntStateOf(0) }

    LaunchedEffect(uiState.selectedDayIndex, uiState.allDays.size) {
        if (uiState.allDays.isNotEmpty()) {
            dayStripState.scrollToItem(uiState.selectedDayIndex.coerceIn(0, uiState.allDays.lastIndex))
        }
    }

    Box(modifier.fillMaxSize()) {
      Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 16.dp)
      ) {
        WebTopDeck(modifier = Modifier.padding(horizontal = 16.dp))
        Spacer(Modifier.height(18.dp))
        // Top Bar: Screen Title & Rest Day Bank Pill
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "PLAN.",
                    style = MaterialTheme.typography.titleLarge,
                    color = colors.ink
                )
                Text(
                    text = "${uiState.currentDay?.subject ?: "STUDY PLAN"}",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.accent
                )
            }

            Surface(
                shape = RoundedCornerShape(100.dp),
                color = colors.surfaceLift,
                border = BorderStroke(1.dp, colors.border)
            ) {
                Text(
                    text = "BANK: ${uiState.restDayBank} REST DAYS",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.inkSecondary,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Horizontal 208-Day Carousel
        LazyRow(
            state = dayStripState,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(end = 16.dp)
        ) {
            itemsIndexed(uiState.allDays) { index, day ->
                val isSelected = index == uiState.selectedDayIndex
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (isSelected) colors.accent else colors.surface,
                    border = BorderStroke(1.dp, if (isSelected) colors.accent else colors.border),
                    modifier = Modifier.clickable { viewModel.selectDay(index) }
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "D${index + 1}",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (isSelected) colors.accentInk else colors.inkTertiary
                        )
                        Text(
                            text = day.date,
                            style = MaterialTheme.typography.labelLarge,
                            color = if (isSelected) colors.accentInk else colors.ink
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Selected Day Details
        val day = uiState.currentDay
        if (day != null) {
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Day Header Card
                item {
                    NothingCard {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "${day.day.uppercase()} · ${day.date.uppercase()}",
                                style = MaterialTheme.typography.labelSmall,
                                color = colors.inkTertiary
                            )
                            SubjectTagBadge(tag = "badge", label = day.badge)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = day.subject,
                            style = MaterialTheme.typography.titleLarge,
                            color = colors.ink
                        )
                    }
                }

                // 5 Session Slots
                itemsIndexed(day.sessions) { sessionIndex, session ->
                    val slotDef = SLOTS_DEFINITION.getOrNull(sessionIndex)
                    val isExpanded = uiState.expandedSlots.contains(sessionIndex)

                    NothingCard {
                        // Slot Header
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { viewModel.toggleSlotExpanded(sessionIndex) },
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = slotDef?.icon ?: "📖",
                                    fontSize = 18.sp
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Column {
                                    Text(
                                        text = "${slotDef?.label ?: "Slot ${sessionIndex + 1}"} · ${slotDef?.time ?: ""}",
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

                            Icon(
                                imageVector = if (isExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                contentDescription = "Toggle slot",
                                tint = colors.inkTertiary
                            )
                        }

                        // Tasks list
                        AnimatedVisibility(visible = isExpanded) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 12.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                session.tasks.forEachIndexed { taskIndex, taskText ->
                                    val key = "${uiState.selectedDayIndex}-$sessionIndex-$taskIndex"
                                    val isChecked = uiState.checkedTasks.contains(key)

                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(6.dp))
                                            .clickable {
                                                if (!isChecked) burst++
                                                viewModel.toggleTask(sessionIndex, taskIndex)
                                            }
                                            .padding(vertical = 6.dp, horizontal = 4.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Surface(
                                            shape = RoundedCornerShape(4.dp),
                                            color = if (isChecked) colors.accent else colors.surface,
                                            border = BorderStroke(1.dp, if (isChecked) colors.accent else colors.border),
                                            modifier = Modifier.size(20.dp)
                                        ) {
                                            if (isChecked) {
                                                Icon(
                                                    imageVector = Icons.Default.Check,
                                                    contentDescription = "Checked",
                                                    tint = colors.accentInk,
                                                    modifier = Modifier.padding(2.dp)
                                                )
                                            }
                                        }

                                        Spacer(modifier = Modifier.width(10.dp))

                                        Text(
                                            text = taskText,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = if (isChecked) colors.inkTertiary else colors.ink
                                        )
                                        IconButton(
                                            onClick = {
                                                viewModel.toggleShaky(
                                                    sessionIndex,
                                                    taskIndex,
                                                    taskText,
                                                    day.subject,
                                                    day.date
                                                )
                                            },
                                            modifier = Modifier.size(28.dp)
                                        ) {
                                            Text(
                                                text = "!",
                                                style = MaterialTheme.typography.labelLarge,
                                                color = if (uiState.shakyFlags.contains(key)) colors.accent else colors.inkTertiary
                                            )
                                        }
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
        }
      }
      PixelBurst(trigger = burst)
    }
}
