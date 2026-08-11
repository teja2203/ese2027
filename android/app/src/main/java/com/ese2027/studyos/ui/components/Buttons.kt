package com.ese2027.studyos.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ese2027.studyos.ui.theme.DataFontFamily
import com.ese2027.studyos.ui.theme.LocalNothingColors
import com.ese2027.studyos.ui.theme.NothingTheme

enum class NothingButtonVariant {
    SOLID_ACCENT,
    OUTLINE,
    GHOST,
    DANGER,
    VOID
}

@Composable
fun NothingButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: NothingButtonVariant = NothingButtonVariant.SOLID_ACCENT,
    enabled: Boolean = true,
    shape: Shape = RoundedCornerShape(8.dp),
    contentPadding: PaddingValues = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
    content: @Composable RowScope.() -> Unit
) {
    val colors = LocalNothingColors.current
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed && enabled) 0.97f else 1.0f,
        label = "button_scale"
    )

    val (containerColor, contentColor, border) = when (variant) {
        NothingButtonVariant.SOLID_ACCENT -> Triple(
            if (enabled) colors.accent else colors.surface,
            if (enabled) colors.accentInk else colors.inkTertiary,
            null
        )
        NothingButtonVariant.OUTLINE -> Triple(
            Color.Transparent,
            if (enabled) colors.ink else colors.inkTertiary,
            BorderStroke(1.dp, if (enabled) colors.borderSecondary else colors.border)
        )
        NothingButtonVariant.GHOST -> Triple(
            if (isPressed) colors.surfaceLift else Color.Transparent,
            if (enabled) colors.ink else colors.inkTertiary,
            null
        )
        NothingButtonVariant.DANGER -> Triple(
            Color(0xFFD71921),
            Color.White,
            null
        )
        NothingButtonVariant.VOID -> Triple(
            colors.surface,
            colors.ink,
            BorderStroke(1.dp, colors.border)
        )
    }

    Surface(
        onClick = onClick,
        modifier = modifier
            .scale(scale)
            .defaultMinSize(minHeight = 44.dp),
        enabled = enabled,
        shape = shape,
        color = containerColor,
        contentColor = contentColor,
        border = border,
        interactionSource = interactionSource
    ) {
        Row(
            modifier = Modifier.padding(contentPadding),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
            content = content
        )
    }
}
