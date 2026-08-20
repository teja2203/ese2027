package com.ese2027.studyos.util

import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.ese2027.studyos.R
import com.ese2027.studyos.data.local.InAppNotificationEntity
import com.ese2027.studyos.data.schedule.SLOTS_DEFINITION
import com.ese2027.studyos.service.MissedFocusScheduler
import com.ese2027.studyos.service.ReminderReceiver
import com.ese2027.studyos.ui.MainActivity
import kotlin.math.absoluteValue

object NotificationHelper {

    const val CHANNEL_FOCUS_TIMER = "focus_timer_channel"
    const val CHANNEL_FOCUS_COMPLETE = "focus_complete_channel"
    const val CHANNEL_SLOT_REMINDERS = "study_reminders_v2"
    const val CHANNEL_ACHIEVEMENTS = "achievements_channel"
    const val CHANNEL_PROTECTION = "focus_protection_channel"

    private const val PREFS = "notification_preferences"
    private const val KEY_SESSION_NOTIFICATIONS = "session_notifications_enabled"
    private const val KEY_DAILY_REMINDERS = "daily_reminders_enabled"
    private const val KEY_MISSED_FOCUS_REMINDERS = "missed_focus_reminders_enabled"
    private const val KEY_QUIET_START = "reminder_quiet_start"
    private const val KEY_QUIET_END = "reminder_quiet_end"
    private const val KEY_MISSED_DELAY = "missed_focus_delay_minutes"
    private const val KEY_DAILY_LIMIT = "reminder_daily_limit"
    private const val KEY_NO_FOCUS_HOUR = "no_focus_reminder_hour"
    private const val KEY_SENT_DATE = "reminder_sent_date"
    private const val KEY_SENT_COUNT = "reminder_sent_count"
    private const val KEY_MESSAGE_INDEX = "missed_focus_message_index"

    /** Rotating supportive lines — consecutive reminders never repeat one. */
    private val supportiveMessages = listOf(
        "Your next step is ready whenever you are.",
        "Take one small step toward the plan you made.",
        "Your focus time is still available. Begin when you are ready.",
        "A small focused session can still make today meaningful.",
        "The best time to start was earlier — the second best is now.",
        "One quiet block can turn the rest of the day around."
    )

    /** Returns the next supportive line and advances the rotation. */
    fun nextSupportiveMessage(context: Context): String {
        val prefs = preferences(context)
        val next = (prefs.getInt(KEY_MESSAGE_INDEX, -1) + 1) % supportiveMessages.size
        prefs.edit().putInt(KEY_MESSAGE_INDEX, next).apply()
        return supportiveMessages[next]
    }

    fun areSessionNotificationsEnabled(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(KEY_SESSION_NOTIFICATIONS, false)

    fun setSessionNotificationsEnabled(context: Context, enabled: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_SESSION_NOTIFICATIONS, enabled).apply()
    }

    fun areDailyRemindersEnabled(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(KEY_DAILY_REMINDERS, false)

    fun setDailyRemindersEnabled(context: Context, enabled: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_DAILY_REMINDERS, enabled).apply()
        if (enabled) scheduleAllDailySlotAlarms(context) else cancelAllDailySlotAlarms(context)
    }

    fun areMissedFocusRemindersEnabled(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(KEY_MISSED_FOCUS_REMINDERS, false)

    fun setMissedFocusRemindersEnabled(context: Context, enabled: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_MISSED_FOCUS_REMINDERS, enabled).apply()
        if (enabled) {
            MissedFocusScheduler.schedulePeriodic(context)
            MissedFocusScheduler.scheduleSweep(context)
        } else {
            MissedFocusScheduler.cancelPeriodic(context)
        }
    }

    fun quietStartHour(context: Context): Int = preferences(context).getInt(KEY_QUIET_START, 22)

    fun quietEndHour(context: Context): Int = preferences(context).getInt(KEY_QUIET_END, 7)

    fun missedFocusDelayMinutes(context: Context): Int = preferences(context).getInt(KEY_MISSED_DELAY, 30)

