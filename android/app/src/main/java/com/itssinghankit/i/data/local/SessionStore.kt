package com.itssinghankit.i.data.local

import android.content.Context

/** Keeps the login token on the phone (private app storage). */
class SessionStore(context: Context) {
    private val prefs = context.getSharedPreferences("i_session", Context.MODE_PRIVATE)
    fun get(): String? = prefs.getString(KEY, null)
    fun set(token: String) = prefs.edit().putString(KEY, token).apply()
    fun clear() = prefs.edit().remove(KEY).apply()
    private companion object { const val KEY = "token" }
}
