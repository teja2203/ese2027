package com.ese2027.studyos.ui

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.webkit.WebViewAssetLoader
import com.ese2027.studyos.BuildConfig
import com.ese2027.studyos.util.NotificationRoute
import kotlin.math.roundToInt

/**
 * The Android deliverable is the audited web application packaged locally.
 * Keeping one renderer is deliberate: the web app owns the exact layout,
 * scroll model, celebrations, WebAudio, persistence and interaction timing.
 */
class MainActivity : ComponentActivity() {
    companion object {
        const val EXTRA_ROUTE = "com.ese2027.studyos.extra.ROUTE"
    }

    private lateinit var webView: WebView
    private lateinit var bridge: EseWebBridge
    private lateinit var root: FrameLayout
    private var splashView: View? = null
    private var splashStartTime: Long = 0
    private val MIN_SPLASH_DURATION = 2000L

    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val prefs = getSharedPreferences("crash_prefs", android.content.Context.MODE_PRIVATE)
        val lastCrash = prefs.getString("last_crash", null)
        if (lastCrash != null) {
            android.widget.Toast.makeText(this, "Crash: " + lastCrash.take(150), android.widget.Toast.LENGTH_LONG).show()
            prefs.edit().remove("last_crash").apply()
            android.util.Log.e("StudyOSCrash", lastCrash)
        }
        // Keep the windowed (non edge-to-edge) layout so the in-app tab bar
        // sits above the Android navigation bar and stays tappable. Paint the
        // system bars black to match the dark theme instead of letting a white
        // or contrast-scrim strip show around the web content.
        window.statusBarColor = Color.BLACK
        window.navigationBarColor = Color.BLACK
        if (Build.VERSION.SDK_INT >= 29) {
            window.isNavigationBarContrastEnforced = false
        }

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        bridge = EseWebBridge(this)
        webView = WebView(this).apply {
            if (BuildConfig.DEBUG) {
                android.webkit.WebView.setWebContentsDebuggingEnabled(true)
            }
            setBackgroundColor(Color.BLACK)
            overScrollMode = View.OVER_SCROLL_NEVER
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mediaPlaybackRequiresUserGesture = true
            settings.builtInZoomControls = false
            settings.displayZoomControls = false
            settings.textZoom = (resources.configuration.fontScale * 100)
                .roundToInt()
                .coerceIn(100, 160)
            addJavascriptInterface(bridge, "AndroidESE")
            webChromeClient = object : WebChromeClient() {
                // Fullscreen API (flip-clock focus overlay uses requestFullscreen)
                // renders into this custom view. Without it the web app's
                // fullscreen request is silently dropped and the system bars stay.
                override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                    if (customView != null) {
                        callback.onCustomViewHidden()
                        return
                    }
                    customView = view
                    customViewCallback = callback
                    root.addView(view, FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT
                    ))
                    enterImmersive()
                }

