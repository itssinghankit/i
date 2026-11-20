package com.itssinghankit.i.data.remote

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** The latest GitHub release: tag, APK link (or the release page), release notes text, APK size. */
data class Release(val tag: String, val url: String, val body: String, val sizeBytes: Long)

/** Reads the latest release of a GitHub repo ("owner/name"), or null. */
class ReleasesApi(private val repo: String) {
    fun latest(): Release? {
        val conn = URL("https://api.github.com/repos/$repo/releases/latest").openConnection() as HttpURLConnection
        try {
            conn.connectTimeout = 5000; conn.readTimeout = 5000
            conn.setRequestProperty("Accept", "application/vnd.github+json")
            if (conn.responseCode != 200) return null
            val json = JSONObject(conn.inputStream.bufferedReader().readText())
            val assets = json.getJSONArray("assets")
            val apk = (0 until assets.length()).map { assets.getJSONObject(it) }.firstOrNull { it.getString("name").endsWith(".apk") }
            return Release(
                tag = json.getString("tag_name"),
                url = apk?.getString("browser_download_url") ?: json.getString("html_url"),
                body = json.optString("body"),
                sizeBytes = apk?.optLong("size") ?: 0,
            )
        } finally { conn.disconnect() }
    }
}
