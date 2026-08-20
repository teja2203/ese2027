package com.ese2027.studyos.service

import android.app.*
import android.content.Intent
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.ese2027.studyos.R
import com.ese2027.studyos.data.local.AppDatabase
import com.ese2027.studyos.data.local.FocusSessionEntity
import com.ese2027.studyos.data.remote.SupabaseService
import com.ese2027.studyos.data.repository.FocusRepository
import com.ese2027.studyos.data.repository.StudyRepository
import com.ese2027.studyos.data.repository.StudyDomainRepository
import com.ese2027.studyos.data.sync.SyncManager
import com.ese2027.studyos.util.BlockingPrefs
import com.ese2027.studyos.util.NotificationHelper
import com.ese2027.studyos.util.NotificationRoute
import kotlinx.coroutines.*
import java.text.SimpleDateFormat
import java.util.*

/**
 * Foreground timer for focus sessions.
 *
 * Design contract with the web renderer:
 *  - The web app is the UI master and passes the authoritative remaining time
 *    for the CURRENT phase on every start/resume/reload ([EXTRA_REMAINING]).
 *  - This service adopts that time, so the notification, the app-blocking
 *    shield and the website shield can never drift apart from what the user
 *    sees in the web UI.
 *  - A stale/expired session row in Room is finalised and replaced instead of
 *    being silently reused (the previous "reuse any active row" behaviour let
 *    a leftover session hijack every new session's countdown).
 *  - No exception may silently kill the ticker or the completion path: the
 *    worst case is a logged error plus a clean shutdown, never a frozen timer
 *    with the blocking shields stuck on.
 */
class FocusTimerService : Service() {

    companion object {
        const val CHANNEL_ID = "focus_timer_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START = "ACTION_START"
        const val ACTION_PAUSE = "ACTION_PAUSE"
        const val ACTION_STOP = "ACTION_STOP"
        const val ACTION_SOUND = "ACTION_SOUND"
        const val ACTION_SKIP = "ACTION_SKIP"
        const val EXTRA_DURATION = "EXTRA_DURATION"
        const val EXTRA_STRICT_MODE = "EXTRA_STRICT_MODE"
        const val EXTRA_FORCE_STOP = "EXTRA_FORCE_STOP"
        const val EXTRA_SOUND_MODE = "EXTRA_SOUND_MODE"
        const val EXTRA_SOUND_VOLUME = "EXTRA_SOUND_VOLUME"
        const val EXTRA_BREAK_DURATION = "EXTRA_BREAK_DURATION"
        const val EXTRA_LOOP = "EXTRA_LOOP"
        const val EXTRA_END_TIME = "EXTRA_END_TIME"
        const val EXTRA_REMAINING = "EXTRA_REMAINING"
        const val EXTRA_BLOCK_ID = "EXTRA_BLOCK_ID"
        const val EXTRA_PLAN_ID = "EXTRA_PLAN_ID"

        private const val TAG = "FocusTimerService"

        /**
         * Maximum accepted drift between the end time this service already has
         * and the end time the web app just asked for. Beyond this we treat the
         * incoming request as a different/fresh session and replace the row.
         */
        private const val SYNC_TOLERANCE_MS = 90_000L
    }

    private var job: Job? = null
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private lateinit var focusRepository: FocusRepository
    private lateinit var studyRepository: StudyRepository
    private lateinit var domainRepository: StudyDomainRepository
    private var currentSession: FocusSessionEntity? = null
    private var userId: String = "local_user"
    private var breakMinutes: Int = 10
    private var soundVolume: Float = 0.4f
    private val soundPlayer = FocusSoundPlayer()