                override fun onHideCustomView() {
                    customView?.let { root.removeView(it) }
                    customView = null
                    customViewCallback = null
                    exitImmersive()
                }
            }
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, url: String) {
                    super.onPageFinished(view, url)
                    // Remove splash once page is rendered
                    splashView?.let { sv ->
                        sv.animate().alpha(0f).setDuration(200).withEndAction {
                            root.removeView(sv)
                            splashView = null
                        }.start()
                    }
                }

                override fun onRenderProcessGone(
                    view: WebView,
                    detail: android.webkit.RenderProcessGoneDetail?
                ): Boolean {
                    // Chromium renderer crashed (common on Samsung after swipe-from-recents).
                    // Recreate the WebView to recover gracefully instead of showing blank.
                    root.removeView(webView)
                    webView.destroy()
                    recreate()
                    return true
                }

                override fun shouldOverrideUrlLoading(
                    view: WebView,
                    request: WebResourceRequest
                ): Boolean {
                    if (!request.isForMainFrame) return false
                    return handleTopLevelNavigation(request.url)
                }

                @Deprecated("Deprecated in Java")
                override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean =
                    handleTopLevelNavigation(Uri.parse(url))

                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest
                ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)

                @Deprecated("Deprecated in Java")
                override fun shouldInterceptRequest(view: WebView, url: String): WebResourceResponse? =
                    assetLoader.shouldInterceptRequest(android.net.Uri.parse(url))
            }
        }
        root = FrameLayout(this)
        root.addView(webView, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))
        setContentView(root)

        // Nothing-styled splash: pitch black with dotted title, shown while WebView cold-starts
        splashStartTime = System.currentTimeMillis()
        splashView = android.widget.FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
        }
        root.addView(splashView, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))

        webView.loadUrl(routeUrl(intent))

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (customView != null) {
                    webChromeClientShimHide()
                    return
                }
                webView.evaluateJavascript(
                    "typeof window.eseHandleAndroidBack === 'function'" +
                        " ? window.eseHandleAndroidBack() : false"
                ) { result ->
                    if (result == "false") finish()
                }
            }
        })
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        navigateToRoute(extractRoute(intent))
    }

    private fun routeUrl(intent: Intent?): String {
        val route = extractRoute(intent)
        return "https://appassets.androidplatform.net/index.html" + (route?.let { "#$it" } ?: "")
    }

    private fun extractRoute(intent: Intent?): String? {
        val routeFromExtra = intent?.getStringExtra(EXTRA_ROUTE)
        val routeFromUri = intent?.data?.getQueryParameter("route")
            ?: intent?.data?.lastPathSegment
        return NotificationRoute.normalize(routeFromExtra ?: routeFromUri)
    }

    private fun navigateToRoute(route: String?) {
        val normalized = NotificationRoute.normalize(route) ?: return
        webView.post {
            webView.evaluateJavascript(
                "if(typeof window.eseOpenRoute==='function'){window.eseOpenRoute('${normalized}')}" ,
                null
            )
        }
    }

    private fun handleTopLevelNavigation(uri: Uri): Boolean {
        val isHttp = uri.scheme.equals("http", ignoreCase = true) ||
            uri.scheme.equals("https", ignoreCase = true)
        if (!isHttp) return true
        if (uri.host.equals("appassets.androidplatform.net", ignoreCase = true)) return false

        runCatching { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
        return true
    }

    /** Hide the system bars so the flip clock is truly full screen. */
    fun enterImmersive() {
        runOnUiThread {
            if (Build.VERSION.SDK_INT >= 30) {
                window.setDecorFitsSystemWindows(false)
                window.insetsController?.let { controller ->
                    controller.systemBarsBehavior =
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    controller.hide(WindowInsets.Type.systemBars())
                }
            } else {
                @Suppress("DEPRECATION")
                window.decorView.systemUiVisibility = (
                    View.SYSTEM_UI_FLAG_FULLSCREEN or
                        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                        View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    )
            }
        }
    }

    /** Restore the system bars. */
    fun exitImmersive() {
        runOnUiThread {
            if (Build.VERSION.SDK_INT >= 30) {
                window.setDecorFitsSystemWindows(true)
                window.insetsController?.show(WindowInsets.Type.systemBars())
            } else {
                @Suppress("DEPRECATION")
                window.decorView.systemUiVisibility = 0
            }
        }
    }

    private fun webChromeClientShimHide() {
        customViewCallback?.onCustomViewHidden()
        customView?.let { root.removeView(it) }
        customView = null
        customViewCallback = null
        exitImmersive()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == EseWebBridge.NOTIFICATION_REQUEST_CODE) {
            bridge.onNotificationPermissionResult()
        }
    }

    override fun onDestroy() {
        runCatching {
            webView.stopLoading()
            bridge.close()
            root.removeView(webView)
            webView.destroy()
        }
        super.onDestroy()
    }
}
