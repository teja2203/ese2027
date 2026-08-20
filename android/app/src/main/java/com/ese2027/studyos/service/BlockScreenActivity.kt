package com.ese2027.studyos.service

import android.app.Activity
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.RelativeLayout
import android.widget.TextView
import kotlinx.coroutines.*

class BlockScreenActivity : Activity() {

    companion object {
        const val EXTRA_PACKAGE = "pkg"
        const val EXTRA_LABEL = "label"
        const val EXTRA_REASON = "reason"
        const val EXTRA_END_TIME = "end_time"
        const val EXTRA_STRICT_UNTIL = "strict_until"
        const val EXTRA_SPENT_MIN = "spent_min"
        const val EXTRA_LIMIT_MIN = "limit_min"
        const val OPEN_WAIT_SECONDS = 3
        private const val TAG = "BlockScreen"
    }

    private val cBg = 0xFF000000.toInt()
    private val cCard = 0x0DFFFFFF.toInt()
    private val cLine = 0x29FFFFFF.toInt()
    private val cLine2 = 0x4DFFFFFF.toInt()
    private val cInk = 0xFFF5F5F2.toInt()
    private val cInk2 = 0xFFC7C7C2.toInt()
    private val cInk3 = 0xFF8A8A85.toInt()
    private val cInk4 = 0xFF555550.toInt()
    private val cAcc = 0xFFD71921.toInt()
    private val cAccInk = 0xFFFFFFFF.toInt()

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var tickJob: Job? = null
    private var ndot: Typeface? = null

    private lateinit var pkg: String
    private lateinit var reason: String
    private var endTime = 0L
    private var strictUntil = 0L
    private var spentMin = 0L
    private var limitMin = 0L

    private var openButton: TextView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        ndot = runCatching {
            Typeface.createFromAsset(assets, "fonts/Ndot-57-Aligned.ttf")
        }.getOrNull()

        pkg = intent.getStringExtra(EXTRA_PACKAGE) ?: ""
        reason = intent.getStringExtra(EXTRA_REASON) ?: "binary"
        endTime = intent.getLongExtra(EXTRA_END_TIME, 0L)
        strictUntil = intent.getLongExtra(EXTRA_STRICT_UNTIL, 0L)
        spentMin = intent.getLongExtra(EXTRA_SPENT_MIN, 0L)
        limitMin = intent.getLongExtra(EXTRA_LIMIT_MIN, 0L)
        val label = intent.getStringExtra(EXTRA_LABEL)
            ?: if (reason == "website") pkg else resolveAppLabel(pkg)

