// Small fetch helper. By default the UI talks to the server it was loaded from (/api/v1).
// Set VITE_API_URL at build time (e.g. https://my-i-server.onrender.com) to point it somewhere else.
const BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/v1`;
const KEY = import.meta.env.VITE_API_KEY || '';

async function call(method, url, body) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (KEY) headers['x-api-key'] = KEY;
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
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

const pad = (n) => String(n).padStart(2, '0');
export const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayKey = () => toKey(new Date());
export const addDays = (k, n) => { const d = fromKey(k); d.setDate(d.getDate() + n); return toKey(d); };
export const fmt = (k, opts) => fromKey(k).toLocaleDateString('en-GB', opts);
export const mins = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`);
export const buzz = (ms = 12) => { try { navigator.vibrate?.(ms); } catch { /* not supported */ } };
