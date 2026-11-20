// Light / dark mode. Choice: 'system' (follow the phone), 'light' or 'dark'. Saved on this device.
// The page gets <html data-theme="light|dark">; styles.css swaps its colour variables on that.
// In the Android app, the choice is also handed to the app (window.Android.setTheme), so the
// status-bar icons and the home-screen widget follow it.
const KEY = 'i-theme';
const listeners = new Set();
const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function getThemePref() {
  try { return localStorage.getItem(KEY) || 'system'; } catch { return 'system'; }
}

// The Android app tells us the phone's own dark mode (the WebView's media query can lag behind it).
function systemDark() {
  if (typeof window.__iSystemDark === 'boolean') return window.__iSystemDark;
  return !!mq?.matches;
}

export function isDark(pref = getThemePref()) {
  return pref === 'dark' || (pref === 'system' && systemDark());
}

export function applyTheme(pref = getThemePref()) {
  const dark = isDark(pref);
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  root.style.colorScheme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f0e15' : '#f7f6fc');
  try { window.Android?.setTheme?.(pref); } catch { /* older app */ }
  try { window.Android?.setLightBars?.(!dark); } catch { /* older app */ }
  listeners.forEach((fn) => fn(dark));
}

export function setThemePref(pref) {
  try { localStorage.setItem(KEY, pref); } catch { /* private mode */ }
  applyTheme(pref);
}

export function onThemeChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// Follow the phone when the choice is "system".
mq?.addEventListener?.('change', () => { if (getThemePref() === 'system') applyTheme(); });
if (typeof window !== 'undefined') {
  window.iSetSystemDark = (dark) => { window.__iSystemDark = !!dark; if (getThemePref() === 'system') applyTheme(); };
}
