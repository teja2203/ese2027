package com.ese2027.studyos.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Headphones
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Whatshot
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ese2027.studyos.ui.theme.DataFontFamily
import com.ese2027.studyos.ui.theme.LocalNothingColors
import com.ese2027.studyos.ui.theme.NdotFontFamily
import java.time.Duration
import java.time.ZonedDateTime
import java.time.ZoneId

@Composable
fun WebTopDeck(
    modifier: Modifier = Modifier,
    onSound: () -> Unit = {},
    onTheme: () -> Unit = {}
) {
    val colors = LocalNothingColors.current
    val target = ZonedDateTime.of(2027, 1, 31, 9, 0, 0, 0, ZoneId.systemDefault())
    val days = (Duration.between(ZonedDateTime.now(), target).toHours() / 24).toInt().coerceAtLeast(0)
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = Color.Transparent,
        border = BorderStroke(1.dp, colors.borderSecondary)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("ESE", fontFamily = NdotFontFamily, fontSize = 23.sp, color = colors.ink)
                Text("//", fontFamily = NdotFontFamily, fontSize = 23.sp, color = colors.accent)
                Text("2027", fontFamily = NdotFontFamily, fontSize = 23.sp, color = colors.ink)
                Spacer(Modifier.width(14.dp))
                Surface(shape = RoundedCornerShape(8.dp), color = Color.Transparent, border = BorderStroke(1.dp, colors.borderSecondary)) {
                    Text("${days} D", fontFamily = DataFontFamily, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = colors.inkSecondary, modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp))
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = RoundedCornerShape(8.dp), color = colors.accentDim, border = BorderStroke(1.dp, colors.accent)) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp)) {
                        Icon(Icons.Default.Whatshot, null, tint = colors.accent, modifier = Modifier.width(14.dp))
                        Text("1D", fontFamily = DataFontFamily, fontSize = 10.sp, color = colors.accent)
                    }
                }
                IconButton(onClick = onSound) { Icon(Icons.Default.Headphones, "Ambient sound", tint = colors.inkSecondary) }
                IconButton(onClick = onTheme) { Icon(Icons.Default.LightMode, "Theme", tint = colors.inkSecondary) }
            }
        }
    }
}
