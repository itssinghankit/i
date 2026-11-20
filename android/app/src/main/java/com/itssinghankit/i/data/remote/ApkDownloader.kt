package com.itssinghankit.i.data.remote

import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Downloads a new APK into the app's own cache folder (cache/updates), reporting progress 0–100.
 * GitHub release links redirect to GitHub's file server; HttpURLConnection follows https → https redirects.
 * Blocking: call from Dispatchers.IO.
 */
class ApkDownloader(private val cacheDir: File) {
    fun download(url: String, version: String, expectedBytes: Long, onProgress: (Int) -> Unit): File {
        val dir = File(cacheDir, "updates").apply { mkdirs() }
        dir.listFiles()?.forEach { it.delete() }              // keep only the newest download
        val part = File(dir, "i-$version.apk.part")
        val conn = URL(url).openConnection() as HttpURLConnection
        try {
            conn.connectTimeout = 10_000; conn.readTimeout = 20_000
            conn.instanceFollowRedirects = true
            if (conn.responseCode !in 200..299) throw IllegalStateException("Download failed (HTTP ${conn.responseCode})")
            val total = conn.contentLengthLong.takeIf { it > 0 } ?: expectedBytes
            var done = 0L; var lastPct = -1
            conn.inputStream.use { input ->
                part.outputStream().use { out ->
                    val buf = ByteArray(64 * 1024)
                    while (true) {
                        val n = input.read(buf); if (n < 0) break
                        out.write(buf, 0, n); done += n
                        if (total > 0) {
                            val pct = ((done * 100) / total).toInt().coerceIn(0, 100)
                            if (pct != lastPct) { lastPct = pct; onProgress(pct) }
                        }
                    }
                }
            }
            if (total > 0 && done != total) throw IllegalStateException("Download was cut off. Try again.")
            val apk = File(dir, "i-$version.apk")
            if (!part.renameTo(apk)) throw IllegalStateException("Couldn't save the update.")
            return apk
        } finally { conn.disconnect() }
    }
}
