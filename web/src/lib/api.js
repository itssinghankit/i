// Small fetch helper. By default the UI talks to the server it was loaded from (/api/v1).
// Set VITE_API_URL at build time (e.g. https://my-i-server.onrender.com) to point it somewhere else.
const BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/v1`;
const KEY = import.meta.env.VITE_API_KEY || '';

// ---- Sign-in token ----
// Kept in this browser (localStorage) and, in the Android app, also handed to the native side
// so the home-screen widget can use it.
const TOKEN_KEY = 'i_token';
export const auth = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* private mode */ } window.Android?.setSession?.(t); },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } window.Android?.clearSession?.(); },
};

async function call(method, url, body) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (KEY) headers['x-api-key'] = KEY;
  const token = auth.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  // Token missing or expired: forget it and show the sign-in screen.
  if (res.status === 401 && !url.startsWith('/auth/google')) {
    auth.clear();
    window.dispatchEvent(new Event('i-signed-out'));
  }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  const data = await res.json();
  // Tell the Android home-screen widget to refresh after every change.
  if (method !== 'GET') window.Android?.refreshWidget?.();
  return data;
}
export const api = {
  get: (u) => call('GET', u),
  post: (u, b = {}) => call('POST', u, b),
  patch: (u, b) => call('PATCH', u, b),
  del: (u) => call('DELETE', u),
};
