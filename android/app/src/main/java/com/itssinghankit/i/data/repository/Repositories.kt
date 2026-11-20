package com.itssinghankit.i.data.repository

import com.itssinghankit.i.data.local.SessionStore
import com.itssinghankit.i.data.model.TodayItem
import com.itssinghankit.i.data.model.TodaySnapshot
import com.itssinghankit.i.data.model.UpdateInfo
import com.itssinghankit.i.data.remote.ApiClient
import com.itssinghankit.i.data.remote.ReleasesApi
import org.json.JSONObject

/** Login token for the widget (the web app hands it over after sign-in). */
class SessionRepository(private val store: SessionStore) {
    fun token(): String? = store.get()
    fun save(token: String) = store.set(token)
    fun clear() = store.clear()
}

/** Today's routine and to-dos for the widget, and ticking items from the widget. Blocking calls. */
class TodayRepository(private val api: ApiClient) {
    fun today(): TodaySnapshot {
        val j = JSONObject(api.get("/widget"))
        val r = j.getJSONArray("routine"); val t = j.getJSONArray("todos")
        return TodaySnapshot(
            date = j.getString("date"),
            percent = j.getInt("percent"),
            routine = (0 until r.length()).map { r.getJSONObject(it) }.map {
                TodayItem("routine", it.getString("id"), it.getString("title"), it.optString("emoji"), it.optInt("minutes"), it.optString("color").ifBlank { null }, it.getBoolean("done"))
            },
            todos = (0 until t.length()).map { t.getJSONObject(it) }.map {
                TodayItem("todo", it.getString("id"), it.getString("title"), "", it.optInt("minutes"), null, it.getBoolean("done"))
            },
        )
    }

    fun toggle(kind: String, id: String, date: String, done: Boolean) {
        if (kind == "routine") api.post("/day/$date/toggle", JSONObject(mapOf("kind" to "routine", "id" to id)).toString())
        else api.patch("/todos/$id", JSONObject(mapOf("done" to !done)).toString())
    }
}

/** "Is there a newer APK on GitHub?" */
class UpdateRepository(private val releases: ReleasesApi, private val currentVersion: String) {
    fun newerVersion(): UpdateInfo? {
        val r = releases.latest() ?: return null
        val remote = r.tag.removePrefix("v")
        return if (isNewer(remote, currentVersion)) UpdateInfo(remote, currentVersion, r.url, notesFrom(r.body), r.sizeBytes) else null
    }

    companion object {
        /** Release text → short plain lines: drops headings, links-only lines and "Full Changelog", strips "- " and "**". */
        fun notesFrom(body: String): List<String> = body.lines()
            .map { it.trim().removePrefix("- ").removePrefix("* ").replace("**", "").trim() }
            .filter { it.isNotEmpty() && !it.startsWith("#") && !it.contains("Full Changelog", true) && !it.startsWith("http") }
            .take(6)

        fun isNewer(remote: String, local: String): Boolean {
            val r = remote.split(".").map { it.toIntOrNull() ?: 0 }
            val l = local.split(".").map { it.toIntOrNull() ?: 0 }
            for (i in 0 until maxOf(r.size, l.size)) {
                val a = r.getOrElse(i) { 0 }; val b = l.getOrElse(i) { 0 }
                if (a != b) return a > b
            }
            return false
        }
    }
}
