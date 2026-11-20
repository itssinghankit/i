// 75 → "1h 15m", 30 → "30m"
export const mins = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`);
export const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Time of day. "06:30" → "6:30 AM"; with a length: "06:30" + 60 → "6:30 – 7:30 AM" (one AM/PM when both match).
const clock = (total) => {
  const m = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60), mm = m % 60;
  return { text: `${h % 12 || 12}:${String(mm).padStart(2, '0')}`, ap: h < 12 ? 'AM' : 'PM' };
};
export const clockTime = (hhmm, minutes = 0) => {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const a = clock(h * 60 + m);
  if (!minutes) return `${a.text} ${a.ap}`;
  const b = clock(h * 60 + m + Number(minutes));
  return a.ap === b.ap ? `${a.text} – ${b.text} ${b.ap}` : `${a.text} ${a.ap} – ${b.text} ${b.ap}`;
};
