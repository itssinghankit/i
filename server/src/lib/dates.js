// Dates are plain "YYYY-MM-DD" strings. Weeks start on Monday.
// "Today" is worked out in APP_TZ (default India, Asia/Kolkata), not the server's clock zone:
// cloud servers (e.g. Vercel) run on UTC, which would flip the day at 5:30 AM IST.
// All other date maths uses UTC so the server's own time zone never matters.
const TZ = process.env.APP_TZ || 'Asia/Kolkata';
const pad = (n) => String(n).padStart(2, '0');

export const toKey = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
// en-CA formats as YYYY-MM-DD.
export const today = (at = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
export const addDays = (k, n) => { const d = fromKey(k); d.setUTCDate(d.getUTCDate() + n); return toKey(d); };
// Day of week with Monday = 0 … Sunday = 6.
export const dow = (k) => (fromKey(k).getUTCDay() + 6) % 7;
export const weekStart = (k) => addDays(k, -dow(k));
export const weekDays = (start) => Array.from({ length: 7 }, (_, i) => addDays(start, i));
export const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
