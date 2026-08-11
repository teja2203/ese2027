package com.ese2027.studyos.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PointMode
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Renders the Nothing OS dot matrix canvas background (22dp dot grid).
 */
fun Modifier.dotGridBackground(
    gridColor: Color,
    backgroundColor: Color,
    gridSpacing: Dp = 22.dp,
    dotRadius: Dp = 1.dp
): Modifier = this
    .background(backgroundColor)
    .drawWithCache {
        val spacingPx = gridSpacing.toPx()
        val radiusPx = dotRadius.toPx()
        val width = size.width
        val height = size.height
        val points = buildList {
            var x = 0f
            while (x < width) {
                var y = 0f
                while (y < height) {
                    add(Offset(x, y))
                    y += spacingPx
                }
                x += spacingPx
            }
        }
        onDrawBehind {
            drawPoints(points, PointMode.Points, gridColor, strokeWidth = radiusPx * 2f)
        }
    }

@Composable
fun DotMatrixContainer(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    val colors = LocalNothingColors.current
    Box(
        modifier = modifier
            .fillMaxSize()
            .dotGridBackground(
                gridColor = colors.gridSecondary,
                backgroundColor = colors.bg
            )
    ) {
        content()
    }
}
