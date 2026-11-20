import { memo, useEffect, useState, useCallback, useRef } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, ChartColumnBig, Plus, Trash2, Sprout, Check as CheckIcon } from 'lucide-react';
import { api, todayKey, addDays, fmt, mins, fromKey, toKey, buzz } from '../../lib';
import { Check, Ring, Counter, Segmented, Sheet, Empty, spring, soft } from '../../components';


// ---------- Weekly chart: % of routine done per day, with week arrows ----------
export default function WeekChartSheet({ open, onClose, anchor, onPickDay }) {
  const [ref, setRef] = useState(anchor);
  const [week, setWeek] = useState(null);
  const [dir, setDir] = useState(0);
  useEffect(() => { if (open) setRef(anchor); }, [open]);
  useEffect(() => { if (open) api.get(`/week?date=${ref}`).then(setWeek); }, [open, ref]);
  const shift = (n) => { setDir(n); setRef(addDays(ref, n * 7)); };
  const vals = week?.days.filter((d) => d.percent != null).map((d) => d.percent) || [];
  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  const best = week?.days.reduce((b, d) => (d.percent != null && (b == null || d.percent > b.percent) ? d : b), null);
  const color = (p) => (p >= 80 ? 'linear-gradient(180deg,#a855f7,#7c3aed)' : p >= 50 ? 'linear-gradient(180deg,#f472b6,#ec4899)' : 'linear-gradient(180deg,#fdba74,#f97316)');
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="between" style={{ marginBottom: 6 }}>
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous week"><ChevronLeft size={20} /></button>
        <div style={{ textAlign: 'center' }}>
          <div className="bold">{week && `${fmt(week.start, { day: 'numeric', month: 'short' })} – ${fmt(addDays(week.start, 6), { day: 'numeric', month: 'short' })}`}</div>
          <div className="tiny faint">Daily routine completion</div>
        </div>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Next week"><ChevronRight size={20} /></button>
      </div>
      <div className="row" style={{ gap: 10, margin: '14px 0 6px' }}>
        <div className="card" style={{ flex: 1, padding: 12, boxShadow: 'none' }}>
          <div className="tiny faint bold">AVERAGE</div><div style={{ fontSize: 24, fontWeight: 800 }}><Counter value={avg} suffix="%" /></div>
        </div>
        <div className="card" style={{ flex: 1, padding: 12, boxShadow: 'none' }}>
          <div className="tiny faint bold">BEST DAY</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{best ? `${fmt(best.date, { weekday: 'short' })} · ${best.percent}%` : '—'}</div>
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={week?.start} initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -40 }} transition={{ duration: 0.2 }}
          style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 240, padding: '28px 2px 0', position: 'relative' }}>
          {[25, 50, 75, 100].map((g) => (
            <div key={g} style={{ position: 'absolute', left: 0, right: 0, bottom: `calc(${g}% * 0.78 + 52px)`, borderTop: '1px dashed var(--line)' }} />
          ))}
          {week?.days.map((d, i) => (
            <button key={d.date} onClick={() => onPickDay(d.date)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 6, position: 'relative' }}>
              <div className="tiny bold" style={{ color: d.percent == null ? 'var(--ink-3)' : 'var(--ink)' }}>{d.percent == null ? '' : `${d.percent}%`}</div>
              <div style={{ width: '100%', height: '78%', background: 'var(--soft)', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                <Bar percent={d.percent} delay={i * 45} color={d.percent == null ? 'transparent' : color(d.percent)} />
              </div>
              <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
                <div className="tiny bold" style={{ color: d.date === todayKey() ? 'var(--violet)' : 'var(--ink-2)' }}>{fmt(d.date, { weekday: 'short' })}</div>
                <div className="tiny faint">{fmt(d.date, { day: 'numeric', month: 'short' })}</div>
              </div>
            </button>
          ))}
        </motion.div>
      </AnimatePresence>
      <div className="tiny faint" style={{ textAlign: 'center', marginTop: 12 }}>Tap a bar to open that day</div>
    </Sheet>
  );
}

// One bar: full height, shrunk with a GPU transform (scaleY) instead of animating height,
// so growing bars don't make the phone redo layout every frame.
function Bar({ percent, delay, color }) {
  const [shown, setShown] = useState(0);
  useEffect(() => { const t = setTimeout(() => setShown((percent ?? 0) / 100), 30); return () => clearTimeout(t); }, [percent]);
  return (
    <div style={{ position: 'absolute', inset: 0, borderRadius: 12, background: color, transformOrigin: 'bottom',
      transform: `scaleY(${shown})`, transition: `transform .55s cubic-bezier(.2,.9,.25,1) ${delay}ms`, willChange: 'transform' }} />
  );
}
