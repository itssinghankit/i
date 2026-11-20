package com.itssinghankit.i

import android.content.Context

/**
 * Keeps the login token on the phone so the home-screen widget can call the server as you.
 * The web app sends it here after you sign in (window.Android.setSession) and clears it on sign-out.
 */
object SessionStore {
    private const val PREFS = "i_session"
    private const val KEY = "token"

    fun get(context: Context): String? =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)

    fun set(context: Context, token: String) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, token).apply()

    fun clear(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY).apply()
}
