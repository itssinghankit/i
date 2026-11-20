import { m as motion } from 'framer-motion';
import { mins } from '../../lib';
import { spring, soft } from '../../components';

// Is everything planned for this day possible? Routine + habits + standalone to-dos vs waking hours.
// The bar is one piece per routine habit, in that habit's own colour (in routine order), then any
// extra habit time and the day's standalone to-dos. The empty part at the end is free time.
export default function DayBudget({ b, routine = [] }) {
  if (!b) return null;
  const total = Math.max(b.awakeMinutes, b.plannedMinutes) || 1;
  const pieces = [
    ...routine.filter((r) => Number(r.minutes) > 0).map((r) => ({ key: r._id, title: r.title, m: Number(r.minutes), c: r.color || '#6366f1' })),
    ...(b.habitMinutes > 0 ? [{ key: 'habits', title: 'Habits', m: b.habitMinutes, c: '#a855f7' }] : []),
    ...(b.todoMinutes > 0 ? [{ key: 'todos', title: 'To-dos', m: b.todoMinutes, c: '#22c55e' }] : []),
  ];
  const extra = [b.habitMinutes > 0 && `Habits ${mins(b.habitMinutes)}`, b.todoMinutes > 0 && `To-dos ${mins(b.todoMinutes)}`].filter(Boolean);
  return (
    <motion.div className="card" style={{ padding: 16, marginTop: 12 }}>
      <div className="between">
        <div>
          <div className="bold">Day plan</div>
          <div className="small muted" style={{ marginTop: 2 }}>{mins(b.plannedMinutes)} planned of {mins(b.awakeMinutes)} awake</div>
        </div>
        <motion.span key={String(b.fits)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={spring} className="time-chip"
          style={{ fontSize: 13, padding: '6px 11px', background: b.fits ? 'var(--ok-bg)' : 'var(--bad-bg)', color: b.fits ? 'var(--ok)' : '#e11d48' }}>
          {b.fits ? `✓ ${mins(b.freeMinutes)} free` : `Over by ${mins(-b.freeMinutes)}`}
        </motion.span>
      </div>
      <div className="plan-bar" role="img" aria-label={pieces.map((p) => `${p.title} ${mins(p.m)}`).join(', ')}>
        {pieces.map((p, i) => (
          <motion.div key={p.key} title={`${p.title} · ${mins(p.m)}`} style={{ background: p.c, minWidth: 3 }}
            initial={{ width: 0 }} animate={{ width: `${(p.m / total) * 100}%` }} transition={{ ...soft, delay: Math.min(i, 12) * 0.03 }} />
        ))}
      </div>
      <div className="tiny" style={{ marginTop: 8, color: 'var(--ink-2)' }}>
        Routine {mins(b.routineMinutes)}{extra.length ? ` · ${extra.join(' · ')}` : ''}<span className="faint"> · Sleep {b.sleepHours}h</span>
      </div>
    </motion.div>
  );
}
