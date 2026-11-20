package com.itssinghankit.i.widget

import android.content.Context

/**
 * Small saved settings for the widget:
 *  - which tab (Routine or To-do) each placed widget shows (per widget, so two widgets can differ),
 *  - the light / dark choice from the app's Account screen ("system", "light" or "dark").
 */
object WidgetPrefs {
    const val ROUTINE = "routine"
    const val TODO = "todo"
    private fun prefs(c: Context) = c.getSharedPreferences("widget", Context.MODE_PRIVATE)

    fun tab(c: Context, widgetId: Int): String = prefs(c).getString("tab_$widgetId", ROUTINE) ?: ROUTINE
    fun setTab(c: Context, widgetId: Int, tab: String) = prefs(c).edit().putString("tab_$widgetId", tab).apply()
    fun forget(c: Context, widgetId: Int) = prefs(c).edit().remove("tab_$widgetId").apply()

    fun theme(c: Context): String = prefs(c).getString("theme", "system") ?: "system"
    /** Returns true if the choice changed. */
    fun setTheme(c: Context, theme: String): Boolean {
        val t = if (theme in listOf("system", "light", "dark")) theme else "system"
        if (t == theme(c)) return false
        prefs(c).edit().putString("theme", t).apply()
        return true
    }
}
