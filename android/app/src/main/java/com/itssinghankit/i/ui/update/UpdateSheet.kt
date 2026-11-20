package com.itssinghankit.i.ui.update

import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import com.itssinghankit.i.R
import com.itssinghankit.i.data.model.UpdateInfo
import java.util.Locale

/**
 * "A fresh version of i is here" sheet: icon, 1.0.2 → 1.0.3, what's new, size, Update now / Maybe later.
 * Drawn inside the Activity's own full-screen layout (not a Dialog), so it reaches the very bottom edge
 * behind the gesture bar like the web app's sheets. Back, a tap on the dim area, or "Maybe later" closes it.
 */
object UpdateSheet {
    fun show(activity: ComponentActivity, host: FrameLayout, info: UpdateInfo) {
        val inflater = LayoutInflater.from(activity)

        val scrim = View(activity).apply { setBackgroundColor(Color.parseColor("#73000000")); alpha = 0f; isClickable = true }
        val sheet = inflater.inflate(R.layout.dialog_update, host, false).apply { isClickable = true }
        host.addView(scrim, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        host.addView(sheet, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM))

        // Keep the buttons above the gesture bar.
        val basePad = sheet.paddingBottom
        ViewCompat.setOnApplyWindowInsetsListener(sheet) { v, insets ->
            v.updatePadding(bottom = basePad + insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom)
            insets
        }
        ViewCompat.requestApplyInsets(sheet)

        sheet.findViewById<TextView>(R.id.update_from).text = "v${info.currentVersion}"
        sheet.findViewById<TextView>(R.id.update_to).text = "v${info.version}"
        val list = sheet.findViewById<LinearLayout>(R.id.update_notes)
        info.notes.ifEmpty { listOf("Smoother screens and small fixes.", "Your data stays exactly as it is.") }.forEach { line ->
            val row = inflater.inflate(R.layout.item_update_note, list, false)
            row.findViewById<TextView>(R.id.note_text).text = line
            list.addView(row)
        }
        val size = if (info.sizeBytes > 0) String.format(Locale.US, "%.1f MB · ", info.sizeBytes / 1_048_576.0) else ""
        sheet.findViewById<TextView>(R.id.update_meta).text = "${size}Installs over the old app, nothing is lost"

        lateinit var back: OnBackPressedCallback
        fun close() {
            back.remove()
            scrim.animate().alpha(0f).setDuration(200).start()
            sheet.animate().translationY(sheet.height.toFloat()).setDuration(220).withEndAction {
                host.removeView(sheet); host.removeView(scrim)
            }.start()
        }
        back = object : OnBackPressedCallback(true) { override fun handleOnBackPressed() = close() }
        activity.onBackPressedDispatcher.addCallback(activity, back)

        scrim.setOnClickListener { close() }
        sheet.findViewById<View>(R.id.update_later).setOnClickListener { close() }
        sheet.findViewById<View>(R.id.update_now).setOnClickListener {
            activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(info.downloadUrl)))
            close()
        }

        // Slide up + fade in, then a small "pop" of the icon.
        sheet.post {
            sheet.translationY = sheet.height.toFloat()
            sheet.animate().translationY(0f).setDuration(340).setInterpolator(DecelerateInterpolator(2f)).start()
            scrim.animate().alpha(1f).setDuration(260).start()
        }
        sheet.findViewById<View>(R.id.update_icon).apply {
            scaleX = 0.6f; scaleY = 0.6f; rotation = -12f
            animate().scaleX(1f).scaleY(1f).rotation(0f).setStartDelay(220).setDuration(450)
                .setInterpolator(OvershootInterpolator(2.2f)).start()
        }
    }
}
