package com.ese2027.studyos.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

class BlockingActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val blockedPackage = intent.getStringExtra("blocked_package") ?: ""
        val endTime = intent.getLongExtra("end_time", 0L)

        setContent {
            ESE2027Theme {
                BlockingScreen(
                    blockedPackage = blockedPackage,
                    endTime = endTime,
                    onExit = { finish() }
                )
            }
        }
    }

    override fun onBackPressed() {
        // Prevent back button
        moveTaskToBack(true)
    }
}

@Composable
fun BlockingScreen(
    blockedPackage: String,
    endTime: Long,
    onExit: () -> Unit
) {
    var remainingTime by remember { mutableStateOf("") }
    var holdProgress by remember { mutableStateOf(0f) }
    var isHolding by remember { mutableStateOf(false) }

    LaunchedEffect(endTime) {
        while (true) {
            val remaining = (endTime - System.currentTimeMillis()) / 1000
            if (remaining <= 0) {
                onExit()
                break
            }
            val minutes = remaining / 60
            val seconds = remaining % 60
            remainingTime = "$minutes:${seconds.toString().padStart(2, '0')}"
            delay(1000)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(32.dp)
        ) {
            Text(
                text = "FOCUS LOCKED",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFFD71921),
                letterSpacing = 2.sp
            )

            Spacer(modifier = Modifier.height(32.dp))

            Text(
                text = getAppName(blockedPackage),
                fontSize = 20.sp,
                color = Color.White,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "is blocked during your focus session.",
                fontSize = 14.sp,
                color = Color(0xFF5A5A5A),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(48.dp))

            Text(
                text = remainingTime,
                fontSize = 48.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                letterSpacing = 2.sp
            )

            Text(
                text = "REMAINING",
                fontSize = 10.sp,
                color = Color(0xFF5A5A5A),
                letterSpacing = 1.5.sp
            )

            Spacer(modifier = Modifier.height(64.dp))

            Text(
                text = "KEEP FOCUSING",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                letterSpacing = 1.sp
            )

            Spacer(modifier = Modifier.height(32.dp))

            Text(
                text = "Hold 5 seconds to exit",
                fontSize = 12.sp,
                color = Color(0xFF5A5A5A)
            )
        }
    }
}

private fun getAppName(packageName: String): String {
    return packageName.split(".").lastOrNull()?.replaceFirstChar { it.uppercase() } ?: packageName
}
