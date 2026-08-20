package com.ese2027.studyos.service

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout

/**
 * Manages the SYSTEM_ALERT_WINDOW floating shield that mimics Regain's instant overlay.
 * Instantly covers the screen before the slower Activity transition can complete,
 * preventing split-screen leaks, PIP leaks, and transition flicker.
 */
object BlockOverlayManager {
    private const val TAG = "BlockOverlayManager"
    private var overlayView: View? = null

    @Synchronized
    fun showOverlay(context: Context) {
        if (!Settings.canDrawOverlays(context)) {
            Log.w(TAG, "Cannot draw overlays, permission missing.")
            return
        }
        if (overlayView != null) return

        val wm = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        
        // A simple, pure black shield.
        val view = FrameLayout(context).apply {
            setBackgroundColor(Color.BLACK)
        }
        
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        )
        params.gravity = Gravity.CENTER

        runCatching {
            wm.addView(view, params)
            overlayView = view
            Log.i(TAG, "SYSTEM_ALERT_WINDOW overlay added.")
        }.onFailure {
            Log.e(TAG, "Failed to add overlay", it)
        }
    }

    @Synchronized
    fun hideOverlay(context: Context) {
        val view = overlayView ?: return
        val wm = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        runCatching {
            wm.removeView(view)
            Log.i(TAG, "SYSTEM_ALERT_WINDOW overlay removed.")
        }.onFailure {
            Log.e(TAG, "Failed to remove overlay", it)
        }
        overlayView = null
    }
}
