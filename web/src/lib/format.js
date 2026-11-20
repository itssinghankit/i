// 75 → "1h 15m", 30 → "30m"
export const mins = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`);
export const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
