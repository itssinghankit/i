import { useEffect, useState } from 'react';
import { m as motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { api, todayKey, addDays, fmt, buzz, mins } from '../../lib';
import { Sheet } from '../../components';

// Habit of the week: one of your routine habits to focus on for 7 days.
// You pick it from the routine list (no typing, so no keyboard pops up while the sheet slides).
// Ticking it on Today ticks that routine item. You can change or delete it any time.
export default function WeeklyHabitSheet({ open, onClose, onChanged, toast }) {
  const [data, setData] = useState(null);
  const [routine, setRoutine] = useState([]);
  const [days, setDays] = useState([]);
  const [picking, setPicking] = useState(false);
  const load = async () => {
    const [d, r] = await Promise.all([api.get('/weeklyHabits'), api.get('/routine')]);
    setData(d); setRoutine(r);
    const wk = await Promise.all(Array.from({ length: 7 }, (_, i) => api.get(`/day/${addDays(d.currentWeek, i)}`)));
    setDays(wk.map((x) => ({ date: x.date, done: x.weeklyHabit?.done, runs: x.weeklyHabit?.runsToday !== false })));
  };
  useEffect(() => { if (open) { setPicking(false); load(); } }, [open]);
  const current = data?.habits.find((h) => h.weekStart === data.currentWeek);
  const past = data?.habits.filter((h) => h.weekStart !== data.currentWeek) || [];
  const pick = async (r) => {
    await api.post('/weeklyHabits', { routineId: r._id });
    buzz(25); setPicking(false); load(); onChanged();
  };
  const remove = async (h) => {
    await api.del(`/weeklyHabits/${h._id}`);
    buzz(15); toast?.('Habit of the week removed'); load(); onChanged();
  };
  const toggleDay = async (d) => {
    if (d.date > todayKey() || !d.runs) return;
    setDays((x) => x.map((y) => (y.date === d.date ? { ...y, done: !y.done } : y)));
    await api.post(`/day/${d.date}/toggle`, { kind: 'weekly' }); onChanged();
  };
  const graduate = async (h) => { await api.post(`/weeklyHabits/${h._id}/graduate`, { minutes: 10 }); toast?.('Added to your daily routine 🎓'); load(); onChanged(); };
  const doneCount = days.filter((d) => d.done).length;

  return (
    <Sheet open={open} onClose={onClose} title="Habit of the week">
      {current && !picking ? (
        <motion.div className="habit" style={{ background: 'linear-gradient(140deg,#7c3aed,#c026d3 60%,#ec4899)', minHeight: 0 }} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="shine" />
          <div className="kicker">Week of {fmt(data.currentWeek, { day: 'numeric', month: 'short' })} · {doneCount}/7 days{current.minutes ? ` · ${mins(current.minutes)}/day` : ''}</div>
          <div className="h-title" style={{ fontSize: 22 }}>{current.emoji} {current.title}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginTop: 14 }}>
            {days.map((d, i) => (
              <motion.button key={d.date} onClick={() => toggleDay(d)} whileTap={{ scale: 0.85 }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: d.date > todayKey() || !d.runs ? 0.45 : 1, y: 0 }} transition={{ delay: i * 0.04 }}
                style={{ borderRadius: 12, padding: '8px 0', background: d.done ? '#fff' : 'rgba(255,255,255,.18)', color: d.done ? '#a21caf' : '#fff', fontWeight: 700, fontSize: 12 }}>
                {fmt(d.date, { weekday: 'narrow' })}<div style={{ fontSize: 15 }}>{d.done ? '✓' : d.runs ? '·' : '–'}</div>
              </motion.button>
            ))}
          </div>
          <div className="row" style={{ gap: 8, marginTop: 14 }}>
            <button className="ghost-btn" style={{ background: 'rgba(255,255,255,.22)', color: '#fff' }} onClick={() => setPicking(true)}>Change this week’s habit</button>
            <button className="ghost-btn row" style={{ background: 'rgba(255,255,255,.22)', color: '#fff', gap: 6 }} onClick={() => remove(current)}><Trash2 size={14} /> Delete</button>
          </div>
        </motion.div>
      ) : (
        <div>
          <p className="small muted" style={{ marginTop: 0 }}>Pick one of your routine habits to focus on every day this week.</p>
          {routine.length === 0 ? <div className="tiny faint">Add habits in the Routine tab first.</div> : (
            <div className="card list">
              {routine.map((r) => (
                <button key={r._id} className="item" style={{ width: '100%', textAlign: 'left' }} onClick={() => pick(r)}>
                  <div className="emoji" style={{ background: `${r.color}1f` }}>{r.emoji}</div>
                  <div className="title" style={{ flex: 1, minWidth: 0 }}>{r.title}</div>
                  {current?.routineId === r._id && <span className="badge-soft">This week</span>}
                  <span className="time-chip" style={{ background: `${r.color}1a`, color: r.color }}>{mins(r.minutes)}</span>
                </button>
              ))}
            </div>
          )}
          {current && <button className="ghost-btn" style={{ marginTop: 12 }} onClick={() => setPicking(false)}>Cancel</button>}
        </div>
      )}

      {past.length > 0 && (
        <>
          <div className="section-label">Past weeks</div>
          <div className="card list">
            {past.map((h) => (
              <div key={h._id} className="item">
                <span style={{ fontSize: 20 }}>{h.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="title">{h.title}</div>
                  <div className="meta">Week of {fmt(h.weekStart, { day: 'numeric', month: 'short' })}</div>
                </div>
                <div className="bold small" style={{ color: h.daysDone >= 5 ? '#16a34a' : '#f97316' }}>{h.daysDone}/7</div>
                {h.addedToRoutine
                  ? <span className="tiny faint">In routine</span>
                  : <button className="ghost-btn" onClick={() => graduate(h)}>+ Routine</button>}
                <button onClick={() => remove(h)} aria-label={`Delete ${h.title}`} className="ic-3" style={{ padding: 6 }}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
