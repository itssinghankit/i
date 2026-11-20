import { memo, useEffect, useState, useCallback, useRef } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, ChartColumnBig, Plus, Trash2, Sprout, Check as CheckIcon } from 'lucide-react';
import { api, todayKey, addDays, fmt, mins, fromKey, toKey, buzz } from '../../lib';
import { Check, Ring, Counter, Segmented, Sheet, Empty, spring, soft } from '../../components';


// Drag a row left to reveal delete.
export default function SwipeRow({ children, onDelete, idx = 0 }) {
  return (
    <motion.div className="rise" style={{ position: 'relative', borderTop: '1px solid var(--line)', '--i': idx }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#fff,#f43f5e)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 20, color: '#fff' }}>
        <Trash2 size={20} />
      </div>
      <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: 0.7, right: 0 }} style={{ position: 'relative' }}
        onDragEnd={(_, info) => { if (info.offset.x < -110) { buzz(25); onDelete(); } }}>
        {children}
      </motion.div>
    </motion.div>
  );
}
