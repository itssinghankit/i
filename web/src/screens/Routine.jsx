import { useEffect, useState } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { Plus, GripVertical, Minus, Trash2, Moon } from 'lucide-react';
import { api, mins, buzz, todayKey, fromKey } from '../api';
import { Sheet, Empty, EMOJIS, COLORS, soft, spring, TimePicker } from '../ui';

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ALL = [0, 1, 2, 3, 4, 5, 6];
const PRESETS = [
  { label: 'Every day', days: ALL },
  { label: 'Weekdays', days: [0, 1, 2, 3, 4] },
  { label: 'Weekends', days: [5, 6] },
];
const daysOf = (r) => (r.days?.length ? r.days : ALL);
const dayLabel = (days) => PRESETS.find((p) => p.days.length === days.length && p.days.every((d) => days.includes(d)))?.label
  || days.slice().sort().map((d) => DAY_SHORT[d]).join(', ');

// The only place where the daily routine can be changed. Each item picks the weekdays it runs on,
// so Saturday / Sunday (or any day) can have its own routine.
export default function Routine({ onChanged }) {
  const [items, setItems] = useState(null);
  const [edit, setEdit] = useState(null); // null = closed, {} = new, item = editing
  const [day, setDay] = useState(() => (fromKey(todayKey()).getDay() + 6) % 7);
  const [sleep, setSleep] = useState(8);
  const load = () => api.get('/routine').then(setItems);
  useEffect(() => { load(); api.get('/settings').then((s) => setSleep(s.sleepHours)); }, []);

  const awake = (24 - sleep) * 60;
  const forDay = (d) => (items || []).filter((r) => daysOf(r).includes(d));
  const totalOn = (d) => forDay(d).reduce((s, r) => s + r.minutes, 0);
  const shown = forDay(day);
  const total = totalOn(day);
  const fits = total <= awake;

  // Reorder only re-sorts the visible items; hidden ones keep their place.
  const reorder = (next) => {
    const ids = new Set(next.map((r) => r._id));
    const slots = items.map((r, i) => (ids.has(r._id) ? i : -1)).filter((i) => i >= 0);
    const merged = items.slice();
    slots.forEach((slot, k) => { merged[slot] = next[k]; });
    setItems(merged);
  };
  const commitOrder = () => api.post('/routine/reorder', { ids: items.map((r) => r._id) }).then(onChanged);
  const changeSleep = (n) => {
    const v = Math.min(12, Math.max(5, sleep + n));
    setSleep(v); api.patch('/settings', { sleepHours: v }).then(onChanged);
  };

  return (
    <div>
      <div className="between" style={{ marginBottom: 6 }}>
        <div>
          <div className="small muted bold">Your blueprint</div>
          <h1>Routine</h1>
        </div>
        <motion.button whileTap={{ scale: 0.88 }} className="icon-btn" style={{ width: 46, height: 46, background: 'var(--grad)', color: '#fff', border: 0 }}
          onClick={() => setEdit({ days: day >= 5 ? [5, 6] : ALL })} aria-label="Add routine item"><Plus size={22} /></motion.button>
      </div>

      {/* Mon…Sun picker. Each chip shows the total time of that day's routine and turns red if it doesn't fit. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginTop: 14 }}>
        {DAY_SHORT.map((d, i) => {
          const m = totalOn(i);
          const on = i === day;
          const over = m > awake;
          return (
            <motion.button key={d} whileTap={{ scale: 0.9 }} onClick={() => { buzz(6); setDay(i); }}
              style={{ position: 'relative', padding: '10px 0 8px', borderRadius: 16, textAlign: 'center', background: on ? 'transparent' : 'var(--card)', border: '1px solid var(--line)', color: on ? '#fff' : 'var(--ink)' }}>
              {on && <motion.span layoutId="dayPill" transition={spring} style={{ position: 'absolute', inset: -1, borderRadius: 16, background: i >= 5 ? 'linear-gradient(135deg,#f97316,#ec4899)' : 'var(--grad)', zIndex: 0 }} />}
              <span style={{ position: 'relative', display: 'block', fontWeight: 700, fontSize: 13 }}>{d}</span>
              <span style={{ position: 'relative', display: 'block', fontSize: 10.5, fontWeight: 700, marginTop: 2, color: on ? 'rgba(255,255,255,.9)' : over ? '#e11d48' : 'var(--ink-3)' }}>
                {Math.round(m / 6) / 10}h
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Does this day's routine fit in the waking hours? */}
      {items && (
        <motion.div className="card" style={{ padding: 16, marginTop: 12 }} layout>
          <div className="between">
            <span className="bold">{DAY_SHORT[day]}{day >= 5 ? ' · weekend routine' : ''}</span>
            <span style={{ fontSize: 22, fontWeight: 800 }} className="grad-text">{mins(total)}</span>
          </div>
          <div style={{ display: 'flex', height: 14, borderRadius: 9, overflow: 'hidden', marginTop: 12, gap: 2, background: 'var(--soft)' }}>
            {shown.map((r, i) => (
              <motion.div key={r._id} style={{ background: r.color }} initial={{ width: 0 }}
                animate={{ width: `${(r.minutes / Math.max(awake, total)) * 100}%` }} transition={{ ...soft, delay: i * 0.03 }} />
            ))}
          </div>
          <div className="between" style={{ marginTop: 10 }}>
            <span className="small bold" style={{ color: fits ? '#15803d' : '#e11d48' }}>
              {fits ? `✓ Fits · ${mins(awake - total)} left of ${24 - sleep}h awake` : `Over by ${mins(total - awake)} — too much for one day`}
            </span>
          </div>
          <div className="between" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
            <span className="small muted row" style={{ gap: 6 }}><Moon size={15} /> Sleep</span>
            <div className="row" style={{ gap: 8 }}>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => changeSleep(-0.5)} aria-label="Less sleep"><Minus size={15} /></button>
              <span className="bold" style={{ minWidth: 38, textAlign: 'center' }}>{sleep}h</span>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => changeSleep(0.5)} aria-label="More sleep"><Plus size={15} /></button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="section-label">{shown.length} items on {DAY_SHORT[day]} · drag ⋮⋮ to reorder</div>
      {items && shown.length === 0 && <Empty emoji="🌱" text={`Nothing on ${DAY_SHORT[day]} yet. Add with +`} />}
      {/* New list fades in right away when you switch day (no waiting for the old one to leave). */}
      {items && shown.length > 0 && (
          <motion.div key={day} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Reorder.Group axis="y" values={shown} onReorder={reorder} className="card list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {shown.map((r) => (
                <Reorder.Item key={r._id} value={r} className="item" onDragEnd={commitOrder} whileDrag={{ scale: 1.03, boxShadow: '0 12px 30px rgba(0,0,0,.15)', zIndex: 5 }}>
                  <GripVertical size={18} color="#c4c2d0" style={{ cursor: 'grab', flex: 'none' }} />
                  <div className="emoji" style={{ background: `${r.color}1f` }}>{r.emoji}</div>
                  <button style={{ flex: 1, textAlign: 'left', minWidth: 0 }} onClick={() => setEdit(r)}>
                    <div className="title">{r.title}</div>
                    <div className="meta">{dayLabel(daysOf(r))}{r.holdsTodos ? ' · holds to-dos' : ''}</div>
                  </button>
                  <span className="time-chip" style={{ background: `${r.color}1a`, color: r.color }}>{mins(r.minutes)}</span>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </motion.div>
        )}

      <RoutineEditor item={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); onChanged?.(); }} />
    </div>
  );
}

