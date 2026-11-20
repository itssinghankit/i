import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'framer-motion';
import { X, Pencil, Minus, Plus } from 'lucide-react';
import { buzz } from './api';

export const spring = { type: 'spring', stiffness: 520, damping: 34 };
export const soft = { type: 'spring', stiffness: 260, damping: 26 };

// Animated tick circle. The tick draws itself and a ring bursts outwards.
export function Check({ done, color = '#7c3aed', onToggle, size = 28 }) {
  return (
    <motion.button
      className="check"
      style={{ width: size, height: size, borderColor: done ? color : undefined }}
      animate={{ backgroundColor: done ? color : 'rgba(255,255,255,0)', scale: 1 }}
      whileTap={{ scale: 0.8 }}
      transition={spring}
      onClick={(e) => { e.stopPropagation(); buzz(done ? 8 : 18); onToggle?.(); }}
      aria-label={done ? 'Mark as not done' : 'Mark as done'}
    >
      <svg viewBox="0 0 24 24" fill="none">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          initial={false} animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        />
      </svg>
      <AnimatePresence>
        {done && (
          <motion.span
            key="burst"
            style={{ position: 'absolute', inset: -2, borderRadius: '50%', border: `2px solid ${color}` }}
            initial={{ scale: 1, opacity: 0.8 }} animate={{ scale: 2, opacity: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// Number that counts up/down smoothly.
export function Counter({ value, suffix = '' }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => `${Math.round(v)}${suffix}`);
  useEffect(() => { const c = animate(mv, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1] }); return c.stop; }, [value]);
  return <motion.span>{rounded}</motion.span>;
}

// Progress ring with a rainbow gradient stroke.
export function Ring({ percent, size = 92, stroke = 10, children, id = 'ring' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c3aed" /><stop offset="55%" stopColor="#ec4899" /><stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#efedf6" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} stroke={`url(#${id})`} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * Math.min(percent, 100)) / 100 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div>
    </div>
  );
}

// Segmented control with a sliding white pill (like "My tasks | Team").
export function Segmented({ options, value, onChange, layoutId }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? 'on' : ''} onClick={() => { buzz(6); onChange(o.value); }}>
          {value === o.value && <motion.span layoutId={layoutId} className="seg-pill" transition={spring} />}
          {o.label}{o.count != null && <span className="count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

// Bottom sheet that slides up and can be dragged down to close.
export function Sheet({ open, onClose, children, title }) {
  // Rendered into the app frame (not inside the scrolling screen) so it always sits above the tab bar.
  const host = typeof document !== 'undefined' && document.querySelector('.frame');
  const node = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim sheet-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={soft}
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) onClose(); }}
          >
            <div className="grab" />
            {title && (
              <div className="between" style={{ marginBottom: 14 }}>
                <h2>{title}</h2>
                <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={onClose} aria-label="Close"><X size={18} /></button>
              </div>
            )}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
  return host ? createPortal(node, host) : node;
}

// Staggered list entrance.
export const listParent = { hidden: {}, show: { transition: { staggerChildren: 0.045 } } };
export const listChild = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: soft },
};

export function Empty({ emoji, text }) {
  return (
    <motion.div className="empty" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
      <motion.div className="big" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.4 }}>{emoji}</motion.div>
      {text}
    </motion.div>
  );
}

export function useToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 2200); return () => clearTimeout(t); }, [msg]);
  const node = (
    <AnimatePresence>
      {msg && (
        <motion.div className="toast" initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 10, x: '-50%' }}>
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
  return [node, setMsg];
}

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

export const EMOJIS = ['✨', '💧', '🏋️', '🧘', '📚', '💻', '🧠', '🚶', '📝', '🍎', '😴', '🎸', '🏃', '🙏', '🌱', '🎯'];
export const COLORS = ['#7c3aed', '#ec4899', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#38bdf8', '#6366f1'];
