package com.ese2027.studyos.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

val LocalNothingColors = staticCompositionLocalOf { EmberTheme }

object NothingTheme {
    val colors: NothingThemeColors
        @Composable
        @ReadOnlyComposable
        get() = LocalNothingColors.current
}

@Composable
fun ESE2027Theme(
    themeId: String = "ember",
    content: @Composable () -> Unit
) {
    val nothingColors = getThemeById(themeId)

    val colorScheme = if (nothingColors.isLight) {
        lightColorScheme(
            primary = nothingColors.accent,
            onPrimary = nothingColors.accentInk,
            background = nothingColors.bg,
            onBackground = nothingColors.ink,
            surface = nothingColors.surface,
            onSurface = nothingColors.ink,
            outline = nothingColors.border,
            surfaceVariant = nothingColors.surfaceLift,
            onSurfaceVariant = nothingColors.inkSecondary
        )
    } else {
        darkColorScheme(
            primary = nothingColors.accent,
            onPrimary = nothingColors.accentInk,
            background = nothingColors.bg,
            onBackground = nothingColors.ink,
            surface = nothingColors.surface,
            onSurface = nothingColors.ink,
            outline = nothingColors.border,
            surfaceVariant = nothingColors.surfaceLift,
            onSurfaceVariant = nothingColors.inkSecondary
        )
    }

    val typography = createNothingTypography(nothingColors)

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window ?: return@SideEffect
            window.statusBarColor = nothingColors.bg.toArgb()
            window.navigationBarColor = nothingColors.bg.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = nothingColors.isLight
            WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = nothingColors.isLight
        }
    }

    CompositionLocalProvider(
        LocalNothingColors provides nothingColors
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = typography,
            content = content
        )
    }
}
