package com.itssinghankit.i.widget

import android.content.Context

/** Which tab (Routine or To-do) each placed widget shows. Saved per widget, so two widgets can differ. */
object WidgetPrefs {
    const val ROUTINE = "routine"
    const val TODO = "todo"
    private fun prefs(c: Context) = c.getSharedPreferences("widget", Context.MODE_PRIVATE)

    fun tab(c: Context, widgetId: Int): String = prefs(c).getString("tab_$widgetId", ROUTINE) ?: ROUTINE
    fun setTab(c: Context, widgetId: Int, tab: String) = prefs(c).edit().putString("tab_$widgetId", tab).apply()
    fun forget(c: Context, widgetId: Int) = prefs(c).edit().remove("tab_$widgetId").apply()
}
