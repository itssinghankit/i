package com.itssinghankit.i.ui.main

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.view.animation.AnticipateInterpolator
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.OnBackPressedCallback
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.animation.doOnEnd
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.itssinghankit.i.BuildConfig
import com.itssinghankit.i.auth.GoogleSignInClient
import com.itssinghankit.i.ui.update.UpdateSheet
import com.itssinghankit.i.widget.TodayWidgetProvider
import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * The View in MVVM. The UI itself is the web app (React) in a WebView; this class only:
 *  - sets up the WebView, splash and full-screen layout,
 *  - draws [MainUiState] from [MainViewModel] (load URL, error page, update dialog),
 *  - reports page events back to the ViewModel,
 *  - hosts the JavaScript bridge ([WebAppBridge]).
 * Which server: BuildConfig.APP_URL (debug → I_DEV_URL, release → I_APP_URL, see app/build.gradle.kts).
 */
class MainActivity : AppCompatActivity(), WebAppBridge.Host {
    private val vm: MainViewModel by viewModels { MainViewModel.Factory }
    private lateinit var web: WebView
    private lateinit var root: FrameLayout
    @Volatile private var pageUrl = ""
    private var loadedId = 0L
    private var shownError: LoadError? = null
    private var safe = floatArrayOf(0f, 0f, 0f, 0f) // status / gesture bar sizes in CSS px: top, bottom, left, right

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        setupSplash()
        super.onCreate(savedInstanceState)