function RoutineEditor({ item, onClose, onSaved }) {
  const blank = { title: '', minutes: 15, emoji: '✨', color: COLORS[0], days: ALL, holdsTodos: false };
  const [f, setF] = useState(blank);
  useEffect(() => { if (item) setF({ ...blank, ...item, days: daysOf(item) }); }, [item]);
  const isNew = !item?._id;
  const save = async () => {
    if (!f.title.trim() || !f.days.length) return;
    const body = { title: f.title.trim(), minutes: Number(f.minutes) || 5, emoji: f.emoji, color: f.color, days: f.days.slice().sort(), holdsTodos: !!f.holdsTodos };
    if (isNew) await api.post('/routine', body); else await api.patch(`/routine/${item._id}`, body);
    buzz(20); onSaved();
  };
  const remove = async () => { await api.del(`/routine/${item._id}`); onSaved(); };
  const toggleDay = (d) => setF((x) => ({ ...x, days: x.days.includes(d) ? x.days.filter((y) => y !== d) : [...x.days, d] }));
  const on = { background: '#ede9fe', color: 'var(--violet)' };

  return (
    <Sheet open={!!item} onClose={onClose} title={isNew ? 'New routine item' : 'Edit routine item'}>
      <motion.div className="emoji" style={{ width: 64, height: 64, fontSize: 32, borderRadius: 20, margin: '0 auto', background: `${f.color}22` }}
        key={f.emoji + f.color} initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={soft}>{f.emoji}</motion.div>
      <label className="field-label">What do you do?</label>
      <input className="input" autoFocus placeholder="e.g. Office work" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />

      <label className="field-label">How long does it take?</label>
      <TimePicker value={Number(f.minutes) || 0} onChange={(m) => setF((x) => ({ ...x, minutes: m }))} presets={[10, 15, 30, 45, 60, 120]} max={18 * 60} />

      <label className="field-label">Which days?</label>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        {PRESETS.map((p) => {
          const active = p.days.length === f.days.length && p.days.every((d) => f.days.includes(d));
          return <button key={p.label} className="ghost-btn" style={active ? on : undefined} onClick={() => setF({ ...f, days: p.days })}>{p.label}</button>;
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginTop: 8 }}>
        {DAY_SHORT.map((d, i) => (
          <motion.button key={d} whileTap={{ scale: 0.85 }} onClick={() => toggleDay(i)}
            style={{ height: 40, borderRadius: 12, fontWeight: 700, fontSize: 12.5, background: f.days.includes(i) ? f.color : 'var(--soft)', color: f.days.includes(i) ? '#fff' : 'var(--ink-3)', transition: 'background .2s' }}>
            {d}
          </motion.button>
        ))}
      </div>
      {!f.days.length && <div className="tiny" style={{ color: '#e11d48', marginTop: 6 }}>Pick at least one day.</div>}

      <button className="row" style={{ width: '100%', marginTop: 16, padding: 14, borderRadius: 16, background: 'var(--soft)', gap: 12, textAlign: 'left' }}
        onClick={() => setF({ ...f, holdsTodos: !f.holdsTodos })}>
        <span style={{ fontSize: 22 }}>💼</span>
        <span style={{ flex: 1 }}>
          <span className="bold" style={{ display: 'block' }}>Holds to-dos</span>
          <span className="tiny muted">Like office work: its time is fixed, and tasks you add inside it don’t add extra time.</span>
        </span>
        <motion.span style={{ width: 46, height: 28, borderRadius: 99, background: f.holdsTodos ? 'var(--violet)' : '#d8d6e3', display: 'flex', padding: 3, justifyContent: f.holdsTodos ? 'flex-end' : 'flex-start', flex: 'none' }}>
          <motion.span layout transition={spring} style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff' }} />
        </motion.span>
      </button>

      <label className="field-label">Icon</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 6 }}>
        {[...EMOJIS.slice(0, 12), '💼', '👨‍👩‍👧', '🗓️', '🍳'].map((e) => <button key={e} className={`emoji-pick ${f.emoji === e ? 'on' : ''}`} onClick={() => setF({ ...f, emoji: e })}>{e}</button>)}
      </div>
      <label className="field-label">Colour</label>
      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        {COLORS.map((c) => <button key={c} className={`swatch ${f.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setF({ ...f, color: c })} aria-label={c} />)}
      </div>

      <div style={{ marginTop: 22, display: 'grid', gap: 10 }}>
        <motion.button whileTap={{ scale: 0.97 }} className="primary-btn" onClick={save}>{isNew ? 'Add to routine' : 'Save changes'}</motion.button>
        {!isNew && (
          <button className="row" style={{ justifyContent: 'center', color: '#e11d48', fontWeight: 600, height: 44 }} onClick={remove}>
            <Trash2 size={16} /> Remove from routine
          </button>
        )}
      </div>
    </Sheet>
  );
}
