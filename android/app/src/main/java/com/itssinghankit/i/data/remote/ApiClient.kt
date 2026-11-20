package com.itssinghankit.i.data.remote

import java.net.HttpURLConnection
import java.net.URL

/** Thrown when nobody is signed in on this phone, or the login expired (HTTP 401). */
class SignedOutException : Exception("sign in required")

/**
 * Tiny HTTP client for the app's server (/api/v1). Adds the login token when there is one.
 * Blocking: call from a background thread or Dispatchers.IO.
 */
class ApiClient(private val baseUrl: String, private val token: () -> String?) {
    fun get(path: String): String = request("GET", path, null)
    fun post(path: String, json: String): String = request("POST", path, json)
    fun patch(path: String, json: String): String = request("PATCH", path, json)

    private fun request(method: String, path: String, body: String?): String {
        val conn = URL("$baseUrl/api/v1$path").openConnection() as HttpURLConnection
        try {
            conn.requestMethod = method
            conn.connectTimeout = 6000; conn.readTimeout = 6000
            token()?.let { conn.setRequestProperty("Authorization", "Bearer $it") }
            if (body != null) {
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")
                conn.outputStream.use { it.write(body.toByteArray()) }
            }
            if (conn.responseCode == 401) throw SignedOutException()
            return conn.inputStream.bufferedReader().use { it.readText() }
        } finally { conn.disconnect() }
    }
}
