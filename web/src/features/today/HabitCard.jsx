import { m as motion } from 'framer-motion';
import { Sprout, Check as CheckIcon } from 'lucide-react';
import { MoonBall } from '../../components';

// The two coloured cards at the top of Today (habit of the week, Becoming).
//   title  – first line (e.g. "🎬 Travel filmmaker"); empty → emptyText
//   lines  – "→ Editing · 1h" rows under it (at most 3 shown, then "+N more")
//   done / onCheck – the round tick in the corner (no onCheck = no tick, e.g. nothing to do today)
//   onOpen – tapping the rest of the card
export default function HabitCard({ kicker, gradient, title, lines = [], note, emptyText, done, onCheck, onOpen, tickColor = '#c026d3' }) {
  const shown = lines.slice(0, 3);
  return (
    <motion.div className="habit" style={{ background: gradient }} whileTap={{ scale: 0.97 }} onClick={onOpen}>
      <MoonBall />
      <div style={{ minWidth: 0 }}>
        <div className="kicker">{kicker}</div>
        <div className="h-title">{title || emptyText}</div>
        {shown.map((l, i) => (
          <div key={i} className="h-line">
            <span aria-hidden="true">→</span>
            <span className={`h-line-text ${l.done ? 'done' : ''}`}>{l.text}</span>
            {l.meta && <><span className="h-dot" aria-hidden="true">·</span><span className="h-line-meta">{l.meta}</span></>}
          </div>
        ))}
        {lines.length > shown.length && <div className="h-line" style={{ opacity: 0.8 }}>+{lines.length - shown.length} more</div>}
        {note && <div className="tiny" style={{ opacity: 0.85, marginTop: 6 }}>{note}</div>}
      </div>
      {title && onCheck && (
        <div className="between" style={{ marginTop: 10 }}>
          <span className="tiny bold" style={{ opacity: 0.9 }}>{done ? 'Done today' : 'Not yet'}</span>
          <motion.button className="h-check" aria-label={done ? 'Mark not done' : 'Mark done'}
            onClick={(e) => { e.stopPropagation(); onCheck(); }}
            animate={{ background: done ? '#fff' : 'rgba(255,255,255,.25)', scale: done ? [1, 1.25, 1] : 1 }} transition={{ duration: 0.35 }}>
            {done && <CheckIcon size={18} strokeWidth={3} color={tickColor} />}
          </motion.button>
        </div>
      )}
      {!title && <Sprout size={18} />}
    </motion.div>
  );
}
