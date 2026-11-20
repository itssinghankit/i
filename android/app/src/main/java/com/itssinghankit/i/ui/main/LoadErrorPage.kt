package com.itssinghankit.i.ui.main

import com.itssinghankit.i.BuildConfig

/** The "Can't open i right now" page shown instead of a blank screen. */
object LoadErrorPage {
    fun html(url: String, reason: String): String {
        val esc = { s: String -> s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;") }
        val hint = if (BuildConfig.DEBUG)
            "This is a <b>debug</b> build, so it loads your Mac's local server. Start it with <code>npm start</code> in the <code>server</code> folder, keep the USB cable in, then tap Retry."
        else "Check your internet connection and tap Retry."
        return """
            <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
            <style>
              body{margin:0;height:100vh;box-sizing:border-box;padding:var(--safe-t,0) 0 var(--safe-b,0);display:flex;align-items:center;justify-content:center;background:#F7F6FC;
                   font-family:system-ui,sans-serif;color:#16151D;text-align:center}
              .c{padding:28px;max-width:340px}
              .logo{width:72px;height:72px;border-radius:22px;margin:0 auto 18px;background:linear-gradient(135deg,#7C3AED,#EC4899 55%,#F97316)}
              h1{font-size:20px;margin:0 0 8px} p{font-size:14px;color:#5D5B6B;line-height:1.45;margin:6px 0}
              code{background:#EEEDF4;padding:1px 5px;border-radius:5px;font-size:12px}
              .u{font-size:12px;color:#9A98A8;word-break:break-all}
              button{margin-top:18px;height:48px;width:100%;border:0;border-radius:14px;color:#fff;font-size:16px;font-weight:700;
                     background:linear-gradient(135deg,#7C3AED,#EC4899 55%,#F97316)}
            </style></head><body><div class="c">
              <div class="logo"></div>
              <h1>Can't open i right now</h1>
              <p>${esc(reason)}</p>
              <p>$hint</p>
              <p class="u">${esc(url)}</p>
              <button onclick="Android.retry()">Retry</button>
            </div></body></html>
        """.trimIndent()
    }
}
