package com.itssinghankit.i.widget

import com.itssinghankit.i.BuildConfig
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** Network calls used by the widget. Always call from a background thread. */
object WidgetApi {
    data class Row(val kind: String, val id: String, val title: String, val minutes: Int, val done: Boolean)
    data class Today(val date: String, val percent: Int, val routine: List<Row>, val todos: List<Row>)

    private fun request(path: String, method: String = "GET", body: String? = null): String {
        val conn = URL("${BuildConfig.APP_URL}/api/v1$path").openConnection() as HttpURLConnection
        conn.requestMethod = method
        conn.connectTimeout = 6000; conn.readTimeout = 6000
        if (body != null) {
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json")
            conn.outputStream.use { it.write(body.toByteArray()) }
        }
        return conn.inputStream.bufferedReader().use { it.readText() }
    }

    fun today(): Today {
        val j = JSONObject(request("/widget"))
        val r = j.getJSONArray("routine"); val t = j.getJSONArray("todos")
        return Today(
            date = j.getString("date"),
            percent = j.getInt("percent"),
            routine = (0 until r.length()).map { r.getJSONObject(it) }.map {
                Row("routine", it.getString("id"), "${it.optString("emoji")}  ${it.getString("title")}", it.getInt("minutes"), it.getBoolean("done"))
            },
            todos = (0 until t.length()).map { t.getJSONObject(it) }.map {
                Row("todo", it.getString("id"), it.getString("title"), 0, it.getBoolean("done"))
            },
        )
    }

    fun toggle(kind: String, id: String, date: String, done: Boolean) {
        if (kind == "routine") request("/day/$date/toggle", "POST", JSONObject(mapOf("kind" to "routine", "id" to id)).toString())
        else request("/todos/$id", "PATCH", JSONObject(mapOf("done" to !done)).toString())
    }
}
