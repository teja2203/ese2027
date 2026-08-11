package com.ese2027.studyos.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.ese2027.studyos.data.schedule.SLOTS_DEFINITION
import com.ese2027.studyos.util.NotificationHelper

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val slotIndex = intent.getIntExtra("slot_index", 0)
        val slotDef = SLOTS_DEFINITION.getOrNull(slotIndex)

        if (slotDef != null) {
            NotificationHelper.showSlotReminderNotification(
                context = context,
                slotIndex = slotIndex,
                slotTitle = "${slotDef.desc} — Time to focus",
                slotTime = slotDef.time
            )
        }

        // Reschedule for next day
        NotificationHelper.scheduleAllDailySlotAlarms(context)
    }
}
