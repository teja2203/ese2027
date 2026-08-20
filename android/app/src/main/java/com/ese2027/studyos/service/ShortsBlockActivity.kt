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
import android.widget.TextView

class ShortsBlockActivity : Activity() {

    companion object {
        const val EXTRA_PACKAGE = "pkg"
        const val EXTRA_LABEL = "label"
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

    private var ndot: Typeface? = null
    private lateinit var pkg: String

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        ndot = runCatching {
            Typeface.createFromAsset(assets, "fonts/Ndot-57-Aligned.ttf")
        }.getOrNull()

        pkg = intent.getStringExtra(EXTRA_PACKAGE) ?: ""
        val label = intent.getStringExtra(EXTRA_LABEL) ?: resolveAppLabel(pkg)
        setContentView(buildView(label))
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
        AppBlockingService.blockScreenOpen = false
        AppBlockingService.notifyBlockScreenClosed()
    }

    override fun onBackPressed() {
        dismissWithGrace()
    }

    private fun dismissWithGrace() {
        val intent = android.content.Intent("com.ese2027.studyos.ACTION_GLOBAL")
        intent.putExtra("action", android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK)
        sendBroadcast(intent)
        finish()
    }

    private fun buildView(appLabel: String): View {
        val root = FrameLayout(this)
        root.setBackgroundColor(android.graphics.Color.TRANSPARENT)
        
        // Solid dark flat backdrop instead of gradient dim (Nothing style: flat surfaces)
        val dimBg = View(this).apply {
            setBackgroundColor(0xD9000000.toInt()) // Flat 85% black
        }
        root.addView(dimBg, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))

        val sheet = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(24), dp(32), dp(24), dp(48))
            background = android.graphics.drawable.GradientDrawable().apply {
                setColor(0xFF000000.toInt()) // Pitch black surface
                cornerRadii = floatArrayOf(dp(16).toFloat(), dp(16).toFloat(), dp(16).toFloat(), dp(16).toFloat(), 0f, 0f, 0f, 0f)
                setStroke(dp(1), cLine) // Sharp 1px border separation
            }
        }

        // Header: Icon + App Name
        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val icon = ImageView(this).apply { setImageDrawable(resolveAppIcon(pkg)) }
        header.addView(icon, LinearLayout.LayoutParams(dp(24), dp(24)))
        header.addView(spacer(12, true))
        header.addView(mono(appLabel.uppercase(), 14f, cInk).apply { letterSpacing = 0.05f })
        
        sheet.addView(header, lp(LinearLayout.LayoutParams.MATCH_PARENT).apply { gravity = Gravity.LEFT })
        sheet.addView(spacer(24))

        // Huge Interruption Title
        sheet.addView(display("SHORTS BLOCKED", 32f, cAcc).apply { letterSpacing = 0.05f }, lp(LinearLayout.LayoutParams.MATCH_PARENT).apply { gravity = Gravity.LEFT })
        sheet.addView(spacer(32))

        val grid = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        
        val allow1stBtn = TextView(this).apply {
            text = "ALLOW 1ST SHORT"
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
            setOnClickListener {
                AppBlockingService.notifyShortsDismissed(pkg, 60_000L) // 1 minute grace
                finish()
            }
        }
        grid.addView(allow1stBtn, lp(LinearLayout.LayoutParams.MATCH_PARENT))
        grid.addView(spacer(12))
        
        val allow5mBtn = TextView(this).apply {
            text = "ALLOW 5 MINS"
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
            setOnClickListener {
                AppBlockingService.notifyShortsDismissed(pkg, 5L * 60_000L) // 5 minutes grace
                finish()
            }
        }
        grid.addView(allow5mBtn, lp(LinearLayout.LayoutParams.MATCH_PARENT))
        sheet.addView(grid, lp(LinearLayout.LayoutParams.MATCH_PARENT))
        sheet.addView(spacer(16))

        val closeBtn = TextView(this).apply {
            text = "LEAVE SHORTS"
            textSize = 16f
            if (ndot != null) typeface = ndot else typeface = Typeface.MONOSPACE
            setTextColor(0xFF000000.toInt())
            gravity = Gravity.CENTER
            background = android.graphics.drawable.GradientDrawable().apply {
                setColor(cInk)
                cornerRadius = dp(4).toFloat()
            }
            setPadding(0, dp(16), 0, dp(16))
            setOnClickListener { dismissWithGrace() }
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
