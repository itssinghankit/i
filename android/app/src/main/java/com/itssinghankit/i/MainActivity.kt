package com.itssinghankit.i

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.itssinghankit.i.widget.TodayWidgetProvider

/**
 * The whole UI is the React app, shown in a WebView.
 * Native parts: the home-screen widget, deep links from it (#add-todo), and the GitHub update check.
 */
class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
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
                // Links to other sites open in the browser, not inside the app.
                override fun shouldOverrideUrlLoading(view: WebView, req: WebResourceRequest): Boolean {
                    if (req.url.toString().startsWith(BuildConfig.APP_URL)) return false
                    startActivity(Intent(Intent.ACTION_VIEW, req.url)); return true
                }
            }
        }
        setContentView(SwipeRefreshLayout(this).apply {
            addView(web)
            isEnabled = false // the app has its own gestures; pull-to-refresh is off by default
        })

        web.loadUrl(urlFor(intent))
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { if (web.canGoBack()) web.goBack() else finish() }
        })
        UpdateChecker.check(this) { version, url -> showUpdate(version, url) }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.getStringExtra(EXTRA_ROUTE)?.let { web.evaluateJavascript("location.hash='$it'", null) }
    }

    override fun onResume() {
        super.onResume()
        web.evaluateJavascript("window.iRefresh && window.iRefresh()", null)
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

    /** Called from JavaScript as window.Android.refreshWidget() after every change. */
    inner class Bridge {
        @JavascriptInterface fun refreshWidget() = TodayWidgetProvider.refreshAll(this@MainActivity)
        @JavascriptInterface fun appVersion(): String = BuildConfig.VERSION_NAME
    }

    companion object { const val EXTRA_ROUTE = "route" }
}
