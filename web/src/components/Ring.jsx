import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Minus, Plus, Keyboard } from 'lucide-react';
import { buzz } from '../lib';
import { spring, soft } from './motion.js';

// Progress ring with a rainbow gradient stroke. The arc grows with a CSS transition (no JS animation).
export const Ring = memo(function Ring({ percent, size = 92, stroke = 10, children, id = 'ring' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = c - (c * Math.min(percent, 100)) / 100;
  const [offset, setOffset] = useState(c); // start empty, then grow to the value
  useEffect(() => { const raf = requestAnimationFrame(() => setOffset(target)); return () => cancelAnimationFrame(raf); }, [target]);
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c3aed" /><stop offset="55%" stopColor="#ec4899" /><stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#efedf6" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={`url(#${id})`} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.16,1,.3,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div>
    </div>
  );
});
