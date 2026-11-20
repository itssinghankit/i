// Short vibration on taps (phones that support it).
export const buzz = (ms = 12) => { try { navigator.vibrate?.(ms); } catch { /* not supported */ } };
