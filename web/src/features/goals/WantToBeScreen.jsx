import { useEffect, useState } from 'react';
import { m as motion } from 'framer-motion';
import { Plus, Trash2, Star, Target, Pencil } from 'lucide-react';
import { api, keepIfSame, todayKey, buzz, mins, clockTime } from '../../lib';
import { Sheet, Empty, MUSIC, EmojiPicker, MoonBall } from '../../components';

// ---------- Who I want to be ----------
// Each Becoming (e.g. "Travel filmmaker") is a category of routine habits (Editing, Shooting…).
// The active one shows on Today; ticking it there ticks all its habits for the day.
export function WantToBe({ onChanged, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [routine, setRoutine] = useState([]);
  const [editing, setEditing] = useState(null); // {} = new, a row = edit
  const load = () => Promise.all([api.get('/wantToBe'), api.get('/routine')]).then(([w, r]) => {
    keepIfSame(setRows)(w.sort((a, b) => a.byYear - b.byYear));
    keepIfSame(setRoutine)(r);
  });
  useEffect(() => { load(); }, [refreshKey]);
  const activate = async (r) => { buzz(20); setRows((x) => x.map((y) => ({ ...y, active: y._id === r._id }))); await api.post(`/wantToBe/${r._id}/activate`); onChanged?.(); };
  const remove = async (r) => { await api.del(`/wantToBe/${r._id}`); load(); onChanged?.(); };
  const grads = ['linear-gradient(140deg,#f97316,#f43f5e)', 'linear-gradient(140deg,#6366f1,#06b6d4)', 'linear-gradient(140deg,#10b981,#65a30d)', 'linear-gradient(140deg,#a855f7,#ec4899)'];
  const y = Number(todayKey().slice(0, 4));

  return (
    <div>
      <div className="small muted bold">Future me</div>
      <div className="between"><h1>Who I want to be</h1>
        <motion.button whileTap={{ scale: 0.88 }} className="icon-btn" style={{ width: 46, height: 46, background: 'var(--grad)', color: '#fff', border: 0 }} onClick={() => setEditing({})} aria-label="Add"><Plus size={22} /></motion.button>
      </div>
      <p className="small muted" style={{ marginTop: 8 }}>Each one groups the routine habits that get you there. The <b>active</b> one shows on Today; ticking it ticks all its habits.</p>
      {rows.length === 0 && <Empty emoji="🌟" text="Add who you want to become." />}
      <motion.div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
        {rows.map((r, i) => {
          const habits = routine.filter((x) => x.wantToBeId === r._id);
          const total = habits.reduce((s, h) => s + (Number(h.minutes) || 0), 0);
          return (
            <motion.div key={r._id} className="habit rise" style={{ background: grads[i % grads.length], minHeight: 0, outline: r.active ? '3px solid var(--ink)' : 'none', outlineOffset: 3 }}>
              <MoonBall />
              <div className="between" style={{ alignItems: 'flex-start' }}>
                <div>
                  <div className="kicker">By {r.byYear} · {r.byYear - y <= 0 ? 'this year' : `${r.byYear - y} yr${r.byYear - y > 1 ? 's' : ''} to go`}</div>
                  <div className="h-title" style={{ fontSize: 19 }}>{r.emoji} {r.title}</div>
                </div>
                <div className="row" style={{ gap: 14 }}>
                  <button onClick={() => setEditing(r)} aria-label="Edit" style={{ opacity: 0.9 }}><Pencil size={16} color="#fff" /></button>
                  <button onClick={() => remove(r)} aria-label="Delete" style={{ opacity: 0.8 }}><Trash2 size={16} color="#fff" /></button>
                </div>
              </div>
              <button onClick={() => setEditing(r)} style={{ background: 'rgba(255,255,255,.18)', borderRadius: 14, padding: '10px 12px', marginTop: 12, textAlign: 'left', color: '#fff', width: '100%' }}>
                <div className="tiny" style={{ opacity: 0.85 }}>{habits.length ? `Routine habits · ${mins(total)} a day` : 'Routine habits'}</div>
                {habits.length ? habits.map((h) => (
                  <div key={h._id} className="h-line" style={{ fontSize: 14 }}>
                    <span aria-hidden="true">→</span><span className="h-line-text">{h.emoji} {h.title}</span>
                    <span className="h-dot" aria-hidden="true">·</span><span className="h-line-meta">{h.time ? `${clockTime(h.time)}, ` : ''}{mins(h.minutes)}</span>
                  </div>
                )) : (
                  <div className="bold" style={{ marginTop: 4 }}>{r.habit ? `${r.habit}${r.minutes ? ` · ${r.minutes}m` : ''} (old, not linked)` : '+ Pick habits from your routine'}</div>
                )}
              </button>
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => !r.active && activate(r)}
                style={{ marginTop: 12, height: 40, borderRadius: 12, background: r.active ? '#fff' : 'rgba(255,255,255,.22)', color: r.active ? '#16151d' : '#fff', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {r.active ? <><Star size={16} fill="#f59e0b" color="#f59e0b" /> Showing on Today</> : <><Target size={16} /> Show this on Today</>}
              </motion.button>
            </motion.div>
          );
        })}
      </motion.div>
      <EditWantToBe row={editing} routine={routine} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); onChanged?.(); }} />
    </div>
  );
}

