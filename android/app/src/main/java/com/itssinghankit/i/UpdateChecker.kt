package com.itssinghankit.i

import android.app.Activity
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Asks GitHub for the latest release of BuildConfig.GITHUB_REPO.
 * If its tag (v1.2.3) is newer than this app, calls onNewer with the APK download link.
 */
object UpdateChecker {
    fun check(activity: Activity, onNewer: (String, String) -> Unit) {
        Thread {
            try {
                val conn = URL("https://api.github.com/repos/${BuildConfig.GITHUB_REPO}/releases/latest")
                    .openConnection() as HttpURLConnection
                conn.connectTimeout = 5000; conn.readTimeout = 5000
                conn.setRequestProperty("Accept", "application/vnd.github+json")
                if (conn.responseCode != 200) return@Thread
                val json = JSONObject(conn.inputStream.bufferedReader().readText())
                val tag = json.getString("tag_name").removePrefix("v")
                if (!isNewer(tag, BuildConfig.VERSION_NAME)) return@Thread
                val assets = json.getJSONArray("assets")
                var url = json.getString("html_url")
                for (i in 0 until assets.length()) {
                    val a = assets.getJSONObject(i)
                    if (a.getString("name").endsWith(".apk")) { url = a.getString("browser_download_url"); break }
                }
                activity.runOnUiThread { if (!activity.isFinishing) onNewer(tag, url) }
            } catch (_: Exception) { /* offline or no releases yet: ignore */ }
        }.start()
    }

    private fun isNewer(remote: String, local: String): Boolean {
        val r = remote.split(".").map { it.toIntOrNull() ?: 0 }
        val l = local.split(".").map { it.toIntOrNull() ?: 0 }
        for (i in 0 until maxOf(r.size, l.size)) {
            val a = r.getOrElse(i) { 0 }; val b = l.getOrElse(i) { 0 }
            if (a != b) return a > b
        }
        return false
    }
}
