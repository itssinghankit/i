import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Minus, Plus, Keyboard } from 'lucide-react';
import { buzz } from '../lib';
import { spring, soft } from './motion.js';

// Segmented control with a sliding white pill (like "My tasks | Team").
export function Segmented({ options, value, onChange, layoutId }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? 'on' : ''} onClick={() => { buzz(6); onChange(o.value); }}>
          {value === o.value && <motion.span layoutId={layoutId} className="seg-pill" transition={spring} />}
          {o.label}{o.count != null && <span className="count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
