import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Minus, Plus, Keyboard } from 'lucide-react';
import { buzz } from '../lib';
import { spring, soft } from './motion.js';

// Time chooser: a few quick picks, plus "Custom" to type any hours + minutes.
// value and onChange are in minutes.
export function TimePicker({ value, onChange, presets = [5, 10, 15, 30, 45, 60], max = 16 * 60 }) {
  const isPreset = presets.includes(value);
  const [custom, setCustom] = useState(!isPreset);
  useEffect(() => { if (!presets.includes(value)) setCustom(true); }, [value]);
  const h = Math.floor((value || 0) / 60);
  const m = (value || 0) % 60;
  const set = (hh, mm) => onChange(Math.min(max, Math.max(1, hh * 60 + mm)));
  const on = { background: '#ede9fe', color: 'var(--violet)' };
  const fmtM = (x) => (x >= 60 ? `${Math.floor(x / 60)}h${x % 60 ? ` ${x % 60}m` : ''}` : `${x}m`);

  return (
    <div>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        {presets.map((p) => (
          <button type="button" key={p} className="ghost-btn" style={!custom && value === p ? on : undefined}
            onClick={() => { setCustom(false); onChange(p); }}>{fmtM(p)}</button>
        ))}
        <button type="button" className="ghost-btn row" style={{ gap: 5, ...(custom ? on : {}) }}
          onClick={() => { buzz(6); setCustom(true); }}>
          <Pencil size={13} /> {custom ? `Custom · ${fmtM(value || 0)}` : 'Custom'}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {custom && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div className="row" style={{ gap: 10, marginTop: 10 }}>
              <TimeBox label="hours" value={h} max={Math.floor(max / 60)} onChange={(v) => set(v, m)} />
              <TimeBox label="minutes" value={m} max={59} step={5} onChange={(v) => set(h, v)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TimeBox({ label, value, onChange, max, step = 1 }) {
  const clamp = (v) => Math.min(max, Math.max(0, v));
  return (
    <div style={{ flex: 1, background: 'var(--soft)', borderRadius: 16, padding: '8px 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
      <motion.button type="button" whileTap={{ scale: 0.85 }} className="icon-btn" style={{ width: 34, height: 34, flex: 'none' }}
        onClick={() => onChange(clamp(value - step))} aria-label={`Less ${label}`}><Minus size={15} /></motion.button>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <input
          inputMode="numeric" value={value} aria-label={label}
          onChange={(e) => onChange(clamp(Number(e.target.value.replace(/\D/g, '')) || 0))}
          onFocus={(e) => e.target.select()}
          style={{ width: '100%', border: 0, background: 'transparent', textAlign: 'center', fontSize: 24, fontWeight: 800, outline: 'none', padding: 0 }}
        />
        <div className="tiny faint bold" style={{ marginTop: -2 }}>{label}</div>
      </div>
      <motion.button type="button" whileTap={{ scale: 0.85 }} className="icon-btn" style={{ width: 34, height: 34, flex: 'none' }}
        onClick={() => onChange(clamp(value + step))} aria-label={`More ${label}`}><Plus size={15} /></motion.button>
    </div>
  );
}
