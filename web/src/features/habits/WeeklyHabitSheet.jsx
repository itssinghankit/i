import { memo, useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Sun, Repeat, Flag, Ellipsis, Sprout, X, UserRound, ChevronRight, Scale, Rocket, Lightbulb, GraduationCap, RotateCcw } from 'lucide-react';
import { api, todayKey, addDays, fmt, buzz, mins } from '../../lib';
import { Sheet, spring, soft, useToast, EMOJIS, MUSIC, TimePicker, EmojiPicker } from '../../components';

// Habit of the week: one new habit to practise for 7 days, then graduate into the routine.
export default function WeeklyHabitSheet({ open, onClose, onChanged, toast }) {
  const [data, setData] = useState(null);
  const [days, setDays] = useState([]);
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ title: '', emoji: '✨', minutes: 10 });
  const load = async () => {
    const d = await api.get('/weeklyHabits');
    setData(d);
    const wk = await Promise.all(Array.from({ length: 7 }, (_, i) => api.get(`/day/${addDays(d.currentWeek, i)}`)));
    setDays(wk.map((x) => ({ date: x.date, done: x.weeklyHabit?.done })));
  };
  useEffect(() => { if (open) { setEditing(false); load(); } }, [open]);
  const current = data?.habits.find((h) => h.weekStart === data.currentWeek);
  const past = data?.habits.filter((h) => h.weekStart !== data.currentWeek) || [];
  const save = async () => {
    if (!f.title.trim()) return;
    await api.post('/weeklyHabits', { title: f.title.trim(), emoji: f.emoji, minutes: f.minutes });
    buzz(25); setEditing(false); load(); onChanged();
  };
  const toggleDay = async (d) => {
    if (d.date > todayKey()) return;
    setDays((x) => x.map((y) => (y.date === d.date ? { ...y, done: !y.done } : y)));
    await api.post(`/day/${d.date}/toggle`, { kind: 'weekly' }); onChanged();
  };
  const graduate = async (h) => { await api.post(`/weeklyHabits/${h._id}/graduate`, { minutes: 10 }); toast('Added to your daily routine 🎓'); load(); onChanged(); };
  const doneCount = days.filter((d) => d.done).length;

  return (
    <Sheet open={open} onClose={onClose} title="Habit of the week">
      {current && !editing ? (
        <motion.div className="habit" style={{ background: 'linear-gradient(140deg,#7c3aed,#c026d3 60%,#ec4899)', minHeight: 0 }} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="shine" />
          <div className="kicker">Week of {fmt(data.currentWeek, { day: 'numeric', month: 'short' })} · {doneCount}/7 days{current.minutes ? ` · ${mins(current.minutes)}/day` : ''}</div>
          <div className="h-title" style={{ fontSize: 22 }}>{current.emoji} {current.title}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginTop: 14 }}>
            {days.map((d, i) => (
              <motion.button key={d.date} onClick={() => toggleDay(d)} whileTap={{ scale: 0.85 }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: d.date > todayKey() ? 0.45 : 1, y: 0 }} transition={{ delay: i * 0.04 }}
                style={{ borderRadius: 12, padding: '8px 0', background: d.done ? '#fff' : 'rgba(255,255,255,.18)', color: d.done ? '#a21caf' : '#fff', fontWeight: 700, fontSize: 12 }}>
                {fmt(d.date, { weekday: 'narrow' })}<div style={{ fontSize: 15 }}>{d.done ? '✓' : '·'}</div>
              </motion.button>
            ))}
          </div>
          <button className="ghost-btn" style={{ marginTop: 14, background: 'rgba(255,255,255,.22)', color: '#fff', alignSelf: 'flex-start' }} onClick={() => { setF({ title: current.title, emoji: current.emoji, minutes: current.minutes || 10 }); setEditing(true); }}>Change this week’s habit</button>
        </motion.div>
      ) : (
        <div>
          <p className="small muted" style={{ marginTop: 0 }}>Pick one small habit to practise every day this week. If it sticks (5+ days), add it to your routine.</p>
          <input className="input" data-autofocus placeholder="e.g. No sugar after 6 PM" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <div style={{ marginTop: 10 }}>
            <EmojiPicker value={f.emoji} onChange={(e) => setF((x) => ({ ...x, emoji: e }))} options={[...EMOJIS.slice(0, 15), ...MUSIC.slice(0, 8)]} />
          </div>
          <div className="small bold" style={{ margin: '14px 2px 8px' }}>Time it takes each day</div>
          <TimePicker value={f.minutes} onChange={(m) => setF((x) => ({ ...x, minutes: m }))} presets={[5, 10, 15, 30, 45, 60]} max={4 * 60} />
          <div className="small bold" style={{ margin: '14px 2px 8px' }}>Ideas</div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            {['Drink 3L water', 'No screens in bed', 'Gratitude: 3 things', '5-minute tidy-up', 'Walk after lunch', 'Read 10 pages'].map((s) => (
              <button key={s} className="ghost-btn" onClick={() => setF({ ...f, title: s })}>{s}</button>
            ))}
          </div>
          <motion.button whileTap={{ scale: 0.97 }} className="primary-btn" style={{ marginTop: 18 }} onClick={save}>Set for this week</motion.button>
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
              </div>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
