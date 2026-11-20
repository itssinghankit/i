import { m as motion } from 'framer-motion';
import { Check, Sheet, Empty } from '../../components';
import { mins, clockTime, fmt, todayKey } from '../../lib';

// Opens from the Becoming card on Today: every routine habit of this Becoming for the day,
// with its time and whether it's done. "Tick all" ticks every one of them.
export default function BecomingSheet({ open, onClose, becoming, date, onToggleHabit, onToggleAll }) {
  const b = becoming;
  const habits = b?.habits || [];
  const left = habits.filter((h) => !h.done).length;
  const total = habits.reduce((s, h) => s + (Number(h.minutes) || 0), 0);
  const y = Number(todayKey().slice(0, 4));
  return (
    <Sheet open={open} onClose={onClose} title={b ? `${b.emoji || '🌟'} ${b.title}` : 'Becoming'}>
      {b && (
        <>
          <div className="small muted" style={{ marginTop: -6 }}>
            By {b.byYear}{b.byYear ? ` · ${b.byYear - y <= 0 ? 'this year' : `${b.byYear - y} yr${b.byYear - y > 1 ? 's' : ''} to go`}` : ''}
            {habits.length > 0 && ` · ${mins(total)} on ${date === todayKey() ? 'today' : fmt(date, { weekday: 'short', day: 'numeric', month: 'short' })}`}
          </div>
          {habits.length === 0 ? (
            b.linked
              ? <Empty emoji="🌙" text="None of its habits run on this day." />
              : <Empty emoji="🔗" text="No routine habits in this one yet. Add them in More → Who I want to be." />
          ) : (
            <>
              <div className="card list" style={{ marginTop: 14 }}>
                {habits.map((h) => (
                  <div key={h._id} className="item" onClick={() => onToggleHabit(h._id)}>
                    <div className="bar" style={{ background: h.color || 'var(--violet)' }} />
                    <span style={{ fontSize: 22 }}>{h.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={`title ${h.done ? 'done' : ''}`}>{h.title}</div>
                      <div className="meta">{h.time ? clockTime(h.time, h.minutes) : 'Any time'} · {h.done ? 'Done' : 'Not yet'}</div>
                    </div>
                    <span className="time-chip" style={{ background: 'var(--tint)', color: 'var(--violet)' }}>{mins(h.minutes)}</span>
                    <Check done={h.done} color={h.color || '#7c3aed'} onToggle={() => onToggleHabit(h._id)} />
                  </div>
                ))}
              </div>
              <motion.button whileTap={{ scale: 0.97 }} className="primary-btn" style={{ marginTop: 16 }} onClick={onToggleAll}>
                {left === 0 ? 'Untick all' : `Tick all ${habits.length}`}
              </motion.button>
              <div className="tiny faint" style={{ textAlign: 'center', marginTop: 8 }}>
                {left === 0 ? 'All done for the day 🎉' : `${left} of ${habits.length} left`}
              </div>
            </>
          )}
        </>
      )}
    </Sheet>
  );
}
