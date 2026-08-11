package com.ese2027.studyos.service

import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.ColorStateList
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.Shader
import android.graphics.Typeface
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.LayerDrawable
import android.graphics.drawable.RippleDrawable
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import com.ese2027.studyos.R
import com.ese2027.studyos.ui.MainActivity
import com.ese2027.studyos.util.BlockingPrefs
import com.ese2027.studyos.util.NotificationHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Full-screen focus lock shown over other apps ("display over other apps"),
 * styled after the web app's ember theme (dot-matrix canvas, Ndot display
 * font, #D71921 signal red).
 *
 * The accessibility service starts this when a blocked app comes to the
 * foreground during an active session. The overlay cannot be dismissed with
 * Back or by tapping outside — only "RETURN TO FOCUS" (or the session ending)
 * removes it.
 */
class BlockingOverlayService : android.app.Service() {

    companion object {
        const val ACTION_SHOW = "SHOW_LOCK"
        const val ACTION_HIDE = "HIDE_LOCK"
        const val NOTIFICATION_ID = 1004
        private const val TAG = "BlockingOverlay"

        fun isShowing(): Boolean = overlayVisible

        @Volatile
        private var overlayVisible = false
    }

    // ember theme tokens (css/app.css :root dark family)
    private val cBg = 0xFF000000.toInt()
    private val cCard = 0x0DFFFFFF.toInt()      // rgba(255,255,255,.05)
    private val cCardLift = 0x17FFFFFF.toInt()  // rgba(255,255,255,.09)
    private val cLine = 0x29FFFFFF.toInt()      // rgba(255,255,255,.16)
    private val cLine2 = 0x4DFFFFFF.toInt()     // rgba(255,255,255,.30)
    private val cInk = 0xFFF5F5F2.toInt()
    private val cInk2 = 0xFFC7C7C2.toInt()
    private val cInk3 = 0xFF8A8A85.toInt()
    private val cInk4 = 0xFF555550.toInt()
    private val cAcc = 0xFFD71921.toInt()
    private val cAccInk = 0xFFFFFFFF.toInt()

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var countdownJob: Job? = null
    private var windowManager: WindowManager? = null
    private var overlayView: View? = null

    private var blockedPackage: String = ""
    private var appLabel: String = ""
    private var endTime: Long = 0L
    private val handler = Handler(Looper.getMainLooper())

