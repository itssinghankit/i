package com.itssinghankit.i.ui.main

import android.webkit.JavascriptInterface
import com.itssinghankit.i.BuildConfig

/**
 * Functions the web app can call as window.Android.<name>().
 * Runs on a background thread; it only forwards to [Host] (the Activity), which talks to the ViewModel.
 */
class WebAppBridge(private val host: Host) {
    interface Host {
        fun isTrustedPage(): Boolean
        fun refreshWidget()
        fun setLightBars(light: Boolean)
        fun retryLoad()
        fun startGoogleSignIn()
        fun googleSignOut()
        fun saveSession(token: String)
        fun clearSession()
    }

    @JavascriptInterface fun appVersion(): String = BuildConfig.VERSION_NAME
    @JavascriptInterface fun refreshWidget() = host.refreshWidget()
    /** Light page → dark status icons; dark page (sign-in) → white icons. */
    @JavascriptInterface fun setLightBars(light: Boolean) = host.setLightBars(light)
    /** "Retry" on the can't-load page. */
    @JavascriptInterface fun retry() = host.retryLoad()
    /** Opens the Google account sheet; the result goes back to window.onNativeGoogleCredential / onNativeGoogleError. */
    @JavascriptInterface fun googleSignIn() { if (host.isTrustedPage()) host.startGoogleSignIn() }
    @JavascriptInterface fun googleSignOut() = host.googleSignOut()
    /** Saves the login token for the widget. */
    @JavascriptInterface fun setSession(token: String) { if (host.isTrustedPage()) host.saveSession(token) }
    @JavascriptInterface fun clearSession() = host.clearSession()
}
