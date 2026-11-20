package com.itssinghankit.i.widget

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

/** Supplies the rows of the widget list. onDataSetChanged runs on a background thread, so network is fine there. */
class TodayWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory = Factory(applicationContext)

    private class Factory(val context: Context) : RemoteViewsFactory {
        // A row is either a section header or an item.
        private sealed class Line {
            data class Header(val text: String) : Line()
            data class Item(val row: WidgetApi.Row) : Line()
        }
        private var lines: List<Line> = emptyList()
        private var date = ""

        override fun onCreate() {}
        override fun onDestroy() {}
        override fun getCount() = lines.size
        override fun getViewTypeCount() = 2
        override fun getItemId(position: Int) = position.toLong()
        override fun hasStableIds() = false
        override fun getLoadingView(): RemoteViews? = null

        override fun onDataSetChanged() {
            lines = try {
                val t = WidgetApi.today(context)
                date = t.date
                val routineLeft = t.routine.count { !it.done }
                buildList {
                    add(Line.Header("DAILY ROUTINE · ${t.percent}% · $routineLeft left"))
                    t.routine.forEach { add(Line.Item(it)) }
                    add(Line.Header("TO-DO · ${t.todos.count { !it.done }} left"))
                    t.todos.forEach { add(Line.Item(it)) }
                }
            } catch (_: WidgetApi.SignedOut) {
                listOf(Line.Header("Open i and sign in with Google to see your day."))
            } catch (_: Exception) {
                listOf(Line.Header("Can't reach the server. Open the app to retry."))
            }
        }

        override fun getViewAt(position: Int): RemoteViews {
            return when (val line = lines[position]) {
                is Line.Header -> RemoteViews(context.packageName, R.layout.widget_header_row).apply {
                    setTextViewText(R.id.header_text, line.text)
                }
                is Line.Item -> RemoteViews(context.packageName, R.layout.widget_item_row).apply {
                    val r = line.row
                    // Strike-through via a text span (paint flags can't be set on a widget).
                    val title = SpannableString(r.title).apply {
                        if (r.done) setSpan(StrikethroughSpan(), 0, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                    }
                    setTextViewText(R.id.item_title, title)
                    setTextViewText(R.id.item_check, if (r.done) "✓" else "")
                    setInt(R.id.item_check, "setBackgroundResource", if (r.done) R.drawable.check_on else R.drawable.check_off)
                    setTextColor(R.id.item_title, if (r.done) Color.parseColor("#9A98A8") else Color.parseColor("#16151D"))
                    if (r.kind == "routine") {
                        setViewVisibility(R.id.item_time, View.VISIBLE)
                        setTextViewText(R.id.item_time, if (r.minutes >= 60) "${r.minutes / 60}h${if (r.minutes % 60 > 0) " ${r.minutes % 60}m" else ""}" else "${r.minutes}m")
                    } else setViewVisibility(R.id.item_time, View.GONE)
                    setOnClickFillInIntent(R.id.item_root, Intent().apply {
                        putExtra(TodayWidgetProvider.EXTRA_KIND, r.kind)
                        putExtra(TodayWidgetProvider.EXTRA_ID, r.id)
                        putExtra(TodayWidgetProvider.EXTRA_DATE, date)
                        putExtra(TodayWidgetProvider.EXTRA_DONE, r.done)
                    })
                }
            }
        }
    }
}
