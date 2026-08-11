package com.ese2027.studyos.util

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.ese2027.studyos.R
import com.ese2027.studyos.service.ReminderReceiver
import com.ese2027.studyos.ui.MainActivity
import java.util.Calendar

object NotificationHelper {

    const val CHANNEL_FOCUS_TIMER = "focus_timer_channel"
    const val CHANNEL_FOCUS_COMPLETE = "focus_complete_channel"
    const val CHANNEL_SLOT_REMINDERS = "slot_reminders_channel"
    const val CHANNEL_ACHIEVEMENTS = "achievements_channel"
    const val CHANNEL_PROTECTION = "focus_protection_channel"

    fun showWebNotification(context: Context, title: String, body: String, kind: String = "session") {
        val channel = if (kind == "achievement" || kind == "day") CHANNEL_ACHIEVEMENTS else CHANNEL_FOCUS_COMPLETE
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            (System.currentTimeMillis() % 100000).toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_EVENT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify((System.currentTimeMillis() % 1_000_000).toInt(), notification)
    }

    fun createNotificationChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val timerChannel = NotificationChannel(
                CHANNEL_FOCUS_TIMER,
                "Focus Timer",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Ongoing focus countdown timer notification"
            }

            val completeChannel = NotificationChannel(
                CHANNEL_FOCUS_COMPLETE,
                "Focus Session Complete",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alerts when a focus session is finished"
                enableVibration(true)
            }

            val slotChannel = NotificationChannel(
                CHANNEL_SLOT_REMINDERS,
                "Daily Study Slot Reminders",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Reminders for scheduled study slots (8:30, 11:00, 3:00, 6:30, 9:30)"
                enableVibration(true)
            }

            val achievementChannel = NotificationChannel(
                CHANNEL_ACHIEVEMENTS,
                "Achievements",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Celebration alerts for unlocked study badges"
            }

            val protectionChannel = NotificationChannel(
                CHANNEL_PROTECTION,
                "Focus Protection",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Ongoing focus lock and website shield notifications"
            }

            notificationManager.createNotificationChannels(
                listOf(timerChannel, completeChannel, slotChannel, achievementChannel, protectionChannel)
            )
        }
    }

    fun showSlotReminderNotification(context: Context, slotIndex: Int, slotTitle: String, slotTime: String) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            slotIndex,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_SLOT_REMINDERS)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Slot ${slotIndex + 1} Starting ($slotTime)")
            .setContentText(slotTitle)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(2000 + slotIndex, notification)
    }

    fun scheduleAllDailySlotAlarms(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        // 5 Slot schedule: 8:30, 11:00, 15:00, 18:30, 21:30
        val slots = listOf(
            Triple(0, 8, 30),
            Triple(1, 11, 0),
            Triple(2, 15, 0),
            Triple(3, 18, 30),
            Triple(4, 21, 30)
        )

        slots.forEach { (slotIdx, hour, minute) ->
            val calendar = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                if (before(Calendar.getInstance())) {
                    add(Calendar.DAY_OF_YEAR, 1)
                }
            }

            val intent = Intent(context, ReminderReceiver::class.java).apply {
                putExtra("slot_index", slotIdx)
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                100 + slotIdx,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        calendar.timeInMillis,
                        pendingIntent
                    )
                } else {
                    alarmManager.setExact(
                        AlarmManager.RTC_WAKEUP,
                        calendar.timeInMillis,
                        pendingIntent
                    )
                }
            } catch (e: SecurityException) {
                // If exact alarms are not permitted, fallback to standard set
                alarmManager.set(
                    AlarmManager.RTC_WAKEUP,
                    calendar.timeInMillis,
                    pendingIntent
                )
            }
        }
    }
}
