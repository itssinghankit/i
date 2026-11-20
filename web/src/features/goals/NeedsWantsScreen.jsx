import { useEffect, useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Trash2, ArrowLeftRight, Star, Target } from 'lucide-react';
import { api, todayKey, buzz } from '../../lib';
import { Check, Ring, Counter, Segmented, Sheet, Empty, EMOJIS, soft, TimePicker, EmojiPicker } from '../../components';

import QuickAdd from './QuickAdd.jsx';

// ---------- Needs vs Wants ----------
export function NeedsWants() {
  const [type, setType] = useState('need');
  const [rows, setRows] = useState([]);
  const [adding, setAdding] = useState(false);
  const load = () => api.get('/needsWants').then(setRows);
  useEffect(() => { load(); }, []);
  const list = rows.filter((r) => r.type === type);
  const total = (t) => rows.filter((r) => r.type === t && !r.done).reduce((s, r) => s + (Number(r.price) || 0), 0);
  const money = (n) => `₹${n.toLocaleString('en-IN')}`;
  const patch = (r, p) => { setRows((x) => x.map((y) => (y._id === r._id ? { ...y, ...p } : y))); api.patch(`/needsWants/${r._id}`, p); };
  const remove = (r) => { setRows((x) => x.filter((y) => y._id !== r._id)); api.del(`/needsWants/${r._id}`); };
  const needT = total('need'), wantT = total('want');

  return (
    <div>
      <div className="small muted bold">Spend on purpose</div>
      <div className="between"><h1>Needs vs Wants</h1>
        <motion.button whileTap={{ scale: 0.88 }} className="icon-btn" style={{ width: 46, height: 46, background: 'var(--grad)', color: '#fff', border: 0 }} onClick={() => setAdding(true)} aria-label="Add"><Plus size={22} /></motion.button>
      </div>
      {/* Split bar shows how the open money is divided */}
      <div className="card" style={{ padding: 16, marginTop: 14 }}>
        <div className="between small bold"><span style={{ color: '#0ea5e9' }}>Needs {money(needT)}</span><span style={{ color: '#ec4899' }}>Wants {money(wantT)}</span></div>
        <div style={{ display: 'flex', height: 12, borderRadius: 9, overflow: 'hidden', marginTop: 10, background: 'var(--soft)' }}>
          <motion.div style={{ background: 'var(--grad-cool)' }} animate={{ flexGrow: needT || 1 }} transition={soft} />
          <motion.div style={{ background: 'linear-gradient(135deg,#ec4899,#f97316)' }} animate={{ flexGrow: wantT || 1 }} transition={soft} />
        </div>
        <div className="tiny faint" style={{ marginTop: 8 }}>Rule of thumb: cover every need before the first want. Wait 30 days before buying a want.</div>
      </div>
      <div style={{ marginTop: 16 }}>
        <Segmented layoutId="nwSeg" value={type} onChange={setType} options={[
          { value: 'need', label: 'Needs', count: rows.filter((r) => r.type === 'need' && !r.done).length },
          { value: 'want', label: 'Wants', count: rows.filter((r) => r.type === 'want' && !r.done).length },
        ]} />
      </div>
      <div className="section-label">{type === 'need' ? 'Must have' : 'Nice to have'}</div>
      {list.length === 0 ? <Empty emoji={type === 'need' ? '🧺' : '🛍️'} text="Nothing here yet." /> : (
        <motion.div key={type} className="card list">
          <AnimatePresence initial={false}>
            {list.map((r) => (
              <motion.div key={r._id} className="item rise" exit={{ opacity: 0, x: type === 'need' ? 60 : -60 }}>
                <Check done={r.done} color={type === 'need' ? '#0ea5e9' : '#ec4899'} onToggle={() => patch(r, { done: !r.done })} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={`title ${r.done ? 'done' : ''}`}>{r.title}</div>
                  <div className="meta">{r.price ? money(Number(r.price)) : ''}{r.note ? ` · ${r.note}` : ''}</div>
                </div>
                <button title={`Move to ${type === 'need' ? 'wants' : 'needs'}`} onClick={() => patch(r, { type: type === 'need' ? 'want' : 'need' })}><ArrowLeftRight size={16} color="currentColor" className="ic-3" /></button>
                <button onClick={() => remove(r)} aria-label="Delete"><Trash2 size={16} color="currentColor" className="ic-4" /></button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      <AddNeedWant open={adding} type={type} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />
    </div>
  );
}

function AddNeedWant({ open, type, onClose, onSaved }) {
  const [f, setF] = useState({ title: '', price: '', note: '', type });
  useEffect(() => { if (open) setF({ title: '', price: '', note: '', type }); }, [open]);
  const save = async () => { if (!f.title.trim()) return; await api.post('/needsWants', { ...f, price: Number(f.price) || 0, done: false }); onSaved(); };
  return (
    <Sheet open={open} onClose={onClose} title="Add item">
      <Segmented layoutId="nwAddSeg" value={f.type} onChange={(t) => setF({ ...f, type: t })} options={[{ value: 'need', label: 'Need' }, { value: 'want', label: 'Want' }]} />
      <label className="field-label">What is it?</label>
      <input className="input" autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. New laptop" />
      <label className="field-label">Rough cost (₹)</label>
      <input className="input" inputMode="numeric" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/\D/g, '') })} placeholder="0" />
      <label className="field-label">Why / note</label>
      <input className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Optional" />
      <motion.button whileTap={{ scale: 0.97 }} className="primary-btn" style={{ marginTop: 20 }} onClick={save}>Save</motion.button>
    </Sheet>
  );
}
