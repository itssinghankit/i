import { memo, useEffect, useState, useCallback, useRef } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, ChartColumnBig, Plus, Trash2, Sprout, Check as CheckIcon } from 'lucide-react';
import { api, todayKey, addDays, fmt, mins, fromKey, toKey, buzz } from '../../lib';
import { Check, Ring, Counter, Segmented, Sheet, Empty, spring, soft } from '../../components';


// Is everything planned for this day possible? Routine + habits + standalone to-dos vs waking hours.
export default function DayBudget({ b }) {
  if (!b) return null;
  const parts = [
    { label: 'Routine', m: b.routineMinutes, c: 'linear-gradient(90deg,#6366f1,#38bdf8)' },
    { label: 'Habits', m: b.habitMinutes, c: 'linear-gradient(90deg,#a855f7,#ec4899)' },
    { label: 'To-dos', m: b.todoMinutes, c: 'linear-gradient(90deg,#22c55e,#84cc16)' },
  ];
  const total = Math.max(b.awakeMinutes, b.plannedMinutes);
  return (
    <motion.div className="card" style={{ padding: 16, marginTop: 12 }}>
      <div className="between">
        <div>
          <div className="bold">Day plan</div>
          <div className="small muted" style={{ marginTop: 2 }}>{mins(b.plannedMinutes)} planned of {mins(b.awakeMinutes)} awake</div>
        </div>
        <motion.span key={String(b.fits)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={spring} className="time-chip"
          style={{ fontSize: 13, padding: '6px 11px', background: b.fits ? '#dcfce7' : '#ffe4e6', color: b.fits ? '#15803d' : '#e11d48' }}>
          {b.fits ? `✓ ${mins(b.freeMinutes)} free` : `Over by ${mins(-b.freeMinutes)}`}
        </motion.span>
      </div>
      <div style={{ display: 'flex', height: 14, borderRadius: 9, overflow: 'hidden', marginTop: 12, background: 'var(--soft)', gap: 2 }}>
        {parts.map((p, i) => p.m > 0 && (
          <motion.div key={p.label} style={{ background: p.c }} initial={{ width: 0 }} animate={{ width: `${(p.m / total) * 100}%` }} transition={{ ...soft, delay: i * 0.08 }} />
        ))}
      </div>
      <div className="row tiny" style={{ gap: 12, marginTop: 8, flexWrap: 'wrap', color: 'var(--ink-2)' }}>
        {parts.map((p) => (
          <span key={p.label} className="row" style={{ gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: p.c }} />{p.label} {mins(p.m)}
          </span>
        ))}
        <span className="faint">Sleep {b.sleepHours}h</span>
      </div>
    </motion.div>
  );
}
