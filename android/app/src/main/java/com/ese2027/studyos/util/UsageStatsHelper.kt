package com.ese2027.studyos.util

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Process
import java.util.Calendar

/**
 * Wraps [UsageStatsManager] for the Protection screen's per-app daily-time view
 * (Regain-style "WhatsApp 13m spent / 40m limit") and per-app budget enforcement.
 *
 * UsageStatsManager requires the privileged PACKAGE_USAGE_STATS permission, which
 * the user must grant manually under Settings → Special access → Usage access —
 * it is NOT auto-grantable. Until granted, [queryForegroundMinutesToday] returns
 * an empty map and the Protection screen should show a grant CTA.
 */
object UsageStatsHelper {

    fun isGranted(context: Context): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = appOps.unsafeCheckOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            context.packageName
        )
        return mode == AppOpsManager.MODE_ALLOWED
    }

    /**
     * Returns a map of packageName → minutes-in-foreground-today, restricted to
     * [packages] (so we only query what the Protection screen actually shows).
     * Empty when usage access is missing.
     */
    fun queryForegroundMinutesToday(
        context: Context,
        packages: Set<String>
    ): Map<String, Long> {
        if (packages.isEmpty() || !isGranted(context)) return emptyMap()
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

        val cal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
        }
        val start = cal.timeInMillis
        val end = System.currentTimeMillis()

        val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, end) ?: return emptyMap()
        return stats.asSequence()
            .filter { it.packageName in packages }
            .groupBy { it.packageName }
            .mapValues { (_, rows) -> rows.sumOf { it.totalTimeInForeground }.let { it / 60000L } }
            .filterValues { it >= 0L }
    }
}
