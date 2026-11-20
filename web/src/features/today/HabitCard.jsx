import { memo, useEffect, useState, useCallback, useRef } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, ChartColumnBig, Plus, Trash2, Sprout, Check as CheckIcon } from 'lucide-react';
import { api, todayKey, addDays, fmt, mins, fromKey, toKey, buzz } from '../../lib';
import { Check, Ring, Counter, Segmented, Sheet, Empty, spring, soft } from '../../components';


export default function HabitCard({ kicker, gradient, habit, emptyText, onToggle, onOpen }) {
  return (
    <motion.div className="habit" style={{ background: gradient }} whileTap={{ scale: 0.97 }} onClick={habit ? onToggle : onOpen}>
      <div className="shine" />
      <div>
        <div className="kicker">{kicker}</div>
        <div className="h-title">{habit ? `${habit.emoji} ${habit.title}` : emptyText}</div>
        {habit?.sub && <div className="tiny" style={{ opacity: 0.85, marginTop: 4 }}>{habit.subPrefix || '→'} {habit.sub}</div>}
      </div>
      {habit && (
        <div className="between" style={{ marginTop: 10 }}>
          <span className="tiny bold" style={{ opacity: 0.9 }}>{habit.done ? 'Done today' : 'Not yet'}</span>
          <motion.div className="h-check" animate={{ background: habit.done ? '#fff' : 'rgba(255,255,255,.25)', scale: habit.done ? [1, 1.25, 1] : 1 }} transition={{ duration: 0.35 }}>
            {habit.done && <CheckIcon size={18} strokeWidth={3} color="#c026d3" />}
          </motion.div>
        </div>
      )}
      {!habit && onOpen && <Sprout size={18} />}
    </motion.div>
  );
}
