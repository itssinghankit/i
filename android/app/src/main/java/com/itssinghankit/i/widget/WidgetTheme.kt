package com.itssinghankit.i.widget

import android.content.Context
import android.graphics.Color
import android.os.Build
import android.widget.RemoteViews
import com.itssinghankit.i.R

/**
 * Widget colours for the app's light / dark choice.
 *  - "system" (Auto): uses the @color/widget_* resources, which have night versions, so the
 *    home screen switches the widget by itself the moment the phone changes to dark or back.
 *  - "light" / "dark": fixed colours, set on each view.
 */
class WidgetTheme(context: Context) {
    private val mode = WidgetPrefs.theme(context)
    private val dark = mode == "dark"
    val auto = mode == "system"

    val bg = when (mode) { "dark" -> R.drawable.widget_bg_dark; "light" -> R.drawable.widget_bg_light; else -> R.drawable.widget_bg }
    val chipBg = when (mode) { "dark" -> R.drawable.time_bg_dark; "light" -> R.drawable.time_bg_light; else -> R.drawable.time_bg }
    val ring = when (mode) { "dark" -> R.drawable.check_off_dark; "light" -> R.drawable.check_off_light; else -> R.drawable.check_off }

    private val ink = if (dark) Color.parseColor("#F2F1F8") else Color.parseColor("#16151D")
    private val ink3 = if (dark) Color.parseColor("#7E7C90") else Color.parseColor("#9A98A8")
    private val chipInk = if (dark) Color.parseColor("#C4B5FD") else Color.parseColor("#7C3AED")

    /** Text colour: in Auto, a colour resource (follows the phone); otherwise a fixed colour. */
    private fun text(v: RemoteViews, id: Int, fixed: Int, res: Int) {
        if (!auto) v.setTextColor(id, fixed)
        else if (Build.VERSION.SDK_INT >= 31) v.setColorStateList(id, "setTextColor", res)
        // Android 11 and older in Auto: the layout's own @color already follows the phone.
    }

    fun ink(v: RemoteViews, id: Int) = text(v, id, ink, R.color.widget_ink)
    fun ink3(v: RemoteViews, id: Int) = text(v, id, ink3, R.color.widget_ink3)
    fun chipInk(v: RemoteViews, id: Int) = text(v, id, chipInk, R.color.widget_chip_ink)

    fun background(v: RemoteViews, id: Int, res: Int) = v.setInt(id, "setBackgroundResource", res)
}
