import { Clock, X } from 'lucide-react';
import { clockTime } from '../lib';

// Optional time of day ("HH:MM", or null). Uses the phone's own clock picker.
export function TimeOfDay({ value, onChange, minutes = 0 }) {
  return (
    <div className="row" style={{ gap: 8 }}>
      <label className="input row" style={{ gap: 8, flex: 1, cursor: 'pointer', position: 'relative' }}>
        <Clock size={18} className="ic-3" />
        <span style={{ flex: 1, color: value ? 'var(--ink)' : 'var(--ink-3)' }}>{value ? clockTime(value, minutes) : 'No set time'}</span>
        <input type="time" value={value || ''} onChange={(e) => onChange(e.target.value || null)}
          style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', cursor: 'pointer' }} aria-label="Time of day" />
      </label>
      {value && (
        <button type="button" className="icon-btn" style={{ width: 50, height: 50, borderRadius: 14 }} onClick={() => onChange(null)} aria-label="Clear time">
          <X size={18} />
        </button>
      )}
    </div>
  );
}
