import { useEffect, useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Trash2, ArrowLeftRight, Star, Target } from 'lucide-react';
import { api, keepIfSame, todayKey, buzz } from '../../lib';
import { Check, Ring, Counter, Segmented, Sheet, Empty, EMOJIS, soft, TimePicker, EmojiPicker } from '../../components';

import QuickAdd from './QuickAdd.jsx';

// ---------- Resolutions per year ----------
export function Resolutions({ refreshKey }) {
  const [year, setYear] = useState(Number(todayKey().slice(0, 4)));
  const [rows, setRows] = useState([]);
  const [dir, setDir] = useState(0);
  const load = () => api.get(`/resolutions?year=${year}`).then(keepIfSame(setRows));
  useEffect(() => { load(); }, [year, refreshKey]);
  const done = rows.filter((r) => r.done).length;
  const pct = rows.length ? Math.round((done / rows.length) * 100) : 0;
  const toggle = (r) => { setRows((x) => x.map((y) => (y._id === r._id ? { ...y, done: !y.done } : y))); api.patch(`/resolutions/${r._id}`, { done: !r.done }); };
  const remove = (r) => { setRows((x) => x.filter((y) => y._id !== r._id)); api.del(`/resolutions/${r._id}`); };
  const add = (title) => api.post('/resolutions', { title, year, emoji: '🎯', done: false }).then(load);
  const shift = (n) => { setDir(n); setYear(year + n); };

  return (
    <div>
      <div className="small muted bold">Big promises to yourself</div>
      <h1>Resolutions</h1>
      <div className="card" style={{ marginTop: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, background: 'linear-gradient(135deg,#1e1b4b,#4c1d95)', color: '#fff', border: 0 }}>
        <button className="icon-btn" style={{ background: 'rgba(255,255,255,.12)', border: 0, color: '#fff' }} onClick={() => shift(-1)} aria-label="Previous year"><ChevronLeft size={20} /></button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={year} initial={{ opacity: 0, y: dir * 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: dir * -20 }} style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.03em' }}>{year}</motion.div>
          </AnimatePresence>
          <div className="small" style={{ opacity: 0.8 }}>{done} of {rows.length} achieved · <Counter value={pct} suffix="%" /></div>
        </div>
        <button className="icon-btn" style={{ background: 'rgba(255,255,255,.12)', border: 0, color: '#fff' }} onClick={() => shift(1)} aria-label="Next year"><ChevronRight size={20} /></button>
      </div>
      <QuickAdd placeholder={`New resolution for ${year}…`} onAdd={add} />
      <div className="section-label">{year}</div>
      {rows.length === 0 ? <Empty emoji="🎆" text={`No resolutions for ${year} yet.`} /> : (
        <motion.div key={year} className="card list">
          <AnimatePresence initial={false}>
            {rows.map((r) => (
              <motion.div key={r._id} className="item rise" exit={{ opacity: 0, x: -40 }} onClick={() => toggle(r)}>
                <Check done={r.done} color="#7c3aed" onToggle={() => toggle(r)} />
                <span style={{ fontSize: 20 }}>{r.emoji}</span>
                <div className={`title ${r.done ? 'done' : ''}`} style={{ flex: 1 }}>{r.title}</div>
                <button onClick={(e) => { e.stopPropagation(); remove(r); }} aria-label="Delete"><Trash2 size={16} color="currentColor" className="ic-4" /></button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
