package com.itssinghankit.i.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.widget.RemoteViews
import com.itssinghankit.i.R
import com.itssinghankit.i.data.model.TodaySnapshot
import java.util.concurrent.ConcurrentHashMap

/**
 * What the widget remembers between updates (in memory; the app process keeps it while the widget is alive).
 *  - last:  the last data from the server, so a tapped row can flip instantly without waiting for the network
 *  - flips: rows tapped on the widget that the server hasn't confirmed yet (id → new done)
 *  - shown: the % each widget's bar shows now, so the bar can slide from there to the new value
 */
object WidgetState {
    @Volatile var last: TodaySnapshot? = null
    val flips = ConcurrentHashMap<String, Boolean>()
    @Volatile private var instantUntil = 0L
    private val shown = ConcurrentHashMap<Int, Int>()
    private val animating = ConcurrentHashMap<Int, Thread>()

    /** A row was tapped: show it flipped right away (the next list reload uses [last] instead of the network). */
    fun flip(id: String, done: Boolean) {
        flips[id] = done
        instantUntil = System.currentTimeMillis() + 1500
    }

    /** The server answered: drop the pending flip so the next reload shows the server's truth. */
    fun settle(id: String) { flips.remove(id); instantUntil = 0 }

    /** True right after a tap: reload from memory (instant) instead of the network. */
    fun useMemory() = last != null && System.currentTimeMillis() < instantUntil

    /**
     * Slides a widget's progress bar and % from what it shows now to [to] in small steps (~0.4 s, easing out).
     * Widgets can't run animations of their own, so this sends a few quick updates instead.
     */
    fun animateBar(context: Context, widgetId: Int, to: Int, emojiAt100: Boolean) {
        val from = shown[widgetId] ?: to
        // Already sliding to this value (e.g. the server just confirmed a tap): let that slide finish.
        if (from == to && animating[widgetId]?.isAlive == true) return
        shown[widgetId] = to
        animating.remove(widgetId)?.interrupt()
        val m = AppWidgetManager.getInstance(context)
        fun paint(p: Int) {
            val v = RemoteViews(context.packageName, R.layout.widget_today)
            v.setProgressBar(R.id.widget_progress, 100, p.coerceIn(0, 100), false)
            v.setTextViewText(R.id.widget_percent, (if (emojiAt100 && p >= 100) "🎉" else "") + "$p%")
            m.partiallyUpdateAppWidget(widgetId, v)
        }
        if (from == to) { paint(to); return }
        val t = Thread {
            try {
                val steps = 10
                for (i in 1..steps) {
                    val k = i / steps.toFloat()
                    val ease = 1 - (1 - k) * (1 - k) * (1 - k) // fast first, gentle at the end
                    paint(Math.round(from + (to - from) * ease))
                    Thread.sleep(40)
                }
            } catch (_: InterruptedException) {
                // a newer value arrived; that animation takes over
            } finally {
                animating.remove(widgetId)
            }
        }
        animating[widgetId] = t
        t.start()
    }

    fun forget(widgetId: Int) { shown.remove(widgetId); animating.remove(widgetId)?.interrupt() }
}
