import { useEffect, useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Trash2, ArrowLeftRight, Star, Target } from 'lucide-react';
import { api, todayKey, buzz } from '../api';
import { Check, Ring, Counter, Segmented, Sheet, Empty, listParent, listChild, EMOJIS, soft, TimePicker } from '../ui';

// A quick "type and press enter" row used by several lists.
function QuickAdd({ placeholder, onAdd }) {
  const [v, setV] = useState('');
  const submit = (e) => { e.preventDefault(); if (!v.trim()) return; onAdd(v.trim()); setV(''); buzz(15); };
  return (
    <form onSubmit={submit} className="row" style={{ gap: 8, marginTop: 14 }}>
      <input className="input" placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} />
      <motion.button whileTap={{ scale: 0.88 }} className="icon-btn" style={{ width: 50, height: 50, borderRadius: 14, background: 'var(--grad)', color: '#fff', border: 0, flex: 'none' }} aria-label="Add"><Plus size={22} /></motion.button>
    </form>
  );
}

// ---------- Resolutions per year ----------
export function Resolutions() {
  const [year, setYear] = useState(Number(todayKey().slice(0, 4)));
  const [rows, setRows] = useState([]);
  const [dir, setDir] = useState(0);
  const load = () => api.get(`/resolutions?year=${year}`).then(setRows);
  useEffect(() => { load(); }, [year]);
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
        <motion.div key={year} className="card list" variants={listParent} initial="hidden" animate="show">
          <AnimatePresence initial={false}>
            {rows.map((r) => (
              <motion.div key={r._id} className="item" variants={listChild} exit={{ opacity: 0, x: -40 }} onClick={() => toggle(r)}>
                <Check done={r.done} color="#7c3aed" onToggle={() => toggle(r)} />
                <span style={{ fontSize: 20 }}>{r.emoji}</span>
                <div className={`title ${r.done ? 'done' : ''}`} style={{ flex: 1 }}>{r.title}</div>
                <button onClick={(e) => { e.stopPropagation(); remove(r); }} aria-label="Delete"><Trash2 size={16} color="#c4c2d0" /></button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

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
        <motion.div key={type} className="card list" variants={listParent} initial="hidden" animate="show">
          <AnimatePresence initial={false}>
            {list.map((r) => (
              <motion.div key={r._id} className="item" variants={listChild} exit={{ opacity: 0, x: type === 'need' ? 60 : -60 }}>
                <Check done={r.done} color={type === 'need' ? '#0ea5e9' : '#ec4899'} onToggle={() => patch(r, { done: !r.done })} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={`title ${r.done ? 'done' : ''}`}>{r.title}</div>
                  <div className="meta">{r.price ? money(Number(r.price)) : ''}{r.note ? ` · ${r.note}` : ''}</div>
                </div>
                <button title={`Move to ${type === 'need' ? 'wants' : 'needs'}`} onClick={() => patch(r, { type: type === 'need' ? 'want' : 'need' })}><ArrowLeftRight size={16} color="#a5a3b3" /></button>
                <button onClick={() => remove(r)} aria-label="Delete"><Trash2 size={16} color="#c4c2d0" /></button>
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

// ---------- Who I want to be (+ the daily habit that gets me there) ----------
export function WantToBe({ onChanged }) {
  const [rows, setRows] = useState([]);
  const [adding, setAdding] = useState(false);
  const load = () => api.get('/wantToBe').then((r) => setRows(r.sort((a, b) => a.byYear - b.byYear)));
  useEffect(() => { load(); }, []);
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
      <motion.div variants={listParent} initial="hidden" animate="show" style={{ display: 'grid', gap: 12, marginTop: 10 }}>
        {rows.map((r, i) => (
          <motion.div key={r._id} variants={listChild} className="habit" style={{ background: grads[i % grads.length], minHeight: 0, outline: r.active ? '3px solid #16151d' : 'none', outlineOffset: 3 }}>
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
          <button key={n} className="ghost-btn" style={f.byYear === y + n ? { background: '#ede9fe', color: 'var(--violet)' } : undefined} onClick={() => setF({ ...f, byYear: y + n })}>{y + n}</button>
        ))}
      </div>
      <label className="field-label">Icon</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 6 }}>
        {['🌟', '💪', '✍️', '💰', '🧘', '🎨', '🧑‍🍳', '🌍', '🎤', '🧑‍💻', '📖', '❤️', '🏆', '🎹', '🗣️', '🚀'].map((e) => (
          <button key={e} className={`emoji-pick ${f.emoji === e ? 'on' : ''}`} onClick={() => setF({ ...f, emoji: e })}>{e}</button>
        ))}
      </div>
      <motion.button whileTap={{ scale: 0.97 }} className="primary-btn" style={{ marginTop: 20 }} onClick={save}>Save</motion.button>
    </Sheet>
  );
}

// ---------- Insights: what the app learned from your history ----------
export function Insights({ onChanged, toast }) {
  const [tips, setTips] = useState(null);
  const load = () => api.get('/insights').then(setTips);
  useEffect(() => { load(); }, []);
  const graduate = async (id) => { await api.post(`/weeklyHabits/${id}/graduate`, { minutes: 10 }); toast?.('Added to your daily routine 🎓'); load(); onChanged?.(); };
  const tone = { good: 'linear-gradient(135deg,#ecfdf5,#f0fdf4)', warn: 'linear-gradient(135deg,#fff7ed,#fef2f2)' };
  return (
    <div>
      <div className="small muted bold">The app learns from you</div>
      <h1>Insights</h1>
      <p className="small muted" style={{ marginTop: 8 }}>Built from your last 14 days. It changes as you change.</p>
      <motion.div variants={listParent} initial="hidden" animate="show" style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        {tips?.map((t, i) => (
          <motion.div key={i} variants={listChild} className="card" style={{ padding: 16, background: tone[t.tone] }}>
            <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
              <motion.div style={{ fontSize: 26 }} animate={{ rotate: [0, -10, 10, 0] }} transition={{ delay: 0.4 + i * 0.1, duration: 0.6 }}>{t.icon}</motion.div>
              <div style={{ flex: 1 }}>
                <div className="bold">{t.title}</div>
                <div className="small muted" style={{ marginTop: 4 }}>{t.body}</div>
                {t.action?.type === 'graduate' && (
                  <button className="ghost-btn" style={{ marginTop: 10, background: '#16151d', color: '#fff' }} onClick={() => graduate(t.action.id)}>Add to routine</button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