    private var ndot: Typeface? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        ndot = runCatching {
            Typeface.createFromAsset(assets, "fonts/Ndot-57-Aligned.ttf")
        }.getOrNull()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_SHOW -> {
                // Foreground first — the system demands startForeground() within
                // a few seconds of startForegroundService(); building the view
                // (icon decode, fonts, bitmap) happens after.
                startForeground(NOTIFICATION_ID, createNotification())
                blockedPackage = intent.getStringExtra("blocked_package") ?: ""
                endTime = intent.getLongExtra("end_time", 0L)
                appLabel = resolveAppLabel(blockedPackage)
                showOverlay()
            }
            ACTION_HIDE -> hideOverlayAndStop()
        }
        return START_NOT_STICKY
    }

    private fun showOverlay() {
        if (overlayVisible) {
            updateOverlayContent()
            return
        }
        val view = buildOverlayView()
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
            PixelFormat.OPAQUE
        ).apply {
            gravity = Gravity.TOP
        }
        try {
            windowManager?.addView(view, params)
            overlayView = view
            overlayVisible = true
            startCountdown()
        } catch (e: Exception) {
            // Missing SYSTEM_ALERT_WINDOW permission (or overlay blocked).
            // The web UI surfaces this state so the user can grant it.
            stopSelf()
        }
    }

    private fun buildOverlayView(): View {
        val root = FrameLayout(this)
        root.background = dotGridBackground()

        // ── top status strip ────────────────────────────────────────────
        val topStrip = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(22), 0, dp(22), 0)
        }
        val brand = mono("ESE//2027", 10f, cInk3).apply {
            letterSpacing = 0.22f
        }
        topStrip.addView(brand, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        val live = mono("● LOCK ACTIVE", 9f, cAcc).apply {
            letterSpacing = 0.12f
        }
        topStrip.addView(live, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT
        ))
        root.addView(topStrip, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.TOP
        ).apply { topMargin = dp(26) })

        // ── center column ───────────────────────────────────────────────
        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(28), 0, dp(28), 0)
        }

        // app icon in a bordered square (Nothing-style key)
        val iconBox = FrameLayout(this).apply {
            val bg = GradientDrawable().apply {
                cornerRadius = dp(14).toFloat()
                setColor(cCard)
                setStroke(dp(1), cLine2)
            }
            background = bg
            val icon = ImageView(this@BlockingOverlayService).apply {
                setImageDrawable(resolveAppIcon(blockedPackage))
                setPadding(dp(14), dp(14), dp(14), dp(14))
            }
            addView(icon, FrameLayout.LayoutParams(dp(58), dp(58), Gravity.CENTER))
        }
        column.addView(iconBox, lp())
        column.addView(spacer(18))

        val appName = sans(appLabel.uppercase(), 17f, cInk, bold = true).apply {
            gravity = Gravity.CENTER
            letterSpacing = 0.04f
        }
        column.addView(appName, lp())
        column.addView(spacer(6))

        val pkg = mono(blockedPackage, 9.5f, cInk4).apply {
            gravity = Gravity.CENTER
            letterSpacing = 0.06f
        }
        column.addView(pkg, lp())
        column.addView(spacer(34))

        val lockTitle = display("FOCUS LOCK", 24f, cAcc).apply {
            gravity = Gravity.CENTER
            letterSpacing = 0.14f
        }
        column.addView(lockTitle, lp())
        column.addView(spacer(18))

        // status card
        val statusCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(22), dp(14), dp(22), dp(14))
            val bg = GradientDrawable().apply {
                cornerRadius = dp(12).toFloat()
                setColor(cCard)
                setStroke(dp(1), cLine)
            }
            background = bg
            val line = mono(
                if (endTime > 0L) "PAUSED UNTIL THE FOCUS SESSION ENDS" else "LOCKED — KEEP THIS MOMENT",
                9.5f, cInk3
            ).apply {
                gravity = Gravity.CENTER
                letterSpacing = 0.1f
            }
            addView(line, lp())
        }
        column.addView(statusCard, lp())

        // Countdown only makes sense for a time-boxed session. In "always"
        // mode (endTime == 0) the lock is indefinite — omit the clock entirely
        // instead of leaving an empty gap.
        if (endTime > 0L) {
            column.addView(spacer(40))
            val countdown = display("", 74f, cInk).apply {
                gravity = Gravity.CENTER
                letterSpacing = 0.02f
                tag = "countdown"
            }
            column.addView(countdown, lp())

            val remaining = mono("", 10f, cInk4).apply {
                gravity = Gravity.CENTER
                letterSpacing = 0.22f
                tag = "remaining"
            }
            column.addView(remaining, lp())
            column.addView(spacer(44))
        } else {
            column.addView(spacer(32))
        }

        // hairline divider
        column.addView(View(this).apply {
            background = ColorDrawable(cLine)
            layoutParams = LinearLayout.LayoutParams(dp(160), dp(1))
        })
        column.addView(spacer(24))

        val keep = mono("KEEP FOCUSING", 11f, cInk2).apply {
            gravity = Gravity.CENTER
            letterSpacing = 0.3f
        }
        column.addView(keep, lp())
        column.addView(spacer(20))

        val btn = TextView(this).apply {
            text = "RETURN TO FOCUS"
            setTextColor(cAccInk)
            textSize = 12f
            gravity = Gravity.CENTER
            typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
            letterSpacing = 0.1f
            setPadding(dp(30), 0, dp(30), 0)
            setOnClickListener {
                hideOverlayAndStop()
                startActivity(Intent(this@BlockingOverlayService, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                })
            }
            background = rippleAcc(
                GradientDrawable().apply {
                    cornerRadius = dp(11).toFloat()
                    setColor(cAcc)
                }
            )
        }
        column.addView(btn, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, dp(48)
        ))

        val wrap = FrameLayout(this)
        wrap.addView(column, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.CENTER_VERTICAL
        ))
        root.addView(wrap, FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)

        // ── bottom hint ─────────────────────────────────────────────────
        val bottom = mono("BACK IS LOCKED · THE SESSION ENDS IT", 9f, cInk4).apply {
            gravity = Gravity.CENTER
            letterSpacing = 0.14f
        }
        root.addView(bottom, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.BOTTOM
        ).apply { bottomMargin = dp(24) })

        root.isFocusableInTouchMode = true
        root.setOnKeyListener { _, keyCode, event ->
            if (keyCode == KeyEvent.KEYCODE_BACK && event.action == KeyEvent.ACTION_DOWN) {
                true // swallow Back — the lock cannot be dismissed
            } else {
                false
            }
        }
        return root
    }

    private fun updateOverlayContent() {
        // Called when the same blocked app is re-detected: refresh countdown only.
        startCountdown()
    }

    private fun startCountdown() {
        countdownJob?.cancel()
        countdownJob = scope.launch {
            while (isActive) {
                val now = System.currentTimeMillis()
                // endTime <= 0 => "always" mode: lock is indefinite, no countdown.
                // endTime > 0 but reached => session ended; the timer service
                // sends ACTION_HIDE. We NEVER dismiss ourselves here — a stale
                // end time used to tear the overlay down ~140 ms after it
                // appeared, which looked like app blocking was broken.
                val remaining = if (endTime > 0L) ((endTime - now) / 1000).coerceAtLeast(0) else -1L
                handler.post {
                    if (remaining < 0) {
                        setCountdownViews("", "")
                    } else {
                        val minutes = remaining / 60
                        val seconds = remaining % 60
                        setCountdownViews(
                            "${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}",
                            "REMAINING"
                        )
                    }
                }
                delay(1000)
            }
        }
    }

    private fun setCountdownViews(value: String, label: String) {
        val root = overlayView ?: return
        val countdown = root.findViewWithTag<TextView>("countdown") ?: return
        val remaining = root.findViewWithTag<TextView>("remaining") ?: return
        countdown.text = value
        remaining.text = label
    }

    private fun hideOverlayAndStop() {
        countdownJob?.cancel()
        overlayView?.let { view ->
            try {
                windowManager?.removeView(view)
            } catch (_: Exception) {
            }
        }
        overlayView = null
        overlayVisible = false
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun resolveAppLabel(packageName: String): String {
        if (packageName.isBlank()) return "THIS APP"
        return try {
            val pm = packageManager
            val appInfo = pm.getApplicationInfo(packageName, 0)
            pm.getApplicationLabel(appInfo).toString()
        } catch (e: PackageManager.NameNotFoundException) {
            packageName.split(".").lastOrNull()?.replaceFirstChar { it.uppercase() } ?: packageName
        }
    }

    private fun resolveAppIcon(packageName: String): android.graphics.drawable.Drawable {
        if (packageName.isBlank()) return fallbackIcon()
        return try {
            packageManager.getApplicationIcon(packageName)
        } catch (e: PackageManager.NameNotFoundException) {
            fallbackIcon()
        }
    }

    private fun fallbackIcon(): android.graphics.drawable.Drawable =
        GradientDrawable().apply {
            cornerRadius = dp(10).toFloat()
            setColor(cAccDim)
            setStroke(dp(1), cAcc)
        }

    private val cAccDim = 0x24D71921.toInt()

    /** Black canvas + tiled dot grid, mirroring the web app's body::before. */
    private fun dotGridBackground(): LayerDrawable {
        val spacing = dp(22)
        val bmp = Bitmap.createBitmap(spacing, spacing, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x17FFFFFF.toInt() } // rgba(255,255,255,.09)
        canvas.drawCircle(spacing / 2f, spacing / 2f, dp(1).toFloat(), paint)
        val dots = BitmapDrawable(resources, bmp).apply {
            setTileModeXY(Shader.TileMode.REPEAT, Shader.TileMode.REPEAT)
        }
        return LayerDrawable(arrayOf(ColorDrawable(cBg), dots))
    }

    private fun rippleAcc(bg: GradientDrawable): RippleDrawable {
        val rippleColor = ColorStateList.valueOf(0x33FFFFFF.toInt())
        return RippleDrawable(rippleColor, bg, null)
    }

    private fun display(value: String, size: Float, color: Int): TextView =
        TextView(this).apply {
            text = value
            textSize = size
            setTextColor(color)
            typeface = ndot ?: Typeface.create("sans-serif", Typeface.NORMAL)
            includeFontPadding = false
        }

    private fun mono(value: String, size: Float, color: Int): TextView =
        TextView(this).apply {
            text = value
            textSize = size
            setTextColor(color)
            typeface = Typeface.create("monospace", Typeface.NORMAL)
        }

    private fun sans(value: String, size: Float, color: Int, bold: Boolean): TextView =
        TextView(this).apply {
            text = value
            textSize = size
            setTextColor(color)
            typeface = Typeface.create("sans-serif", if (bold) Typeface.BOLD else Typeface.NORMAL)
        }

    private fun spacer(height: Int): View =
        View(this).apply { layoutParams = ViewGroup.LayoutParams(1, dp(height)) }

    private fun lp(): LinearLayout.LayoutParams =
        LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        )

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()

    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, NotificationHelper.CHANNEL_PROTECTION)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Focus Lock Active")
            .setContentText("Blocked app detected — keep focusing.")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        countdownJob?.cancel()
        scope.cancel()
        overlayView?.let {
            try {
                windowManager?.removeView(it)
            } catch (_: Exception) {
            }
        }
        overlayView = null
        overlayVisible = false
    }
}
