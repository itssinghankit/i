import { useEffect, useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Trash2, ArrowLeftRight, Star, Target } from 'lucide-react';
import { api, todayKey, buzz } from '../../lib';
import { Check, Ring, Counter, Segmented, Sheet, Empty, EMOJIS, MUSIC, soft, TimePicker, EmojiPicker } from '../../components';

import QuickAdd from './QuickAdd.jsx';

// ---------- Who I want to be (+ the daily habit that gets me there) ----------
export function WantToBe({ onChanged, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [adding, setAdding] = useState(false);
  const load = () => api.get('/wantToBe').then((r) => setRows(r.sort((a, b) => a.byYear - b.byYear)));
  useEffect(() => { load(); }, [refreshKey]);
  const activate = async (r) => { buzz(20); setRows((x) => x.map((y) => ({ ...y, active: y._id === r._id }))); await api.post(`/wantToBe/${r._id}/activate`); onChanged?.(); };
  const remove = async (r) => { await api.del(`/wantToBe/${r._id}`); load(); onChanged?.(); };
  const grads = ['linear-gradient(140deg,#f97316,#f43f5e)', 'linear-gradient(140deg,#6366f1,#06b6d4)', 'linear-gradient(140deg,#10b981,#65a30d)', 'linear-gradient(140deg,#a855f7,#ec4899)'];
  const y = Number(todayKey().slice(0, 4));

  return (
    <div>
      <div className="small muted bold">Future me</div>
      <div className="between"><h1>Who I want to be</h1>
        <motion.button whileTap={{ scale: 0.88 }} className="icon-btn" style={{ width: 46, height: 46, background: 'var(--grad)', color: '#fff', border: 0 }} onClick={() => setAdding(true)} aria-label="Add"><Plus size={22} /></motion.button>
      </div>
      <p className="small muted" style={{ marginTop: 8 }}>Each dream gets one small daily habit. The <b>active</b> one shows on Home so you can tick it every day.</p>
      {rows.length === 0 && <Empty emoji="🌟" text="Add who you want to become." />}
      <motion.div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
        {rows.map((r, i) => (
          <motion.div key={r._id} className="habit rise" style={{ background: grads[i % grads.length], minHeight: 0, outline: r.active ? '3px solid #16151d' : 'none', outlineOffset: 3 }}>
            <div className="shine" />
            <div className="between" style={{ alignItems: 'flex-start' }}>
              <div>
                <div className="kicker">By {r.byYear} · {r.byYear - y <= 0 ? 'this year' : `${r.byYear - y} yr${r.byYear - y > 1 ? 's' : ''} to go`}</div>
                <div className="h-title" style={{ fontSize: 19 }}>{r.emoji} {r.title}</div>
              </div>
              <button onClick={() => remove(r)} aria-label="Delete" style={{ opacity: 0.8 }}><Trash2 size={16} color="#fff" /></button>
            </div>
            <div style={{ background: 'rgba(255,255,255,.18)', borderRadius: 14, padding: '10px 12px', marginTop: 12 }}>
              <div className="tiny" style={{ opacity: 0.85 }}>Daily habit</div>
              <div className="bold">{r.habit}{r.minutes ? ` · ${r.minutes}m` : ''}</div>
            </div>
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => !r.active && activate(r)}
              style={{ marginTop: 12, height: 40, borderRadius: 12, background: r.active ? '#fff' : 'rgba(255,255,255,.22)', color: r.active ? '#16151d' : '#fff', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {r.active ? <><Star size={16} fill="#f59e0b" color="#f59e0b" /> Showing on Home</> : <><Target size={16} /> Track this daily</>}
            </motion.button>
          </motion.div>
        ))}
      </motion.div>
      <AddWantToBe open={adding} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); onChanged?.(); }} />
    </div>
  );
}

function AddWantToBe({ open, onClose, onSaved }) {
  const y = Number(todayKey().slice(0, 4));
  const [f, setF] = useState({ title: '', habit: '', byYear: y + 1, emoji: '🌟', minutes: 15 });
  useEffect(() => { if (open) setF({ title: '', habit: '', byYear: y + 1, emoji: '🌟', minutes: 15 }); }, [open]);
  const save = async () => { if (!f.title.trim() || !f.habit.trim()) return; await api.post('/wantToBe', f); onSaved(); };
  return (
    <Sheet open={open} onClose={onClose} title="I want to be…">
      <label className="field-label">Who do you want to become?</label>
      <input className="input" autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. A calm, focused person" />
      <label className="field-label">One small thing to do every day for it</label>
      <input className="input" value={f.habit} onChange={(e) => setF({ ...f, habit: e.target.value })} placeholder="e.g. 10 minutes of meditation" />
      <label className="field-label">Time it takes each day</label>
      <TimePicker value={f.minutes} onChange={(m) => setF((x) => ({ ...x, minutes: m }))} presets={[5, 10, 15, 30, 45, 60]} max={4 * 60} />
      <label className="field-label">By the year</label>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        {[1, 2, 3, 5, 10].map((n) => (
          <button key={n} className="ghost-btn" style={f.byYear === y + n ? { background: 'var(--tint)', color: 'var(--violet)' } : undefined} onClick={() => setF({ ...f, byYear: y + n })}>{y + n}</button>
        ))}
      </div>
      <label className="field-label">Icon</label>
      <EmojiPicker value={f.emoji} onChange={(e) => setF((x) => ({ ...x, emoji: e }))} options={['🌟', '💪', '✍️', '💰', '🧘', '🎨', '🧑‍🍳', '🌍', '🎤', '🧑‍💻', '📖', '❤️', '🏆', '🎹', '🚀', ...MUSIC.slice(0, 8)]} />
      <motion.button whileTap={{ scale: 0.97 }} className="primary-btn" style={{ marginTop: 20 }} onClick={save}>Save</motion.button>
    </Sheet>
  );
}
