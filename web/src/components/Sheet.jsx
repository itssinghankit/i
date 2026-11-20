import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Pencil, Minus, Plus, Keyboard } from 'lucide-react';
import { buzz } from '../lib';
import { spring, soft } from './motion.js';

// Bottom sheet that slides up and can be dragged down to close.
function focusFirst(el) {
  const input = el?.querySelector('[data-autofocus]');
  if (input && document.activeElement !== input) input.focus({ preventScroll: true });
}

// Once the sheet is in place, a text box that appears later (e.g. after tapping "Change habit")
// gets focus straight away. Returns a function that stops watching.
function watchNewInputs(el) {
  if (!el || typeof MutationObserver === 'undefined') return () => {};
  const seen = new Set(el.querySelectorAll('[data-autofocus]'));
  const mo = new MutationObserver(() => {
    const fresh = [...el.querySelectorAll('[data-autofocus]')].find((n) => !seen.has(n));
    el.querySelectorAll('[data-autofocus]').forEach((n) => seen.add(n));
    if (fresh) fresh.focus({ preventScroll: true });
  });
  mo.observe(el, { childList: true, subtree: true });
  return () => mo.disconnect();
}

export function Sheet({ open, onClose, children, title }) {
  const controls = useDragControls();
  const sheetRef = useRef(null);
  const stopWatching = useRef(() => {});
  useEffect(() => { if (!open) { stopWatching.current(); stopWatching.current = () => {}; } }, [open]);
  useEffect(() => () => stopWatching.current(), []);
  // Rendered into the app frame (not inside the scrolling screen) so it always sits above the tab bar.
  const host = typeof document !== 'undefined' && document.querySelector('.frame');
  const node = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim sheet-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={soft}
            // Slide up first, THEN focus the first text box (data-autofocus), so the keyboard opens after the sheet is in place.
            onAnimationComplete={(def) => {
              if (def?.y !== 0) return;
              focusFirst(sheetRef.current);
              stopWatching.current(); stopWatching.current = watchNewInputs(sheetRef.current);
            }}
            ref={sheetRef}
            drag="y" dragListener={false} dragControls={controls} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) onClose(); }}
          >
            {/* Drag down to close — only from this grab bar, so scrolling inside the sheet stays smooth */}
            <div className="grab-zone" onPointerDown={(e) => controls.start(e)}><div className="grab" /></div>
            {title && (
              <div className="between" style={{ marginBottom: 14 }}>
                <h2>{title}</h2>
                <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={onClose} aria-label="Close"><X size={18} /></button>
              </div>
            )}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
  return host ? createPortal(node, host) : node;
}

// Staggered list entrance.
