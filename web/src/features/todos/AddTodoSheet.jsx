import { useEffect, useState } from 'react';
import { m as motion } from 'framer-motion';
import { api, todayKey, addDays, fmt, buzz, mins } from '../../lib';
import { Sheet, TimePicker, TimeOfDay } from '../../components';

// New to-do.
//   When:  Today / Tomorrow / the day you were looking at
//   Type:  Just this day (daily, default) or All-time (shows every day until you tick it)
//   Where: standalone (adds to your day) or inside a routine item that holds to-dos (uses its time)
// If it doesn't fit the time left (the day's free time, or that routine item's time), Add is disabled.
export default function AddTodoSheet({ target, onClose, onSaved }) {
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState(null);
  const [kind, setKind] = useState('daily');
  const [parentId, setParentId] = useState(null);
  const [minutes, setMinutes] = useState(15);
  const [time, setTime] = useState(null);
  const [dayInfo, setDayInfo] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!target) return;
    setTitle(''); setWhen(target.date); setKind('daily'); setParentId(target.parentId || null); setMinutes(15); setTime(null); setError('');
  }, [target]);
  // Which routine items can hold to-dos on that day (e.g. Office work on weekdays), and how much time is left?
  useEffect(() => {
    if (!target || !when) return;
    setDayInfo(null);
    api.get(`/day/${when}`).then((d) => {
      const containers = d.routine.filter((r) => r.holdsTodos).map((r) => ({
        ...r, used: d.todos.filter((t) => t.parentId === r._id).reduce((s, t) => s + (Number(t.minutes) || 0), 0),
      }));
      setDayInfo({ containers, free: d.budget.freeMinutes });
      setParentId((p) => (p && !containers.some((x) => x._id === p) ? null : p));
    });
  }, [target, when]);

  const containers = dayInfo?.containers || [];
  const parent = containers.find((c) => c._id === parentId);
  const left = !dayInfo ? null : parent ? (Number(parent.minutes) || 0) - parent.used : dayInfo.free;
  const noTime = left !== null && minutes > left;

  const t = todayKey();
  const save = async (e) => {
    e?.preventDefault();
    if (!title.trim() || noTime) return;
    try {
      await api.post('/todos', { title: title.trim(), date: when, kind, parentId, minutes, time });
      buzz(20); onSaved(when);
    } catch (err) { setError(err.message || 'Could not save'); }
  };
  const dates = target ? [[t, 'Today'], [addDays(t, 1), 'Tomorrow'], ...(target.date !== t && target.date !== addDays(t, 1) ? [[target.date, fmt(target.date, { day: 'numeric', month: 'short' })]] : [])] : [];
  const on = { background: 'var(--tint)', color: 'var(--violet)' };
  return (
    <Sheet open={!!target} onClose={onClose} title="New to-do">
      <form onSubmit={save}>
        <input className="input" data-autofocus placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="field-label">When</label>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {dates.map(([d, label]) => (
            <button type="button" key={d} className="ghost-btn" style={when === d ? on : undefined} onClick={() => setWhen(d)}>{label}</button>
          ))}
        </div>
        <label className="field-label">Type</label>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <button type="button" className="ghost-btn" style={kind === 'daily' ? on : undefined} onClick={() => setKind('daily')}>Just this day</button>
          <button type="button" className="ghost-btn" style={kind === 'always' ? on : undefined} onClick={() => setKind('always')}>♾️ All-time</button>
        </div>
        <div className="tiny faint" style={{ marginTop: 6 }}>
          {kind === 'always' ? 'Shows on every day’s to-do list until you tick it.' : 'Only on this day. Not carried to the next day.'}
        </div>
        <label className="field-label">Where does it go?</label>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {containers.map((c) => (
            <button type="button" key={c._id} className="ghost-btn" style={parentId === c._id ? on : undefined} onClick={() => setParentId(c._id)}>
              {c.emoji} Inside {c.title}
            </button>
          ))}
          <button type="button" className="ghost-btn" style={!parentId ? on : undefined} onClick={() => setParentId(null)}>✅ Standalone</button>
        </div>
        <label className="field-label">{parent ? `How long? (uses ${parent.title}’s time)` : 'How long will it take? (added to your day plan)'}</label>
        <TimePicker value={minutes} onChange={setMinutes} presets={[10, 15, 30, 45, 60]} max={12 * 60} />
        {left !== null && (
          <div className="tiny" style={{ marginTop: 6, color: noTime ? '#e11d48' : 'var(--ink-3)', fontWeight: noTime ? 700 : 500 }}>
            {noTime
              ? `You don’t have enough time for this: only ${mins(Math.max(0, left))} left${parent ? ` in ${parent.title}` : ' in your day'}.`
              : `${mins(Math.max(0, left))} left${parent ? ` in ${parent.title}` : ' in your day'}.`}
          </div>
        )}
        <label className="field-label">Time (optional)</label>
        <TimeOfDay value={time} onChange={setTime} minutes={minutes} />
        {error && <div className="no-time-msg" style={{ marginTop: 10 }}>{error}</div>}
        <motion.button whileTap={noTime ? undefined : { scale: 0.97 }} className="primary-btn" style={{ marginTop: 18, opacity: noTime || !title.trim() ? 0.5 : 1 }} disabled={noTime}>
          {noTime ? 'Not enough time' : 'Add to-do'}
        </motion.button>
      </form>
    </Sheet>
  );
}
