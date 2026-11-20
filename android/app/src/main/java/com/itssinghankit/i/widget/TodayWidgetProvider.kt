package com.itssinghankit.i.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.widget.RemoteViews
import com.itssinghankit.i.R
import com.itssinghankit.i.data.model.TodaySnapshot
import com.itssinghankit.i.di.container
import com.itssinghankit.i.ui.main.MainActivity
import java.time.ZoneId
import java.time.ZonedDateTime

/**
 * Resizable home-screen widget.
 *  Header: [☀️ Routine 3/8 | ✅ To-do 4 left] [+], then today's progress bar and %.
 *          Tap a tab to switch (saved per widget in [WidgetPrefs]); "+" opens "add to-do" in the app.
 *  Daily:  refreshes itself just after midnight, so a new day shows without opening the app.
 *  Body:   the chosen tab's rows (see [TodayWidgetService]). Tapping a row ticks / unticks it.
 * Data comes from [com.itssinghankit.i.data.repository.TodayRepository] (same server as the app).
 */
class TodayWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { manager.updateAppWidget(it, build(context, it)) }
        manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_list)
        scheduleMidnight(context)
    }

    override fun onEnabled(context: Context) = scheduleMidnight(context)
    override fun onDisabled(context: Context) {
        context.getSystemService(AlarmManager::class.java).cancel(midnightIntent(context))
    }

    override fun onDeleted(context: Context, ids: IntArray) = ids.forEach { WidgetPrefs.forget(context, it) }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_MIDNIGHT) {
            refreshAll(context)          // new day: list, tabs and % reload from the server
            scheduleMidnight(context)    // and again tomorrow
            return
        }
        if (intent.action == ACTION_TAB) {
            val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
            val tab = intent.getStringExtra(EXTRA_TAB) ?: return
            if (id == AppWidgetManager.INVALID_APPWIDGET_ID) return
            WidgetPrefs.setTab(context, id, tab)
            val m = AppWidgetManager.getInstance(context)
            m.partiallyUpdateAppWidget(id, RemoteViews(context.packageName, R.layout.widget_today).also { styleTabs(it, tab) })
            m.notifyAppWidgetViewDataChanged(intArrayOf(id), R.id.widget_list) // list reloads for the new tab
            return
        }
        if (intent.action != ACTION_TOGGLE) return
        val pending = goAsync()
        Thread {
            try {
                val kind = intent.getStringExtra(EXTRA_KIND)
                val id = intent.getStringExtra(EXTRA_ID)
                if (kind != null && id != null) {
                    context.container.todayRepository.toggle(kind, id, intent.getStringExtra(EXTRA_DATE) ?: "", intent.getBooleanExtra(EXTRA_DONE, false))
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
        views.setOnClickPendingIntent(R.id.widget_tab_routine, tabIntent(context, widgetId, WidgetPrefs.ROUTINE))
        views.setOnClickPendingIntent(R.id.widget_tab_todo, tabIntent(context, widgetId, WidgetPrefs.TODO))
        styleTabs(views, WidgetPrefs.tab(context, widgetId))
        views.setOnClickPendingIntent(R.id.widget_add, openApp(context, "add-todo", 1))
        views.setOnClickPendingIntent(R.id.widget_progress_row, openApp(context, "home", 2))
        return views
    }

    /**
     * Wakes the widget shortly after the next midnight (phone's time zone, IST for you).
     * A 10-minute window (00:01–00:11): needs no special "exact alarm" permission, and Android can batch it.
     * Also the 30-minute updatePeriodMillis refresh still runs as a backup.
     */
    private fun scheduleMidnight(context: Context) {
        val next = ZonedDateTime.now().toLocalDate().plusDays(1).atStartOfDay(ZoneId.systemDefault()).plusMinutes(1)
        context.getSystemService(AlarmManager::class.java)
            .setWindow(AlarmManager.RTC, next.toInstant().toEpochMilli(), 10 * 60_000L, midnightIntent(context))
    }

    private fun midnightIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
        context, 3, Intent(context, TodayWidgetProvider::class.java).setAction(ACTION_MIDNIGHT),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    private fun tabIntent(context: Context, widgetId: Int, tab: String): PendingIntent {
        val i = Intent(context, TodayWidgetProvider::class.java).setAction(ACTION_TAB)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId).putExtra(EXTRA_TAB, tab)
        // A different request code per widget and tab, so Android keeps them as separate intents.
        val code = widgetId * 10 + if (tab == WidgetPrefs.ROUTINE) 1 else 2
        return PendingIntent.getBroadcast(context, code, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun openApp(context: Context, route: String, code: Int): PendingIntent {
        val i = Intent(context, MainActivity::class.java)
            .putExtra(MainActivity.EXTRA_ROUTE, route)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        return PendingIntent.getActivity(context, code, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    companion object {
        const val ACTION_TOGGLE = "com.itssinghankit.i.TOGGLE"
        const val ACTION_TAB = "com.itssinghankit.i.TAB"
        const val ACTION_MIDNIGHT = "com.itssinghankit.i.MIDNIGHT"
        const val EXTRA_TAB = "tab"
        const val EXTRA_KIND = "kind"
        const val EXTRA_ID = "id"
        const val EXTRA_DATE = "date"
        const val EXTRA_DONE = "done"
        private val INK = Color.parseColor("#16151D")

        fun refreshAll(context: Context) {
            val m = AppWidgetManager.getInstance(context)
            val ids = m.getAppWidgetIds(ComponentName(context, TodayWidgetProvider::class.java))
            if (ids.isNotEmpty()) m.notifyAppWidgetViewDataChanged(ids, R.id.widget_list)
        }

        /** Selected tab = white pill + dark text; the other = plain grey text. */
        fun styleTabs(v: RemoteViews, tab: String) {
            val on = if (tab == WidgetPrefs.TODO) R.id.widget_tab_todo else R.id.widget_tab_routine
            val off = if (on == R.id.widget_tab_todo) R.id.widget_tab_routine else R.id.widget_tab_todo
            v.setInt(on, "setBackgroundResource", R.drawable.tab_on)
            v.setInt(off, "setBackgroundResource", 0)
            v.setTextColor(on, INK)
            v.setTextColor(off, Color.WHITE)
        }

        /** Fills the tabs' counts and the % once the list has fresh data (called from the list's background thread). */
        fun updateHeader(context: Context, widgetId: Int, t: TodaySnapshot?) {
            val v = RemoteViews(context.packageName, R.layout.widget_today)
            if (t == null) {
                v.setTextViewText(R.id.widget_tab_routine, "☀️ Routine")
                v.setTextViewText(R.id.widget_tab_todo, "✅ To-do")
                v.setTextViewText(R.id.widget_percent, "")
                v.setProgressBar(R.id.widget_progress, 100, 0, false)
            } else {
                v.setTextViewText(R.id.widget_tab_routine, "☀️ Routine  ${t.routineDone}/${t.routine.size}")
                v.setTextViewText(R.id.widget_tab_todo, if (t.todos.isEmpty()) "✅ To-do" else "✅ To-do  ${t.todosLeft} left")
                v.setTextViewText(R.id.widget_percent, (if (t.percent >= 100) "🎉" else "") + "${t.percent}%")
                v.setProgressBar(R.id.widget_progress, 100, t.percent.coerceIn(0, 100), false)
            }
            AppWidgetManager.getInstance(context).partiallyUpdateAppWidget(widgetId, v)
        }
    }
}