    override fun onCreate() {
        super.onCreate()
        val database = AppDatabase.getInstance(this)
        val supabase = SupabaseService.getInstance()
        userId = supabase.getCurrentUserId() ?: "local_user"
        val syncManager = SyncManager(database, supabase)
        focusRepository = FocusRepository(database, syncManager)
        studyRepository = StudyRepository(database, syncManager)
        domainRepository = StudyDomainRepository(database, syncManager)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val duration = intent.getIntExtra(EXTRA_DURATION, 25)
                val strictMode = intent.getBooleanExtra(EXTRA_STRICT_MODE, false)
                val soundMode = intent.getStringExtra(EXTRA_SOUND_MODE) ?: "off"
                soundVolume = intent.getFloatExtra(EXTRA_SOUND_VOLUME, 0.4f)
                breakMinutes = intent.getIntExtra(EXTRA_BREAK_DURATION, 10)
                val loop = intent.getBooleanExtra(EXTRA_LOOP, true)
                val endTimeOverride = intent.getLongExtra(EXTRA_END_TIME, 0L).takeIf { it > 0L }
                val remainingSeconds = intent.getIntExtra(EXTRA_REMAINING, -1)
                    .takeIf { it > 0 }
                val blockId = intent.getStringExtra(EXTRA_BLOCK_ID)
                val planId = intent.getStringExtra(EXTRA_PLAN_ID)
                startFocusSession(duration, strictMode, soundMode, soundVolume, loop, endTimeOverride, remainingSeconds, blockId, planId)
            }
            ACTION_PAUSE -> pauseFocusSession()
            ACTION_STOP -> stopFocusSession(intent?.getBooleanExtra(EXTRA_FORCE_STOP, false) == true)
            ACTION_SOUND -> soundPlayer.start(
                intent.getStringExtra(EXTRA_SOUND_MODE) ?: "off",
                intent.getFloatExtra(EXTRA_SOUND_VOLUME, 0.4f)
            )
            ACTION_SKIP -> completeFocusSession()
            null -> restoreSessionAfterKill() // START_STICKY restart
        }
        return START_STICKY
    }

    /**
     * Syncs the timer to the web app's authoritative phase state.
     *
     * The web app tells us the work minutes, break minutes and exactly how many
     * seconds are left in the current phase. We adopt that end time, replacing
     * any stale or divergent session row instead of letting it hijack the timer
     * (this was the root cause of the notification counting a leftover session).
     */
    private fun startFocusSession(
        duration: Int,
        strictMode: Boolean,
        soundMode: String,
        soundVolume: Float,
        loop: Boolean,
        endTimeOverride: Long? = null,
        remainingSeconds: Int? = null,
        blockId: String? = null,
        planId: String? = null
    ) {
        val now = System.currentTimeMillis()
        val remainingSec = remainingSeconds?.coerceAtLeast(1) ?: (duration.coerceAtLeast(1) * 60)
        val desiredEnd = endTimeOverride ?: (now + remainingSec * 1000L)
        val workMinutes = duration.coerceAtLeast(1)
        val breakDur = breakMinutes.coerceAtLeast(1)

        scope.launch {
            try {
                val existing = focusRepository.getActiveSession(userId)
                val session = when {
                    // Live active session close to the requested end time: this
                    // is a reload/resume re-sync — keep the row, adopt the end.
                    existing != null && existing.status == "active" &&
                        kotlin.math.abs(existing.endTime - desiredEnd) < SYNC_TOLERANCE_MS ->
                        existing.copy(endTime = desiredEnd, updatedAt = now)

                    // Paused session being resumed with the same remaining time.
                    existing != null && existing.status == "paused" &&
                        kotlin.math.abs(existing.timeLeft - remainingSec) < (SYNC_TOLERANCE_MS / 1000) ->
                        existing.copy(status = "active", endTime = desiredEnd, updatedAt = now)

                    // Stale/expired/divergent session — finalise and start fresh.
                    else -> {
                        if (existing != null) {
                            runCatching { focusRepository.deleteSession(existing.id) }
                        }
                        FocusSessionEntity(
                            id = UUID.randomUUID().toString(),
                            userId = userId,
                            startTime = now,
                            endTime = desiredEnd,
                            duration = workMinutes,
                            breakDuration = breakDur,
                            phase = "work",
                            status = "active",
                            timeLeft = remainingSec,
                            logged = 0,
                            loop = loop,
                            strictMode = strictMode,
                            soundMode = soundMode,
                            planId = planId,
                            blockId = blockId,
                            plannedDuration = workMinutes,
                            createdAt = now,
                            updatedAt = now
                        )
                    }
                }
                if (existing != null && existing.id == session.id) {
                    focusRepository.updateSession(session)
                } else {
                    focusRepository.saveSession(session)
                }
                currentSession = session
                if (session.blockId != null) {
                    val block = domainRepository.getBlock(userId, session.blockId)
                    if (block != null && block.status in setOf("planned", "available", "paused")) {
                        runCatching { domainRepository.setBlockStatus(userId, block.id, "in_progress", block.completionPercentage) }
                    }
                }
                // Single source of truth for both blocking shields.
                BlockingPrefs.setFocusActive(this@FocusTimerService, true, session.endTime)
            } catch (e: Exception) {
                Log.e(TAG, "startFocusSession failed", e)
            }
            startTimer() // always restart the ticker, even if persistence failed
        }

        val notification = createNotification("Focus Session", "$workMinutes minutes remaining")
        startForeground(NOTIFICATION_ID, notification)
        soundPlayer.start(soundMode, soundVolume)
        playEffect(ToneGenerator.TONE_PROP_ACK)
    }

    private fun startTimer() {
        job?.cancel()
        job = scope.launch {
            while (isActive) {
                try {
                    delay(1000)
                    val session = currentSession
                    if (session != null && session.status == "active") {
                        val remaining = ((session.endTime - System.currentTimeMillis()) / 1000).toInt()
                        if (remaining <= 0) {
                            completeFocusSession()
                            return@launch
                        } else {
                            updateNotification(remaining)
                        }
                    }
                } catch (e: Exception) {
                    // A single bad tick must never freeze the timer silently.
                    Log.w(TAG, "timer tick error", e)
                }
            }
        }
    }

    private fun pauseFocusSession() {
        job?.cancel()
        soundPlayer.stop()
        playEffect(ToneGenerator.TONE_PROP_BEEP)
        scope.launch {
            try {
                val session = currentSession ?: focusRepository.getActiveSession(userId)
                session?.let {
                    val now = System.currentTimeMillis()
                    val paused = session.copy(
                        status = "paused",
                        timeLeft = ((session.endTime - now) / 1000).toInt().coerceAtLeast(0),
                        updatedAt = now
                    )
                    focusRepository.updateSession(paused)
                    currentSession = paused
                    // Blocking stays in force while paused (the lock copy says
                    // "paused until the focus session ends") — prefs unchanged.
                }
            } catch (e: Exception) {
                Log.e(TAG, "pauseFocusSession failed", e)
            }
        }
    }

    private fun stopFocusSession(force: Boolean) {
        // Strict mode is enforced in the service as well as the UI. A stray
        // stop intent cannot silently cancel a protected session.
        job?.cancel()
        soundPlayer.stop()
        playEffect(ToneGenerator.TONE_PROP_NACK)
        scope.launch {
            try {
                val session = currentSession ?: focusRepository.getActiveSession(userId)
                if (session?.strictMode == true && !force) return@launch
                session?.let {
                    runCatching { focusRepository.deleteSession(it.id) }
                }
            } catch (e: Exception) {
                Log.e(TAG, "stopFocusSession failed", e)
            } finally {
                currentSession = null
                disableBlockingAndShields()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
    }

    private fun completeFocusSession() {
        soundPlayer.stop()
        playEffect(ToneGenerator.TONE_PROP_ACK)
        val session = currentSession ?: return
        scope.launch {
            try {
                val now = System.currentTimeMillis()
                // `duration` always holds the WORK minutes; break length lives
                // in `breakDuration`. Previously the work length was overwritten
                // by the break length on the first cycle, shrinking every later
                // work phase to the break duration.
                val workMinutes = session.duration.coerceAtLeast(1)
                val breakDur = session.breakDuration.coerceAtLeast(1)

                if (session.phase == "work") {
                    runCatching {
                        val todayDate = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
                        studyRepository.logStudyMinutes(session.userId, todayDate, workMinutes)
                    }
                }

                if (session.loop) {
                    val nextPhase = if (session.phase == "work") "break" else "work"
                    val nextMinutes = if (nextPhase == "work") workMinutes else breakDur
                    val next = session.copy(
                        phase = nextPhase,
                        duration = workMinutes,
                        breakDuration = breakDur,
                        timeLeft = nextMinutes * 60,
                        startTime = now,
                        endTime = now + nextMinutes * 60_000L,
                        status = "active",
                        updatedAt = now
                    )
                    focusRepository.updateSession(next)
                    currentSession = next
                    BlockingPrefs.setFocusActive(this@FocusTimerService, true, next.endTime)
                    soundPlayer.start(next.soundMode, soundVolume)
                    showCompletionNotification(session.phase == "work")
                } else {
                    if (session.phase == "work" && session.blockId != null) {
                        runCatching {
                            val block = domainRepository.getBlock(session.userId, session.blockId)
                            if (block != null) {
                                val completed = workMinutes >= block.durationMinutes
                                domainRepository.setBlockStatus(
                                    session.userId,
                                    block.id,
                                    if (completed) "completed" else "partially_completed",
                                    if (completed) 100 else ((workMinutes.toDouble() / block.durationMinutes * 100).toInt().coerceIn(1, 99))
                                )
                            }
                        }
                    }
                    runCatching { focusRepository.deleteSession(session.id) }
                    currentSession = null
                    showCompletionNotification(session.phase == "work")
                }
            } catch (e: Exception) {
                Log.e(TAG, "completeFocusSession failed", e)
                // Fall through: end the session cleanly rather than leaving a
                // wedge with the shields stuck on.
                runCatching { focusRepository.deleteSession(session.id) }
                currentSession = null
            } finally {
                if (currentSession?.status == "active") {
                    startTimer()
                } else {
                    disableBlockingAndShields()
                    stopForeground(STOP_FOREGROUND_REMOVE)
                    stopSelf()
                }
            }
        }
    }

    /** Session lifecycle helpers: keeps BlockingPrefs in sync. The binary lock
     *  needs no explicit hide — BlockingPrefs flips the decide() rule off, and
     *  any open block screen self-dismisses at its endTime. */
    private fun disableBlockingAndShields() {
        BlockingPrefs.setFocusActive(this, false)
    }

    /** START_STICKY restart with a null intent: re-sync state from Room. */
    private fun restoreSessionAfterKill() {
        scope.launch {
            try {
                val session = focusRepository.getActiveSession(userId)
                val now = System.currentTimeMillis()
                if (session != null && session.status == "active" && session.endTime > now) {
                    currentSession = session
                    BlockingPrefs.setFocusActive(this@FocusTimerService, true, session.endTime)
                    startForeground(NOTIFICATION_ID, createNotification("Focus Session", "resuming"))
                    startTimer()
                } else {
                    // Stale or ended session: clear blocking state and shut down.
                    session?.let { runCatching { focusRepository.deleteSession(it.id) } }
                    currentSession = null
                    BlockingPrefs.setFocusActive(this@FocusTimerService, false)
                    disableBlockingAndShields()
                    stopForeground(STOP_FOREGROUND_REMOVE)
                    stopSelf()
                }
            } catch (e: Exception) {
                Log.e(TAG, "restoreSessionAfterKill failed", e)
                runCatching { BlockingPrefs.setFocusActive(this@FocusTimerService, false) }
                currentSession = null
                disableBlockingAndShields()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
    }

    private fun updateNotification(remaining: Int) {
        val clamped = remaining.coerceAtLeast(0)
        val minutes = clamped / 60
        val seconds = clamped % 60
        val notification = createNotification("Focus Session", "$minutes:${seconds.toString().padStart(2, '0')} remaining")
        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    private fun showCompletionNotification(wasWork: Boolean) {
        if (!NotificationHelper.areSessionNotificationsEnabled(this)) return
        val title = if (wasWork) "Focus session complete" else "Break over"
        val text = if (wasWork) {
            "Deep work logged. Take the planned break or review progress."
        } else {
            "Your next focus phase is ready."
        }
        val route = if (wasWork) NotificationRoute.PROGRESS else NotificationRoute.FOCUS
        val notification = NotificationCompat.Builder(this, NotificationHelper.CHANNEL_FOCUS_COMPLETE)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_notification)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(NotificationHelper.contentIntent(this, route, 1002))
            .setAutoCancel(true)
            .build()

        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(1002, notification)
    }

    private fun createNotification(title: String, text: String): Notification {
        val openIntent = NotificationHelper.contentIntent(this, NotificationRoute.FOCUS, NOTIFICATION_ID)
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_notification)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(openIntent)
            .addAction(0, "Open Focus", openIntent)
        return notification.build()
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Focus Timer",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Ongoing focus session notifications"
        }
        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.createNotificationChannel(channel)
    }

    private fun playEffect(tone: Int) {
        runCatching {
            val generator = ToneGenerator(AudioManager.STREAM_ALARM, 80)
            generator.startTone(tone, 220)
            scope.launch {
                delay(260)
                generator.release()
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        job?.cancel()
        soundPlayer.stop()
        scope.cancel()
    }
}