    fun reminderDailyLimit(context: Context): Int = preferences(context).getInt(KEY_DAILY_LIMIT, 2)

    fun noFocusReminderHour(context: Context): Int = preferences(context).getInt(KEY_NO_FOCUS_HOUR, 20)

    fun updateMissedFocusSettings(
        context: Context,
        quietStartHour: Int,
        quietEndHour: Int,
        delayMinutes: Int,
        dailyLimit: Int,
        noFocusHour: Int
    ) {
        preferences(context).edit()
            .putInt(KEY_QUIET_START, quietStartHour.coerceIn(0, 23))
            .putInt(KEY_QUIET_END, quietEndHour.coerceIn(0, 23))
            .putInt(KEY_MISSED_DELAY, delayMinutes.coerceIn(15, 180))
            .putInt(KEY_DAILY_LIMIT, dailyLimit.coerceIn(1, 4))
            .putInt(KEY_NO_FOCUS_HOUR, noFocusHour.coerceIn(18, 21))
            .apply()
        if (areMissedFocusRemindersEnabled(context)) MissedFocusScheduler.scheduleSweep(context)
    }

    fun isInReminderQuietHours(context: Context, nowMillis: Long): Boolean {
        val hour = java.time.Instant.ofEpochMilli(nowMillis).atZone(java.time.ZoneId.systemDefault()).hour
        return MissedFocusPolicy.isQuietHour(hour, quietStartHour(context), quietEndHour(context))
    }

    fun nextReminderAllowedAt(context: Context, nowMillis: Long): Long =
        MissedFocusPolicy.nextAllowedMillis(nowMillis, quietStartHour(context), quietEndHour(context))

    fun canSendAnotherReminder(context: Context, nowMillis: Long): Boolean {
        val date = java.time.Instant.ofEpochMilli(nowMillis)
            .atZone(java.time.ZoneId.systemDefault()).toLocalDate().toString()
        val prefs = preferences(context)
        val count = if (prefs.getString(KEY_SENT_DATE, null) == date) prefs.getInt(KEY_SENT_COUNT, 0) else 0
        return count < reminderDailyLimit(context)
    }

    fun recordReminderSent(context: Context, nowMillis: Long) {
        val date = java.time.Instant.ofEpochMilli(nowMillis)
            .atZone(java.time.ZoneId.systemDefault()).toLocalDate().toString()
        val prefs = preferences(context)
        val count = if (prefs.getString(KEY_SENT_DATE, null) == date) prefs.getInt(KEY_SENT_COUNT, 0) else 0
        prefs.edit().putString(KEY_SENT_DATE, date).putInt(KEY_SENT_COUNT, count + 1).apply()
    }