        setContentView(buildView(label))
        startTicks()
    }

    override fun onResume() {
        super.onResume()
        AppBlockingService.blockScreenOpen = true
    }

    override fun onStop() {
        super.onStop()
        AppBlockingService.blockScreenOpen = false
    }

    override fun onDestroy() {
        super.onDestroy()
        tickJob?.cancel()
        scope.cancel()
        AppBlockingService.blockScreenOpen = false
        AppBlockingService.notifyBlockScreenClosed()
    }

    private fun startTicks() {
        tickJob?.cancel()
        tickJob = scope.launch {
            val openAt = System.currentTimeMillis() + OPEN_WAIT_SECONDS * 1000L
            while (isActive) {
                val now = System.currentTimeMillis()
                when (reason) {
                    "limit" -> updateOpenWait(openAt, now)
                }
                delay(1000)
            }
        }
    }

    
    
    private fun updateOpenWait(openAt: Long, now: Long) {
        runOnUiThread {
            val left = Math.max(0L, openAt - now)
            if (left > 0) {
                val s = Math.ceil(left / 1000.0).toInt()
                openButton?.text = "WAIT ${s}s TO OPEN..."
                openButton?.isEnabled = false
                openButton?.alpha = 0.5f
            } else {
                openButton?.text = "[ EMERGENCY UNBLOCK ]"
                openButton?.isEnabled = true
                openButton?.alpha = 1.0f
            }
        }
    }

    private fun buildView(appLabel: String): View {
        val root = FrameLayout(this)
        root.setBackgroundColor(android.graphics.Color.TRANSPARENT)
        
        val dimBg = View(this).apply { setBackgroundColor(0xD9000000.toInt()) }
        root.addView(dimBg, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))

        val sheet = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(24), dp(32), dp(24), dp(48))
            background = android.graphics.drawable.GradientDrawable().apply {
                setColor(0xFF000000.toInt()) // Pitch black surface
                cornerRadii = floatArrayOf(dp(16).toFloat(), dp(16).toFloat(), dp(16).toFloat(), dp(16).toFloat(), 0f, 0f, 0f, 0f)
                setStroke(dp(1), cLine)
            }
        }

        // Header: Icon + App Name + Turn Off
        val header = RelativeLayout(this)
        val iconRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        iconRow.addView(ImageView(this).apply { setImageDrawable(resolveAppIcon(pkg)) }, LinearLayout.LayoutParams(dp(24), dp(24)))
        iconRow.addView(spacer(12, true))
        iconRow.addView(mono(appLabel.uppercase(), 14f, cInk).apply { letterSpacing = 0.05f })
        
        val turnOffBtn = TextView(this).apply {
            text = "TURN OFF"
            setTextColor(cInk)
            textSize = 12f
            if (ndot != null) typeface = ndot else typeface = Typeface.MONOSPACE
            setPadding(dp(16), dp(8), dp(16), dp(8))
            background = android.graphics.drawable.GradientDrawable().apply {
                setColor(0x00000000)
                setStroke(dp(1), cLine)
                cornerRadius = dp(4).toFloat()
            }
            setOnClickListener {
                if (strictUntil > System.currentTimeMillis()) {
                    android.widget.Toast.makeText(this@BlockScreenActivity, "STRICT MODE ACTIVE", android.widget.Toast.LENGTH_SHORT).show()
                } else {
                    sheet.removeAllViews()
                    sheet.addView(display("TURN OFF FOR", 24f, cInk).apply { gravity = Gravity.CENTER_HORIZONTAL }, lp(LinearLayout.LayoutParams.MATCH_PARENT))
                    sheet.addView(spacer(24))
                    
                    val b1 = btn("15 MINS", 0xFF000000.toInt(), cInk) { AppBlockingService.notifyLimitOpen(pkg, 15 * 60_000L); finish() }
                    sheet.addView(b1, lp(LinearLayout.LayoutParams.MATCH_PARENT))
                    sheet.addView(spacer(12))
                    
                    val b2 = btn("1 HOUR", 0xFF000000.toInt(), cInk) { AppBlockingService.notifyLimitOpen(pkg, 60 * 60_000L); finish() }
                    sheet.addView(b2, lp(LinearLayout.LayoutParams.MATCH_PARENT))
                    sheet.addView(spacer(12))
                    
                    val b3 = btn("FOR TODAY", 0xFF000000.toInt(), cInk) { AppBlockingService.notifyLimitOpen(pkg, 24 * 60 * 60_000L); finish() }
                    sheet.addView(b3, lp(LinearLayout.LayoutParams.MATCH_PARENT))
                }
            }
        }
        
        header.addView(iconRow, RelativeLayout.LayoutParams(RelativeLayout.LayoutParams.WRAP_CONTENT, RelativeLayout.LayoutParams.WRAP_CONTENT).apply { addRule(RelativeLayout.ALIGN_PARENT_LEFT) })
        val rightContainer = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        rightContainer.addView(sans("🔥 ${com.ese2027.studyos.util.BlockingPrefs.prefs(this@BlockScreenActivity).getInt("streak_$pkg", 0)}", 14f, cInk, false))
        rightContainer.addView(spacer(12, true))
        rightContainer.addView(turnOffBtn)
        
        header.addView(rightContainer, RelativeLayout.LayoutParams(RelativeLayout.LayoutParams.WRAP_CONTENT, RelativeLayout.LayoutParams.WRAP_CONTENT).apply { addRule(RelativeLayout.ALIGN_PARENT_RIGHT) })
        sheet.addView(header, lp(LinearLayout.LayoutParams.MATCH_PARENT))
        sheet.addView(spacer(24))

        val titleText = if (reason == "reminder") "TIME CHECK" else if (reason == "strict") "STRICT OVERRIDE" else "LIMIT EXCEEDED"
        val titleColor = if (reason == "reminder") cInk else cAcc
        sheet.addView(display(titleText, 32f, titleColor).apply { letterSpacing = 0.05f }, lp(LinearLayout.LayoutParams.MATCH_PARENT).apply { gravity = Gravity.LEFT })
        sheet.addView(spacer(24))

        // Red Segmented Progress Bar
        val segments = 10
        val filled = if (limitMin > 0) Math.min(segments, ((spentMin.toFloat() / limitMin.toFloat()) * segments).toInt()) else segments
        val progressRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            weightSum = segments.toFloat()
        }
        for (i in 0 until segments) {
            val segment = View(this).apply {
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(if (i < filled) cAcc else 0x1AFFFFFF) // cAcc is red! Attractive like Regain.
                    cornerRadius = dp(2).toFloat()
                }
            }
            val p = LinearLayout.LayoutParams(0, dp(8), 1f)
            if (i < segments - 1) p.setMargins(0, 0, dp(4), 0)
            progressRow.addView(segment, p)
        }
        sheet.addView(progressRow, lp(LinearLayout.LayoutParams.MATCH_PARENT))
        sheet.addView(spacer(12))

        val leftMins = Math.max(0L, limitMin - spentMin)
        val streakDays = com.ese2027.studyos.util.BlockingPrefs.prefs(this@BlockScreenActivity).getInt("streak_$pkg", 0)

        // Stats Box
        val statsRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        statsRow.addView(mono("SPENT: ${spentMin}M", 12f, cInk), LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        statsRow.addView(mono("LIMIT: ${limitMin}M", 12f, cInk).apply { gravity = Gravity.RIGHT }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        sheet.addView(statsRow, lp(LinearLayout.LayoutParams.MATCH_PARENT))
        sheet.addView(spacer(40))

        if (reason == "reminder") {
            sheet.addView(mono("EXTEND SESSION?", 12f, cInk3), lp(LinearLayout.LayoutParams.MATCH_PARENT).apply { gravity = Gravity.LEFT })
            sheet.addView(spacer(16))
            
            val grid = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
            val times = listOf(2, 5, 10, 20)
            val r1 = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
            val r2 = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
            
            for (i in 0..3) {
                val mins = times[i]
                val b = TextView(this).apply {
                    text = "${mins} MINS"
                    setTextColor(cInk)
                    textSize = 14f
                    if (ndot != null) typeface = ndot else typeface = Typeface.MONOSPACE
                    gravity = Gravity.CENTER
                    background = android.graphics.drawable.GradientDrawable().apply {
                        setColor(0x00000000)
                        setStroke(dp(1), cInk)
                        cornerRadius = dp(4).toFloat()
                    }
                    setPadding(0, dp(16), 0, dp(16))
                    setOnClickListener { AppBlockingService.notifyLimitOpen(pkg, mins * 60_000L); finish() }
                }
                val params = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                if (i % 2 == 0) params.setMargins(0, 0, dp(8), 0) else params.setMargins(dp(8), 0, 0, 0)
                if (i < 2) r1.addView(b, params) else r2.addView(b, params)
            }
            grid.addView(r1, lp(LinearLayout.LayoutParams.MATCH_PARENT))
            grid.addView(spacer(16))
            grid.addView(r2, lp(LinearLayout.LayoutParams.MATCH_PARENT))
            sheet.addView(grid, lp(LinearLayout.LayoutParams.MATCH_PARENT))
        } else {
            sheet.addView(mono("EMERGENCY OVERRIDE", 12f, cInk3), lp(LinearLayout.LayoutParams.MATCH_PARENT).apply { gravity = Gravity.LEFT })
            sheet.addView(spacer(16))
            
            openButton = TextView(this).apply {
                text = "WAIT 3S..."
                setTextColor(cInk)
                textSize = 14f
                if (ndot != null) typeface = ndot else typeface = Typeface.MONOSPACE
                gravity = Gravity.CENTER
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(0x00000000)
                    setStroke(dp(1), cLine)
                    cornerRadius = dp(4).toFloat()
                }
                setPadding(0, dp(16), 0, dp(16))
                isEnabled = false
                alpha = 0.5f
                setOnClickListener {
                    if (strictUntil > System.currentTimeMillis()) {
                        android.widget.Toast.makeText(this@BlockScreenActivity, "STRICT MODE ACTIVE", android.widget.Toast.LENGTH_SHORT).show()
                    } else {
                        AppBlockingService.notifyLimitOpen(pkg, 5L * 60_000L)
                        finish()
                    }
                }
            }
            sheet.addView(openButton, lp(LinearLayout.LayoutParams.MATCH_PARENT))
        }

        sheet.addView(spacer(16))

        val closeBtn = TextView(this).apply {
            text = "CLOSE APP"
            textSize = 16f
            if (ndot != null) typeface = ndot else typeface = Typeface.MONOSPACE
            setTextColor(0xFF000000.toInt())
            gravity = Gravity.CENTER
            background = android.graphics.drawable.GradientDrawable().apply {
                setColor(cInk)
                cornerRadius = dp(4).toFloat()
            }
            setPadding(0, dp(16), 0, dp(16))
            setOnClickListener { 
                startActivity(android.content.Intent(android.content.Intent.ACTION_MAIN).addCategory(android.content.Intent.CATEGORY_HOME).addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK))
                finish() 
            }
        }
        sheet.addView(closeBtn, lp(LinearLayout.LayoutParams.MATCH_PARENT))

        root.addView(sheet, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT).apply { gravity = Gravity.BOTTOM })
        return root
    }

    private fun lp(w: Int = LinearLayout.LayoutParams.WRAP_CONTENT, h: Int = LinearLayout.LayoutParams.WRAP_CONTENT) =
        LinearLayout.LayoutParams(w, h).apply { gravity = Gravity.CENTER_HORIZONTAL }

    private fun spacer(dp: Int, horizontal: Boolean = false) = View(this).apply {
        layoutParams = if (horizontal) LinearLayout.LayoutParams(dp(dp), 1) else LinearLayout.LayoutParams(1, dp(dp))
    }

    private fun dp(dp: Int) = (dp * resources.displayMetrics.density).toInt()

    private fun display(txt: String, size: Float, color: Int) = TextView(this).apply {
        text = txt
        textSize = size
        setTextColor(color)
        typeface = ndot ?: Typeface.DEFAULT_BOLD
    }

    private fun sans(txt: String, size: Float, color: Int, bold: Boolean) = TextView(this).apply {
        text = txt
        textSize = size
        setTextColor(color)
        typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
    }

    private fun mono(txt: String, size: Float, color: Int) = TextView(this).apply {
        text = txt
        textSize = size
        setTextColor(color)
        typeface = Typeface.MONOSPACE
    }

    private fun btn(txt: String, fg: Int, bg: Int, onClick: () -> Unit) = TextView(this).apply {
        text = txt
        textSize = 12f
        setTextColor(fg)
        typeface = ndot ?: Typeface.MONOSPACE
        gravity = Gravity.CENTER
        background = android.graphics.drawable.GradientDrawable().apply {
            setColor(bg)
            cornerRadius = dp(24).toFloat()
        }
        setPadding(dp(20), dp(16), dp(20), dp(16))
        setOnClickListener { onClick() }
    }

    private fun resolveAppLabel(pkg: String): String {
        return try {
            val pm = packageManager
            val info = pm.getApplicationInfo(pkg, 0)
            pm.getApplicationLabel(info).toString()
        } catch (e: Exception) {
            pkg
        }
    }
    
    private fun resolveAppIcon(pkg: String): android.graphics.drawable.Drawable? {
        return try {
            packageManager.getApplicationIcon(pkg)
        } catch (e: Exception) {
            null
        }
    }
}
