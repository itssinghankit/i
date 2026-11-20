import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Pencil, Minus, Plus, Keyboard } from 'lucide-react';
import { buzz } from '../lib';
import { spring, soft } from './motion.js';

// Bottom sheet that slides up and can be dragged down to close.
export function Sheet({ open, onClose, children, title }) {
  const controls = useDragControls();
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