// Add or edit a Becoming: name, by which year, icon, and which routine habits belong to it.
function EditWantToBe({ row, routine, onClose, onSaved }) {
  const y = Number(todayKey().slice(0, 4));
  const isNew = !row?._id;
  const [f, setF] = useState({ title: '', byYear: y + 1, emoji: '🌟' });
  const [ids, setIds] = useState([]);
  useEffect(() => {
    if (!row) return;
    setF({ title: row.title || '', byYear: row.byYear || y + 1, emoji: row.emoji || '🌟' });
    setIds(row._id ? routine.filter((x) => x.wantToBeId === row._id).map((x) => x._id) : []);
  }, [row]);
  const toggle = (id) => setIds((x) => (x.includes(id) ? x.filter((i) => i !== id) : [...x, id]));
  const save = async () => {
    if (!f.title.trim()) return;
    const saved = isNew ? await api.post('/wantToBe', { ...f, title: f.title.trim() }) : await api.patch(`/wantToBe/${row._id}`, { ...f, title: f.title.trim() });
    await api.put(`/wantToBe/${saved._id}/habits`, { ids });
    buzz(20); onSaved();
  };
  const on = { background: 'var(--tint)', color: 'var(--violet)', boxShadow: 'inset 0 0 0 1.5px var(--violet-2)' };
  return (
    <Sheet open={!!row} onClose={onClose} title={isNew ? 'I want to be…' : 'Edit'}>
      <label className="field-label">Who do you want to become?</label>
      {/* No autofocus when editing, so the keyboard doesn't jump up over the habit list */}
      <input className="input" {...(isNew ? { 'data-autofocus': true } : {})} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Travel filmmaker" />
      <label className="field-label">Routine habits that get you there</label>
      {routine.length === 0 ? <div className="tiny faint">Add habits in the Routine tab first.</div> : (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {routine.map((r) => {
            const other = r.wantToBeId && row?._id !== r.wantToBeId && !ids.includes(r._id);
            return (
              <button key={r._id} className="ghost-btn" style={ids.includes(r._id) ? on : other ? { opacity: 0.55 } : undefined} onClick={() => toggle(r._id)}>
                {r.emoji} {r.title} · {mins(r.minutes)}
              </button>
            );
          })}
        </div>
      )}
      <div className="tiny faint" style={{ marginTop: 6 }}>A habit belongs to one at a time. Faded ones are in another; picking moves them here.</div>
      <label className="field-label">By the year</label>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        {[1, 2, 3, 5, 10].map((n) => (
          <button key={n} className="ghost-btn" style={f.byYear === y + n ? on : undefined} onClick={() => setF({ ...f, byYear: y + n })}>{y + n}</button>
        ))}
      </div>
      <label className="field-label">Icon</label>
      <EmojiPicker value={f.emoji} onChange={(e) => setF((x) => ({ ...x, emoji: e }))} options={['🌟', '🎬', '✈️', '💪', '✍️', '💰', '🧘', '🎨', '🧑‍🍳', '🌍', '🎤', '🧑‍💻', '📖', '❤️', '🏆', '🎹', '🚀', ...MUSIC.slice(0, 6)]} />
      <motion.button whileTap={{ scale: 0.97 }} className="primary-btn" style={{ marginTop: 20 }} onClick={save}>Save</motion.button>
    </Sheet>
  );
}
