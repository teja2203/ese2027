package com.ese2027.studyos.ui.theme

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color

/**
 * Nothing OS v4 Theme Tokens matching web css/app.css verbatim.
 */
@Immutable
data class NothingThemeColors(
    val id: String,
    val name: String,
    val bg: Color,
    val bgSecondary: Color,
    val surface: Color,
    val surfaceLift: Color,
    val border: Color,
    val borderSecondary: Color,
    val grid: Color,
    val gridSecondary: Color,
    val ink: Color,
    val inkSecondary: Color,
    val inkTertiary: Color,
    val inkMuted: Color,
    val accent: Color,
    val accentSecondary: Color,
    val accentInk: Color,
    val accentDim: Color,
    val isLight: Boolean
)

// Fixed status colors (never themed)
object FixedColors {
    val Fire0 = Color(0xFFFFE259)
    val Fire1 = Color(0xFFFFA32B)
    val Fire2 = Color(0xFFFF5A1F)
    val Fire3 = Color(0xFFEA3A0C)

    val Ice0 = Color(0xFFE0F2FE)
    val Ice1 = Color(0xFF7DD3FC)
    val Ice2 = Color(0xFF38BDF8)
    val Ice3 = Color(0xFF1D4ED8)

    val Heat0Dark = Color(0xFF171717)
    val Heat0Light = Color(0xFFE2E0DB)
    val Heat1 = Color(0xFFE5484D)
    val Heat2 = Color(0xFFF7931E)
    val Heat3 = Color(0xFFE3C94C)
    val Heat4 = Color(0xFF3FB950)

    val HotBadge = Color(0xFFD71921)
    val RestBadge = Color(0xFF8A8A85)
    val CoreBadge = Color(0xFFD71921)
}

// 1. Ember (Mono Black · Red Signal) - Default
val EmberTheme = NothingThemeColors(
    id = "ember",
    name = "Mono Black",
    bg = Color(0xFF000000),
    bgSecondary = Color(0xFF0A0A0A),
    surface = Color(0x0DFFFFFF),        // rgba(255,255,255,.05)
    surfaceLift = Color(0x17FFFFFF),    // rgba(255,255,255,.09)
    border = Color(0x29FFFFFF),         // rgba(255,255,255,.16)
    borderSecondary = Color(0x4DFFFFFF),// rgba(255,255,255,.30)
    grid = Color(0x17FFFFFF),           // rgba(255,255,255,.09)
    gridSecondary = Color(0x26FFFFFF),  // rgba(255,255,255,.15)
    ink = Color(0xFFF5F5F2),
    inkSecondary = Color(0xFFC7C7C2),
    inkTertiary = Color(0xFF8A8A85),
    inkMuted = Color(0xFF555550),
    accent = Color(0xFFD71921),
    accentSecondary = Color(0xFFE8322B),
    accentInk = Color(0xFFFFFFFF),
    accentDim = Color(0x24D71921),       // rgba(215,25,33,.14)
    isLight = false
)

// 2. Lime (Glyph Lime · Black / Lime Signal)
val LimeTheme = EmberTheme.copy(
    id = "lime",
    name = "Glyph Lime",
    accent = Color(0xFF9EEB3B),
    accentSecondary = Color(0xFFB7F55C),
    accentInk = Color(0xFF0A0A0A),
    accentDim = Color(0x249EEB3B)
)

// 3. Ice (Arctic Ice · Black / Ice-Blue Signal)
val IceTheme = EmberTheme.copy(
    id = "ice",
    name = "Arctic Ice",
    accent = Color(0xFF7FB8D9),
    accentSecondary = Color(0xFF9CCBE6),
    accentInk = Color(0xFF0A0A0A),
    accentDim = Color(0x247FB8D9)
)

// 4. Paper (Mono White · Ceramic White / Red Signal)
val PaperTheme = NothingThemeColors(
    id = "paper",
    name = "Mono White",
    bg = Color(0xFFF0EEE9),
    bgSecondary = Color(0xFFFAF9F6),
    surface = Color(0x0C14120E),        // rgba(20,18,14,.045)
    surfaceLift = Color(0x1214120E),    // rgba(20,18,14,.07)
    border = Color(0x2414120E),         // rgba(20,18,14,.14)
    borderSecondary = Color(0x4714120E),// rgba(20,18,14,.28)
    grid = Color(0x1214120E),           // rgba(20,18,14,.07)
    gridSecondary = Color(0x2114120E),  // rgba(20,18,14,.13)
    ink = Color(0xFF1A1A18),
    inkSecondary = Color(0xFF4A4A46),
    inkTertiary = Color(0xFF7C7A74),
    inkMuted = Color(0xFFA6A49E),
    accent = Color(0xFFC11218),
    accentSecondary = Color(0xFFA80F15),
    accentInk = Color(0xFFFFFFFF),
    accentDim = Color(0x1AC11218),
    isLight = true
)

fun getThemeById(id: String): NothingThemeColors {
    return when (id) {
        "lime" -> LimeTheme
        "ice" -> IceTheme
        "paper" -> PaperTheme
        else -> EmberTheme
    }
}
