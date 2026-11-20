package com.itssinghankit.i.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.text.SpannableString
import android.text.Spanned
import android.text.style.StrikethroughSpan
import android.view.View
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.itssinghankit.i.R
import com.itssinghankit.i.data.model.TodayItem
import com.itssinghankit.i.data.remote.SignedOutException
import com.itssinghankit.i.di.container

/** Supplies the rows of the widget list. onDataSetChanged runs on a background thread, so network is fine there. */
class TodayWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory =
        Factory(applicationContext, intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID))

    private class Factory(val context: Context, val widgetId: Int) : RemoteViewsFactory {
        // A row is an item or a friendly message. (The Routine / To-do tabs replace section headers.)
        private sealed class Line {
            data class Item(val item: TodayItem) : Line()
            data class Message(val emoji: String, val text: String) : Line()
        }
        private var lines: List<Line> = emptyList()
        private var theme = WidgetTheme(context)
        private var date = ""

        override fun onCreate() {}
        override fun onDestroy() {}
        override fun getCount() = lines.size
        override fun getViewTypeCount() = 2
        override fun getItemId(position: Int) = position.toLong()
        override fun hasStableIds() = false
        override fun getLoadingView(): RemoteViews? = null

        override fun onDataSetChanged() {
            theme = WidgetTheme(context)   // the light / dark choice may have changed
            lines = try {
                val t = context.container.todayRepository.today()
                date = t.date
                header(t)
                // Only the chosen tab's rows. Read each time, because tapping a tab reloads this list.
                if (WidgetPrefs.tab(context, widgetId) == WidgetPrefs.TODO) {
                    if (t.todos.isEmpty()) listOf(Line.Message("✨", "No to-dos today. Tap + to add one."))
                    else t.todos.map { Line.Item(it) }
                } else {
                    if (t.routine.isEmpty()) listOf(Line.Message("🌤️", "No routine for today.\nAdd one in the app's Routine tab."))
                    else t.routine.map { Line.Item(it) }
                }
            } catch (_: SignedOutException) {
                header(null)
                listOf(Line.Message("🔐", "Open i and sign in to see your routine and to-dos here."))
            } catch (_: Exception) {
                header(null)
                listOf(Line.Message("📡", "Can't reach the server right now.\nOpen the app to retry."))
            }
        }

        private fun header(t: com.itssinghankit.i.data.model.TodaySnapshot?) {
            if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) runCatching { TodayWidgetProvider.updateHeader(context, widgetId, t) }
        }

        override fun getViewAt(position: Int): RemoteViews = when (val line = lines[position]) {
            is Line.Message -> RemoteViews(context.packageName, R.layout.widget_message_row).apply {
                setTextViewText(R.id.msg_emoji, line.emoji)
                setTextViewText(R.id.msg_text, line.text)
                theme.ink3(this, R.id.msg_text)
            }
            is Line.Item -> itemRow(line.item)
        }

        private fun itemRow(r: TodayItem) = RemoteViews(context.packageName, R.layout.widget_item_row).apply {
            val color = parseColor(r.color) ?: if (r.kind == "todo") TODO_COLOR else Color.parseColor("#7C3AED")

            // Emoji on a soft circle of the item's own colour.
            setTextViewText(R.id.item_emoji, r.emoji.ifBlank { if (r.kind == "todo") "📝" else "⭐" })
            setInt(R.id.item_dot, "setColorFilter", color)
            setInt(R.id.item_dot, "setImageAlpha", if (r.done) 30 else 50)

            // Strike-through via a text span (paint flags can't be set on a widget).
            val title = SpannableString(r.title).apply {
                if (r.done) setSpan(StrikethroughSpan(), 0, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            }
            setTextViewText(R.id.item_title, title)
            if (r.done) theme.ink3(this, R.id.item_title) else theme.ink(this, R.id.item_title)

            if (r.minutes > 0) {
                setViewVisibility(R.id.item_time, View.VISIBLE)
                setTextViewText(R.id.item_time, mins(r.minutes))
                theme.background(this, R.id.item_time, theme.chipBg)
                theme.chipInk(this, R.id.item_time)
            } else setViewVisibility(R.id.item_time, View.GONE)

            // Check: empty ring, or a filled circle in the item's colour with a white tick.
            setViewVisibility(R.id.item_check_ring, if (r.done) View.GONE else View.VISIBLE)
            setImageViewResource(R.id.item_check_ring, theme.ring)
            setViewVisibility(R.id.item_check_fill, if (r.done) View.VISIBLE else View.GONE)
            setViewVisibility(R.id.item_check_tick, if (r.done) View.VISIBLE else View.GONE)
            setInt(R.id.item_check_fill, "setColorFilter", color)

            setOnClickFillInIntent(R.id.item_root, Intent().apply {
                putExtra(TodayWidgetProvider.EXTRA_KIND, r.kind)
                putExtra(TodayWidgetProvider.EXTRA_ID, r.id)
                putExtra(TodayWidgetProvider.EXTRA_DATE, date)
                putExtra(TodayWidgetProvider.EXTRA_DONE, r.done)
            })
        }

        private fun parseColor(hex: String?) = hex?.let { runCatching { Color.parseColor(it) }.getOrNull() }
        private fun mins(m: Int) = if (m >= 60) "${m / 60}h${if (m % 60 > 0) " ${m % 60}m" else ""}" else "${m}m"

        companion object { private val TODO_COLOR = Color.parseColor("#14B8A6") }
    }
}