        web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            setBackgroundColor(BG)
            overScrollMode = WebView.OVER_SCROLL_NEVER
            addJavascriptInterface(WebAppBridge(this@MainActivity), "Android")
            webViewClient = PageClient()
        }
        // Plain full-screen container: every touch (scroll, drag handles, swipes) goes straight to the page.
        root = FrameLayout(this).apply {
            addView(web, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
            setBackgroundColor(BG)
        }
        setupFullScreen(root)
        setContentView(root)
        setLightBars(true)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { if (web.canGoBack()) web.goBack() else finish() }
        })

        observeViewModel()
        vm.start(intent?.getStringExtra(EXTRA_ROUTE))
        if (BuildConfig.DEBUG && intent?.getBooleanExtra(EXTRA_PREVIEW_UPDATE, false) == true) vm.previewUpdate()
    }

    // ---------- draw the ViewModel's state ----------
    private fun observeViewModel() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch {
                    vm.state.collect { s ->
                        s.load?.let { if (it.id != loadedId && s.error == null) { loadedId = it.id; web.loadUrl(it.url) } }
                        if (s.error != null && s.error != shownError) {
                            web.loadDataWithBaseURL(null, LoadErrorPage.html(s.error.url, s.error.reason), "text/html", "utf-8", null)
                        }
                        shownError = s.error
                        s.update?.let { UpdateSheet.show(this@MainActivity, root, it); vm.updateShown() }
                    }
                }
                launch {
                    // The ViewModel asks: has the page drawn yet? ("booted" = something inside #root)
                    vm.bootChecks.collect { id ->
                        web.evaluateJavascript("(function(){var r=document.getElementById('root');return !!(r&&r.childElementCount)})()") { v ->
                            vm.onBootResult(id, v == "true")
                        }
                    }
                }
            }
        }
    }

    private inner class PageClient : WebViewClient() {
        override fun onPageFinished(view: WebView, url: String) { pageUrl = url; vm.onPageFinished(); pushSafeArea() }
        override fun onPageCommitVisible(view: WebView, url: String) { pushSafeArea() }
        override fun onReceivedError(view: WebView, req: WebResourceRequest, err: WebResourceError) {
            if (req.isForMainFrame) vm.onLoadFailed(req.url.toString(), err.description?.toString() ?: "Network error")
        }
        override fun onReceivedHttpError(view: WebView, req: WebResourceRequest, res: WebResourceResponse) {
            if (req.isForMainFrame && res.statusCode >= 400) vm.onLoadFailed(req.url.toString(), "Server error ${res.statusCode}")
        }
        // Links to other sites open in the browser, not inside the app.
        override fun shouldOverrideUrlLoading(view: WebView, req: WebResourceRequest): Boolean {
            if (req.url.toString().startsWith(BuildConfig.APP_URL)) return false
            startActivity(Intent(Intent.ACTION_VIEW, req.url)); return true
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.getStringExtra(EXTRA_ROUTE)?.let { web.evaluateJavascript("location.hash=${JSONObject.quote(it)}", null) }
    }

    override fun onResume() {
        super.onResume()
        web.evaluateJavascript("window.iRefresh && window.iRefresh()", null)
    }

    // ---------- splash + full screen ----------
    private fun setupSplash() {
        val splash = installSplashScreen()
        val started = System.currentTimeMillis()
        // Stays up until the page has loaded (max 3 s), so you never see a blank screen.
        splash.setKeepOnScreenCondition { !vm.state.value.pageReady && System.currentTimeMillis() - started < SPLASH_MAX_MS }
        splash.setOnExitAnimationListener { view ->
            val icon = view.iconView
            AnimatorSet().apply {
                playTogether(
                    ObjectAnimator.ofFloat(icon, View.SCALE_X, 1f, 1.6f),
                    ObjectAnimator.ofFloat(icon, View.SCALE_Y, 1f, 1.6f),
                    ObjectAnimator.ofFloat(icon, View.ALPHA, 1f, 0f),
                    ObjectAnimator.ofFloat(view.view, View.ALPHA, 1f, 0f),
                )
                interpolator = AnticipateInterpolator(1.2f)
                duration = 420
                doOnEnd { view.remove(); setLightBars(true) } // the splash leaves white icons behind
                start()
            }
        }
    }

    /** Draw behind the status and gesture bars; the page gets the bar sizes as CSS margins (--safe-*). */
    private fun setupFullScreen(root: View) {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
        if (android.os.Build.VERSION.SDK_INT >= 29) window.isNavigationBarContrastEnforced = false
        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val d = resources.displayMetrics.density
            safe = floatArrayOf(bars.top / d, bars.bottom / d, bars.left / d, bars.right / d)
            pushSafeArea()
            insets
        }
    }

    private fun pushSafeArea() {
        if (!::web.isInitialized) return
        val (t, b, l, r) = safe.toList()
        web.evaluateJavascript(
            "(function(s){s.setProperty('--safe-t','${t}px');s.setProperty('--safe-b','${b}px');" +
                "s.setProperty('--safe-l','${l}px');s.setProperty('--safe-r','${r}px')})(document.documentElement.style)", null)
    }

    /** Sends a value into the page as a JavaScript string, safely quoted. */
    private fun callJs(fn: String, value: String?) {
        val arg = if (value == null) "null" else JSONObject.quote(value)
        runOnUiThread { web.evaluateJavascript("window.$fn && window.$fn($arg)", null) }
    }

    // ---------- WebAppBridge.Host (called from the page) ----------
    override fun isTrustedPage() = pageUrl.startsWith(BuildConfig.APP_URL)
    override fun refreshWidget() = TodayWidgetProvider.refreshAll(this)
    override fun setLightBars(light: Boolean) = runOnUiThread {
        WindowCompat.getInsetsController(window, window.decorView).apply {
            isAppearanceLightStatusBars = light
            isAppearanceLightNavigationBars = light
        }
    }
    override fun retryLoad() = runOnUiThread { vm.retry() }
    override fun startGoogleSignIn() {
        lifecycleScope.launch {
            when (val r = GoogleSignInClient.signIn(this@MainActivity)) {
                is GoogleSignInClient.Result.Success -> callJs("onNativeGoogleCredential", r.idToken)
                is GoogleSignInClient.Result.Failure -> callJs("onNativeGoogleError", r.message)
                GoogleSignInClient.Result.Cancelled -> callJs("onNativeGoogleError", null)
            }
        }
    }
    override fun googleSignOut() { lifecycleScope.launch { GoogleSignInClient.signOut(this@MainActivity) } }
    override fun saveSession(token: String) { vm.saveSession(token); refreshWidget() }
    override fun clearSession() { vm.clearSession(); refreshWidget() }

    companion object {
        const val EXTRA_ROUTE = "route"
        /** Debug builds only: `adb shell am start -n com.itssinghankit.i/.MainActivity --ez preview_update true` shows the update sheet. */
        const val EXTRA_PREVIEW_UPDATE = "preview_update"
        private const val SPLASH_MAX_MS = 3000L
        private val BG = Color.parseColor("#F7F6FC")
    }
}
