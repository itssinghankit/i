import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Minus, Plus, Keyboard } from 'lucide-react';
import { buzz } from '../lib';
import { spring, soft } from './motion.js';

// Tick circle. Plain button + CSS transitions (cheap): colour fills in, the tick draws itself,
// and a ring bursts outwards when it becomes done. memo: only re-renders when its own props change.
export const Check = memo(function Check({ done, color = '#7c3aed', onToggle, size = 28 }) {
  const [burst, setBurst] = useState(0);
  return (
    <button
      className={`check ${done ? 'done' : ''}`}
      style={{ width: size, height: size, '--c': color }}
      onClick={(e) => { e.stopPropagation(); buzz(done ? 8 : 18); if (!done) setBurst((n) => n + 1); onToggle?.(); }}
      aria-label={done ? 'Mark as not done' : 'Mark as done'}
    >
      <svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      {burst > 0 && done && <span key={burst} className="check-burst" />}
    </button>
  );
});
