package com.itssinghankit.i.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.itssinghankit.i.MainActivity
import com.itssinghankit.i.R

/**
 * Resizable home-screen widget: header with today's %, a "+" that opens "add to-do" in the app,
 * then a scrolling list of daily routine items and to-dos. Tapping a row ticks / unticks it.
 * The routine itself can only be edited inside the app.
 */
class TodayWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { manager.updateAppWidget(it, build(context, it)) }
        manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_list)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action != ACTION_TOGGLE) return
        val pending = goAsync()
        Thread {
            try {
                val kind = intent.getStringExtra(EXTRA_KIND)
                val id = intent.getStringExtra(EXTRA_ID)
                if (kind != null && id != null) {
                    WidgetApi.toggle(context, kind, id, intent.getStringExtra(EXTRA_DATE) ?: "", intent.getBooleanExtra(EXTRA_DONE, false))
                }
            } catch (_: Exception) {
                /* offline or signed out: the list just stays as it was */
            } finally {
                refreshAll(context)
                pending.finish() // always tell Android we're done, or it may kill the app
            }
        }.start()
    }

    private fun build(context: Context, widgetId: Int): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_today)

        val listIntent = Intent(context, TodayWidgetService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
        }
        views.setRemoteAdapter(R.id.widget_list, listIntent)
        views.setEmptyView(R.id.widget_list, R.id.widget_empty)

        // Row taps become a TOGGLE broadcast back to this provider.
        val toggle = Intent(context, TodayWidgetProvider::class.java).setAction(ACTION_TOGGLE)
        views.setPendingIntentTemplate(
            R.id.widget_list,
            PendingIntent.getBroadcast(context, 0, toggle, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE),
        )
        views.setOnClickPendingIntent(R.id.widget_add, openApp(context, "add-todo", 1))
        views.setOnClickPendingIntent(R.id.widget_header, openApp(context, "home", 2))
        return views
    }

    private fun openApp(context: Context, route: String, code: Int): PendingIntent {
        val i = Intent(context, MainActivity::class.java)
            .putExtra(MainActivity.EXTRA_ROUTE, route)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        return PendingIntent.getActivity(context, code, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    companion object {
        const val ACTION_TOGGLE = "com.itssinghankit.i.TOGGLE"
        const val EXTRA_KIND = "kind"
        const val EXTRA_ID = "id"
        const val EXTRA_DATE = "date"
        const val EXTRA_DONE = "done"

        fun refreshAll(context: Context) {
            val m = AppWidgetManager.getInstance(context)
            val ids = m.getAppWidgetIds(ComponentName(context, TodayWidgetProvider::class.java))
            if (ids.isNotEmpty()) m.notifyAppWidgetViewDataChanged(ids, R.id.widget_list)
        }
    }
}
