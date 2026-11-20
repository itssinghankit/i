package com.itssinghankit.i

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.os.Bundle
import android.os.SystemClock
import android.view.View
import android.view.animation.AnticipateInterpolator
import android.webkit.JavascriptInterface
import android.view.ViewGroup
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.animation.doOnEnd
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import org.json.JSONObject
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.itssinghankit.i.widget.TodayWidgetProvider

/**
 * The whole UI is the React app, shown in a WebView.
 * Native parts: the home-screen widget, deep links from it (#add-todo), the GitHub update check,
 * and Google sign-in (Google blocks its sign-in page inside WebViews, so it runs natively here).
 *
 * Which server it loads: BuildConfig.APP_URL, set per build type in app/build.gradle.kts
 * from android/gradle.properties (debug → I_DEV_URL, release → I_APP_URL).
 */
class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    @Volatile private var pageReady = false
    // The page currently shown; the bridge only trusts pages from our own server.
    @Volatile private var pageUrl = ""

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        // Splash: stays up until the page has loaded (max 3 s), so you never see a blank screen.
        val splash = installSplashScreen()
        val started = SystemClock.uptimeMillis()
        splash.setKeepOnScreenCondition { !pageReady && SystemClock.uptimeMillis() - started < SPLASH_MAX_MS }
        // Exit animation: the icon grows a little and the splash fades away.
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
                doOnEnd {
                    view.remove()
                    // The splash leaves white icons behind; switch back to dark icons for the light app.
                    WindowCompat.getInsetsController(window, window.decorView).apply {
                        isAppearanceLightStatusBars = true
                        isAppearanceLightNavigationBars = true
                    }
                }
                start()
            }
        }
        super.onCreate(savedInstanceState)
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = true
        window.statusBarColor = Color.parseColor("#F7F6FC")

        web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            setBackgroundColor(Color.parseColor("#F7F6FC"))
            overScrollMode = WebView.OVER_SCROLL_NEVER
            addJavascriptInterface(Bridge(), "Android")
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, url: String) { pageReady = true; pageUrl = url }

                // The page itself couldn't load (no internet, server not running, wrong address).
                override fun onReceivedError(view: WebView, req: WebResourceRequest, err: WebResourceError) {
                    if (req.isForMainFrame) showLoadError(req.url.toString(), err.description?.toString() ?: "Network error")
                }

                // The server answered with an error (e.g. 404 or 500) for the page itself.
                override fun onReceivedHttpError(view: WebView, req: WebResourceRequest, res: WebResourceResponse) {
                    if (req.isForMainFrame && res.statusCode >= 400) showLoadError(req.url.toString(), "Server error ${res.statusCode}")
                }

                // Links to other sites open in the browser, not inside the app.
                override fun shouldOverrideUrlLoading(view: WebView, req: WebResourceRequest): Boolean {
                    if (req.url.toString().startsWith(BuildConfig.APP_URL)) return false
                    startActivity(Intent(Intent.ACTION_VIEW, req.url)); return true
                }
            }
        }
        val root = SwipeRefreshLayout(this).apply {
            addView(web, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
            isEnabled = false // the app has its own gestures; pull-to-refresh is off by default
            setBackgroundColor(Color.parseColor("#F7F6FC"))
        }
        // Android 15+ draws apps behind the status bar and gesture bar. Pad the app so nothing hides under them.
        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            WindowInsetsCompat.CONSUMED
        }
        setContentView(root)
        // Dark clock/battery icons on the app's light background (set after the splash theme is replaced).
        WindowCompat.getInsetsController(window, window.decorView).apply {
            isAppearanceLightStatusBars = true
            isAppearanceLightNavigationBars = true
        }

        web.loadUrl(urlFor(intent))
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { if (web.canGoBack()) web.goBack() else finish() }
        })
        // Only real releases ask "new version?"; debug builds from Android Studio don't.
        if (!BuildConfig.DEBUG) UpdateChecker.check(this) { version, url -> showUpdate(version, url) }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.getStringExtra(EXTRA_ROUTE)?.let { web.evaluateJavascript("location.hash='$it'", null) }
    }

    override fun onResume() {
        super.onResume()
        web.evaluateJavascript("window.iRefresh && window.iRefresh()", null)
    }

    /**
     * Instead of a blank white page, show what went wrong and a Retry button.
     * Debug builds also say which server they tried, since they use your Mac (I_DEV_URL).
     */
    private fun showLoadError(url: String, reason: String) {
        pageReady = true // let the splash go away so the message is visible
        val esc = { s: String -> s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;") }
        val hint = if (BuildConfig.DEBUG)
            "This is a <b>debug</b> build, so it loads your Mac's local server. Start it with <code>npm start</code> in the <code>server</code> folder, then tap Retry. (On a real phone, 10.0.2.2 doesn't work: set <code>I_DEV_URL</code> to your Mac's Wi-Fi address.)"
        else "Check your internet connection and tap Retry."
        val html = """
            <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
            <style>
              body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#F7F6FC;
                   font-family:system-ui,sans-serif;color:#16151D;text-align:center}
              .c{padding:28px;max-width:340px}
              .logo{width:72px;height:72px;border-radius:22px;margin:0 auto 18px;background:linear-gradient(135deg,#7C3AED,#EC4899 55%,#F97316)}
              h1{font-size:20px;margin:0 0 8px} p{font-size:14px;color:#5D5B6B;line-height:1.45;margin:6px 0}
              code{background:#EEEDF4;padding:1px 5px;border-radius:5px;font-size:12px}
              .u{font-size:12px;color:#9A98A8;word-break:break-all}
              button{margin-top:18px;height:48px;width:100%;border:0;border-radius:14px;color:#fff;font-size:16px;font-weight:700;
                     background:linear-gradient(135deg,#7C3AED,#EC4899 55%,#F97316)}
            </style></head><body><div class="c">
              <div class="logo"></div>
              <h1>Can't open i right now</h1>
              <p>${esc(reason)}</p>
              <p>$hint</p>
              <p class="u">${esc(url)}</p>
              <button onclick="Android.retry()">Retry</button>
            </div></body></html>
        """.trimIndent()
        runOnUiThread { web.loadDataWithBaseURL(null, html, "text/html", "utf-8", null) }
    }

    private fun urlFor(intent: Intent?): String {
        val route = intent?.getStringExtra(EXTRA_ROUTE)
        return if (route != null) "${BuildConfig.APP_URL}/#$route" else BuildConfig.APP_URL
    }

    private fun showUpdate(version: String, url: String) {
        AlertDialog.Builder(this)
            .setTitle("New version $version")
            .setMessage("A newer version of i is on GitHub. Download it now?")
            .setPositiveButton("Download") { _, _ -> startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
            .setNegativeButton("Later", null)
            .show()
    }

    private fun trusted() = pageUrl.startsWith(BuildConfig.APP_URL)

    /** Sends a value into the page as a JavaScript string, safely quoted. */
    private fun callJs(fn: String, value: String?) {
        val arg = if (value == null) "null" else JSONObject.quote(value)
        runOnUiThread { web.evaluateJavascript("window.$fn && window.$fn($arg)", null) }
    }

    /** Functions the web app can call as window.Android.<name>(). */
    inner class Bridge {
        @JavascriptInterface fun refreshWidget() = TodayWidgetProvider.refreshAll(this@MainActivity)
        @JavascriptInterface fun appVersion(): String = BuildConfig.VERSION_NAME

        /** "Retry" on the can't-load screen: load the app again. */
        @JavascriptInterface fun retry() { runOnUiThread { web.loadUrl(urlFor(null)) } }

        /** Opens the Google account sheet; the result goes back to window.onNativeGoogleCredential / onNativeGoogleError. */
        @JavascriptInterface fun googleSignIn() {
            if (!trusted()) return
            lifecycleScope.launch {
                when (val r = GoogleSignIn.signIn(this@MainActivity)) {
                    is GoogleSignIn.Result.Success -> callJs("onNativeGoogleCredential", r.idToken)
                    is GoogleSignIn.Result.Failure -> callJs("onNativeGoogleError", r.message)
                    GoogleSignIn.Result.Cancelled -> callJs("onNativeGoogleError", null)
                }
            }
        }

        @JavascriptInterface fun googleSignOut() { lifecycleScope.launch { GoogleSignIn.signOut(this@MainActivity) } }

        /** Saves the login token for the widget, then refreshes it. */
        @JavascriptInterface fun setSession(token: String) {
            if (!trusted()) return
            SessionStore.set(this@MainActivity, token)
            TodayWidgetProvider.refreshAll(this@MainActivity)
        }

        @JavascriptInterface fun clearSession() {
            SessionStore.clear(this@MainActivity)
            TodayWidgetProvider.refreshAll(this@MainActivity)
        }
    }

    companion object {
        const val EXTRA_ROUTE = "route"
        private const val SPLASH_MAX_MS = 3000L
    }
}
