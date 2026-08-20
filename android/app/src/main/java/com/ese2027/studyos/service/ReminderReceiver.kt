package com.ese2027.studyos.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.ese2027.studyos.data.schedule.ScheduleData
import com.ese2027.studyos.data.schedule.SLOTS_DEFINITION
import com.ese2027.studyos.util.NotificationHelper
import java.time.LocalDate

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (!NotificationHelper.areDailyRemindersEnabled(context)) return
        if (NotificationHelper.isInReminderQuietHours(context, System.currentTimeMillis())) {
            NotificationHelper.scheduleAllDailySlotAlarms(context)
            return
        }
        val slotIndex = intent.getIntExtra("slot_index", 0)
        val slotDef = SLOTS_DEFINITION.getOrNull(slotIndex)
        val schedule = ScheduleData.forDate(LocalDate.now())

        if (schedule?.badge == "RECOVERY") {
            NotificationHelper.scheduleAllDailySlotAlarms(context)
            return
        }

        if (slotDef != null) {
            NotificationHelper.showSlotReminderNotification(
                context = context,
                slotIndex = slotIndex,
                slotTitle = schedule?.sessions?.getOrNull(slotIndex)?.title ?: slotDef.desc,
                slotTime = slotDef.time
            )
        }

        // Reschedule for next day
        NotificationHelper.scheduleAllDailySlotAlarms(context)
    }
}
