import { memo, useEffect, useState, useCallback, useRef } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, ChartColumnBig, Plus, Trash2, Sprout, Check as CheckIcon } from 'lucide-react';
import { api, todayKey, addDays, fmt, mins, fromKey, toKey, buzz } from '../../lib';
import { Check, Ring, Counter, Segmented, Sheet, Empty, spring, soft } from '../../components';


// ---------- Calendar sheet: jump to any date. Days are tinted by how much of the routine was done. ----------
export default function CalendarSheet({ open, onClose, value, onPick }) {
  const [month, setMonth] = useState(() => value.slice(0, 7));
  const [stats, setStats] = useState({});
  useEffect(() => { if (open) setMonth(value.slice(0, 7)); }, [open]);
  const first = fromKey(`${month}-01`);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  useEffect(() => {
    if (!open) return;
    api.get(`/range?from=${toKey(first)}&to=${toKey(last)}`).then((rows) => setStats(Object.fromEntries(rows.map((r) => [r.date, r.percent]))));
  }, [open, month]);
  const shift = (n) => { const d = new Date(first.getFullYear(), first.getMonth() + n, 1); setMonth(toKey(d).slice(0, 7)); };
  const lead = (first.getDay() + 6) % 7;
  const cells = [...Array(lead).fill(null), ...Array.from({ length: last.getDate() }, (_, i) => toKey(new Date(first.getFullYear(), first.getMonth(), i + 1)))];
  const t = todayKey();
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="between" style={{ marginBottom: 14 }}>
        <h2>{first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h2>
        <div className="row" style={{ gap: 6 }}>
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, textAlign: 'center' }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="tiny faint bold">{d}</div>)}
        <>
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} />;
            const p = stats[d];
            const sel = d === value;
            return (
              <button key={d} className="pop" onClick={() => onPick(d)}
                style={{
                  '--i': i, aspectRatio: '1', borderRadius: 14, fontWeight: 700, fontSize: 14, position: 'relative',
                  background: sel ? 'var(--grad)' : p != null ? `rgba(124,58,237,${0.06 + (p / 100) * 0.45})` : 'var(--soft)',
                  color: sel ? '#fff' : p > 60 ? '#3b0f80' : 'var(--ink)',
                  outline: d === t && !sel ? '2px solid var(--violet)' : 'none',
                }}>
                {Number(d.slice(8))}
              </button>
            );
          })}
        </>
      </div>
      <div className="row tiny faint" style={{ justifyContent: 'center', marginTop: 14, gap: 6 }}>
        Less {[0.08, 0.2, 0.35, 0.5].map((a) => <span key={a} style={{ width: 14, height: 14, borderRadius: 4, background: `rgba(124,58,237,${a})` }} />)} More done
      </div>
    </Sheet>
  );
}
