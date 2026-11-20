import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Minus, Plus, Keyboard } from 'lucide-react';
import { buzz } from '../lib';
import { spring, soft } from './motion.js';

// The app's logo: three rising bars, the tallest one is the "i", and its dot is a sparkle.
// "Grow a little every day." Same design as the Android icon and the browser-tab icon (web/public/icon.svg).
export function AppMark({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 108 108" aria-label="i logo" style={{ display: 'block', filter: 'drop-shadow(0 12px 28px rgba(76,29,149,.35))' }}>
      <defs>
        <linearGradient id="markBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3aed" /><stop offset=".55" stopColor="#ec4899" /><stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <rect width="108" height="108" rx="30" fill="url(#markBg)" />
      <rect x="32" y="62" width="11" height="17" rx="5.5" fill="#fff" fillOpacity=".45" />
      <rect x="47" y="53" width="11" height="26" rx="5.5" fill="#fff" fillOpacity=".7" />
      <rect x="62" y="45" width="12" height="34" rx="6" fill="#fff" />
      <path d="M68,21 Q68,31 78,31 Q68,31 68,41 Q68,31 58,31 Q68,31 68,21 Z" fill="#fff" />
    </svg>
  );
}
