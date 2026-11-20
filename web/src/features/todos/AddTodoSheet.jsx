import { memo, useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Sun, Repeat, Flag, Ellipsis, Sprout, X, UserRound, ChevronRight, Scale, Rocket, Lightbulb, GraduationCap, RotateCcw } from 'lucide-react';
import { api, todayKey, addDays, fmt, buzz, mins } from '../../lib';
import { Sheet, spring, soft, useToast, EMOJIS, TimePicker, EmojiPicker } from '../../components';

export default function AddTodoSheet({ target, onClose, onSaved }) {
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState(null);
  const [parentId, setParentId] = useState(null);
  const [minutes, setMinutes] = useState(15);
  const [containers, setContainers] = useState([]);
  useEffect(() => {
    if (!target) return;
    setTitle(''); setWhen(target.date); setParentId(target.parentId || null); setMinutes(15);
  }, [target]);
  // Which routine items can hold to-dos on that day (e.g. Office work on weekdays)?
  useEffect(() => {
    if (!target || !when) return;
    api.get(`/day/${when}`).then((d) => {
      const c = d.routine.filter((r) => r.holdsTodos);
      setContainers(c);
      setParentId((p) => (p && !c.some((x) => x._id === p) ? null : p));
    });
  }, [target, when]);
  const t = todayKey();
  const save = async (e) => {
    e?.preventDefault();
    if (!title.trim()) return;
    await api.post('/todos', { title: title.trim(), date: when, parentId, minutes: parentId ? 0 : minutes });
    buzz(20); onSaved(when);
  };
  const dates = target ? [[t, 'Today'], [addDays(t, 1), 'Tomorrow'], ...(target.date !== t && target.date !== addDays(t, 1) ? [[target.date, fmt(target.date, { day: 'numeric', month: 'short' })]] : [])] : [];
  const on = { background: 'var(--tint)', color: 'var(--violet)' };
  return (
    <Sheet open={!!target} onClose={onClose} title="New to-do">
      <form onSubmit={save}>
        <input className="input" autoFocus placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="field-label">When</label>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {dates.map(([d, label]) => (
            <button type="button" key={d} className="ghost-btn" style={when === d ? on : undefined} onClick={() => setWhen(d)}>{label}</button>
          ))}
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
        <AnimatePresence initial={false}>
          {!parentId ? (
            <motion.div key="m" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
              <label className="field-label">How long will it take? (added to your day plan)</label>
              <TimePicker value={minutes} onChange={setMinutes} presets={[10, 15, 30, 45, 60]} max={12 * 60} />
            </motion.div>
          ) : (
            <motion.div key="n" className="tiny faint" style={{ marginTop: 10 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              No extra time: it fits inside {containers.find((c) => c._id === parentId)?.title}’s fixed hours.
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button whileTap={{ scale: 0.97 }} className="primary-btn" style={{ marginTop: 18 }}>Add to-do</motion.button>
      </form>
    </Sheet>
  );
}
