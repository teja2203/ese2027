package com.ese2027.studyos.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

/** Brief red pixel celebration used when a task or habit is completed. */
@Composable
fun PixelBurst(trigger: Int, modifier: Modifier = Modifier) {
    var visible by remember { mutableStateOf(false) }
    val progress = remember { Animatable(0f) }
    LaunchedEffect(trigger) {
        if (trigger == 0) return@LaunchedEffect
        visible = true
        progress.snapTo(0f)
        progress.animateTo(1f, tween(700))
        delay(80)
        visible = false
    }
    if (!visible) return
    val particles = remember {
        listOf(
            floatArrayOf(0.50f, 0.36f, -0.24f, -0.80f),
            floatArrayOf(0.50f, 0.36f, 0.38f, -0.65f),
            floatArrayOf(0.50f, 0.36f, -0.52f, -0.30f),
            floatArrayOf(0.50f, 0.36f, 0.62f, -0.25f),
            floatArrayOf(0.50f, 0.36f, -0.44f, 0.42f),
            floatArrayOf(0.50f, 0.36f, 0.46f, 0.46f),
            floatArrayOf(0.50f, 0.36f, -0.08f, 0.72f),
            floatArrayOf(0.50f, 0.36f, 0.12f, -0.52f)
        )
    }
    Box(modifier.fillMaxSize()) {
        Canvas(Modifier.fillMaxSize()) {
            val t = progress.value
            val alpha = (1f - t).coerceIn(0f, 1f)
            particles.forEachIndexed { index, p ->
                val x = (p[0] * size.width) + p[2] * size.width * t * 0.30f
                val y = (p[1] * size.height) + p[3] * size.height * t * 0.24f
                val s = (5.dp.toPx() * (1f - t * 0.45f)).coerceAtLeast(2.dp.toPx())
                drawRect(Color(0xFFD71921).copy(alpha = alpha), androidx.compose.ui.geometry.Offset(x, y), androidx.compose.ui.geometry.Size(s, s), style = Fill)
            }
        }
    }
}