    fun canPostNotifications(context: Context): Boolean {
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return false
        return Build.VERSION.SDK_INT < 33 ||
            context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) ==
            android.content.pm.PackageManager.PERMISSION_GRANTED
    }

    fun contentIntent(context: Context, route: String, requestCode: Int): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(MainActivity.EXTRA_ROUTE, route)
        }
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    fun showWebNotification(context: Context, title: String, body: String, kind: String = "session") {
        val normalizedKind = kind.lowercase()
        val channel = if (normalizedKind in setOf("achievement", "day", "progress")) {
            CHANNEL_ACHIEVEMENTS
        } else {
            CHANNEL_FOCUS_COMPLETE
        }
        val requestCode = 3000 + normalizedKind.hashCode().absoluteValue % 500
        val notification = NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title.take(80))
            .setContentText(body.take(240))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_EVENT)
            .setAutoCancel(true)
            .setContentIntent(contentIntent(context, NotificationRoute.forKind(normalizedKind), requestCode))
            .setGroup("ese2027_updates")
            .build()
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify((System.currentTimeMillis() % 1_000_000).toInt(), notification)
    }

    fun createNotificationChannels(context: Context) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val timerChannel = NotificationChannel(
            CHANNEL_FOCUS_TIMER,
            "Focus Timer",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Ongoing focus countdown and controls"
        }
        val completeChannel = NotificationChannel(
            CHANNEL_FOCUS_COMPLETE,
            "Focus Sessions",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Session and break completion alerts"
            enableVibration(true)
        }
        val slotChannel = NotificationChannel(
            CHANNEL_SLOT_REMINDERS,
            "Daily Study Reminders",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "Optional reminders for planned study slots"
        }
        val achievementChannel = NotificationChannel(
            CHANNEL_ACHIEVEMENTS,
            "Progress and Achievements",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "Study milestones and progress summaries"
        }
        val protectionChannel = NotificationChannel(
            CHANNEL_PROTECTION,
            "Focus Protection",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Ongoing focus lock and website shield status"
        }
        notificationManager.createNotificationChannels(
            listOf(timerChannel, completeChannel, slotChannel, achievementChannel, protectionChannel)
        )
        notificationManager.deleteNotificationChannel("slot_reminders_channel")
    }

    fun showSlotReminderNotification(context: Context, slotIndex: Int, slotTitle: String, slotTime: String) {
        val label = SLOTS_DEFINITION.getOrNull(slotIndex)?.label ?: "Study slot"
        val notification = NotificationCompat.Builder(context, CHANNEL_SLOT_REMINDERS)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("$label · $slotTime")
            .setContentText(slotTitle)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setContentIntent(contentIntent(context, NotificationRoute.TODAY, 200 + slotIndex))
            .setGroup("ese2027_study_reminders")
            .setAutoCancel(true)
            .build()
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(2000 + slotIndex, notification)
    }

    @SuppressLint("MissingPermission")
    fun showMissedFocusNotification(context: Context, item: InAppNotificationEntity) {
        if (!canPostNotifications(context)) return
        val notification = NotificationCompat.Builder(context, CHANNEL_SLOT_REMINDERS)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(item.title.take(80))
            .setContentText(item.message.take(240))
            .setStyle(NotificationCompat.BigTextStyle().bigText(item.message.take(500)))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setContentIntent(contentIntent(context, item.route, 4200 + item.id.hashCode().absoluteValue % 500))
            .setGroup("ese2027_missed_focus")
            .setAutoCancel(true)
            .build()
        runCatching {
            NotificationManagerCompat.from(context).notify(item.id.hashCode(), notification)
        }
    }

    fun scheduleAllDailySlotAlarms(context: Context) {
        if (!areDailyRemindersEnabled(context)) {
            cancelAllDailySlotAlarms(context)
            return
        }
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val now = System.currentTimeMillis()
        SLOTS_DEFINITION.forEach { slot ->
            val triggerAt = ReminderSchedule.nextTriggerMillis(now, slot.startHour, slot.startMinute)
            val pendingIntent = reminderPendingIntent(context, slot.slotIndex)
            setExactReminder(alarmManager, triggerAt, pendingIntent)
        }
    }

    /**
     * Fires the reminder at the exact time when the platform allows it
     * (USE_EXACT_ALARM is auto-granted on API 33+ for alarm-style apps), and
     * gracefully degrades to an inexact but still batched alarm otherwise.
     */
    private fun setExactReminder(
        alarmManager: AlarmManager,
        triggerAt: Long,
        pendingIntent: PendingIntent
    ) {
        if (Build.VERSION.SDK_INT >= 31 && !alarmManager.canScheduleExactAlarms()) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
        } else {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
        }
    }

    fun cancelAllDailySlotAlarms(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        SLOTS_DEFINITION.forEach { slot ->
            val pendingIntent = reminderPendingIntent(context, slot.slotIndex)
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
        }
    }

    private fun reminderPendingIntent(context: Context, slotIndex: Int): PendingIntent {
        val intent = Intent(context, ReminderReceiver::class.java).apply {
            putExtra("slot_index", slotIndex)
        }
        return PendingIntent.getBroadcast(
            context,
            100 + slotIndex,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun preferences(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
