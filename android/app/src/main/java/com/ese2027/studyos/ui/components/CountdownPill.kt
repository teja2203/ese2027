package com.ese2027.studyos.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.ese2027.studyos.ui.theme.FixedColors
import com.ese2027.studyos.ui.theme.LocalNothingColors

enum class BadgeTier {
    HOT,   // Mock tests, grand tests, exam day -> Red signal
    CORE,  // Standard syllabus topic -> Dim Red / Accent
    REST   // Recovery, revision, taper -> Dim Grey
}

@Composable
fun CountdownPill(
    label: String,
    daysLeft: Int,
    modifier: Modifier = Modifier,
    tier: BadgeTier = BadgeTier.CORE
) {
    val colors = LocalNothingColors.current

    val (badgeBg, badgeBorder, textColor) = when (tier) {
        BadgeTier.HOT -> Triple(
            colors.accentDim,
            colors.accent,
            colors.accent
        )
        BadgeTier.CORE -> Triple(
            colors.surfaceLift,
            colors.border,
            colors.ink
        )
        BadgeTier.REST -> Triple(
            colors.surface,
            colors.border,
            colors.inkTertiary
        )
    }

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(100.dp),
        color = badgeBg,
        border = BorderStroke(1.dp, badgeBorder)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = colors.inkTertiary
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = "${daysLeft}D",
                style = MaterialTheme.typography.labelLarge,
                color = textColor
            )
        }
    }
}

@Composable
fun SubjectTagBadge(
    tag: String,
    label: String,
    modifier: Modifier = Modifier
) {
    val colors = LocalNothingColors.current
    val isHot = tag in listOf("pyq", "mock")

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(4.dp),
        color = if (isHot) colors.accentDim else colors.surfaceLift,
        border = BorderStroke(1.dp, if (isHot) colors.accent else colors.border)
    ) {
        Text(
            text = label.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = if (isHot) colors.accent else colors.inkSecondary,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
        )
    }
}
