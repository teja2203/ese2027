package com.ese2027.studyos.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.ese2027.studyos.R

// Font families
val NdotFontFamily = FontFamily(
    Font(R.font.ndot_57_aligned, FontWeight.Normal)
)

val UiFontFamily = FontFamily.SansSerif
val DataFontFamily = FontFamily.Monospace

fun createNothingTypography(colors: NothingThemeColors): Typography {
    return Typography(
        // Display - large Ndot countdown numbers & streak values
        displayLarge = TextStyle(
            fontFamily = NdotFontFamily,
            fontWeight = FontWeight.Normal,
            fontSize = 48.sp,
            lineHeight = 52.sp,
            letterSpacing = 0.5.sp,
            color = colors.ink
        ),
        displayMedium = TextStyle(
            fontFamily = NdotFontFamily,
            fontWeight = FontWeight.Normal,
            fontSize = 36.sp,
            lineHeight = 40.sp,
            letterSpacing = 0.5.sp,
            color = colors.ink
        ),
        displaySmall = TextStyle(
            fontFamily = NdotFontFamily,
            fontWeight = FontWeight.Normal,
            fontSize = 28.sp,
            lineHeight = 32.sp,
            letterSpacing = 0.25.sp,
            color = colors.ink
        ),

        // Title - Screen headers, card titles
        titleLarge = TextStyle(
            fontFamily = UiFontFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 22.sp,
            lineHeight = 28.sp,
            letterSpacing = 0.sp,
            color = colors.ink
        ),
        titleMedium = TextStyle(
            fontFamily = UiFontFamily,
            fontWeight = FontWeight.SemiBold,
            fontSize = 16.sp,
            lineHeight = 22.sp,
            letterSpacing = 0.15.sp,
            color = colors.ink
        ),
        titleSmall = TextStyle(
            fontFamily = UiFontFamily,
            fontWeight = FontWeight.Medium,
            fontSize = 14.sp,
            lineHeight = 20.sp,
            letterSpacing = 0.1.sp,
            color = colors.ink
        ),

        // Body - Task descriptions, body text
        bodyLarge = TextStyle(
            fontFamily = UiFontFamily,
            fontWeight = FontWeight.Normal,
            fontSize = 14.sp,
            lineHeight = 20.sp,
            letterSpacing = 0.25.sp,
            color = colors.ink
        ),
        bodyMedium = TextStyle(
            fontFamily = UiFontFamily,
            fontWeight = FontWeight.Normal,
            fontSize = 12.sp,
            lineHeight = 16.sp,
            letterSpacing = 0.25.sp,
            color = colors.inkSecondary
        ),
        bodySmall = TextStyle(
            fontFamily = UiFontFamily,
            fontWeight = FontWeight.Normal,
            fontSize = 11.sp,
            lineHeight = 14.sp,
            letterSpacing = 0.4.sp,
            color = colors.inkTertiary
        ),

        // Label - Monospace data, badges, slot tags, timestamps
        labelLarge = TextStyle(
            fontFamily = DataFontFamily,
            fontWeight = FontWeight.Medium,
            fontSize = 12.sp,
            lineHeight = 16.sp,
            letterSpacing = 0.5.sp,
            color = colors.ink
        ),
        labelMedium = TextStyle(
            fontFamily = DataFontFamily,
            fontWeight = FontWeight.Medium,
            fontSize = 10.sp,
            lineHeight = 14.sp,
            letterSpacing = 0.75.sp,
            color = colors.inkSecondary
        ),
        labelSmall = TextStyle(
            fontFamily = DataFontFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 9.sp,
            lineHeight = 12.sp,
            letterSpacing = 1.2.sp,
            color = colors.inkTertiary
        )
    )
}
