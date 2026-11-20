import { useEffect, useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Trash2, ArrowLeftRight, Star, Target } from 'lucide-react';
import { api, todayKey, buzz } from '../../lib';
import { Check, Ring, Counter, Segmented, Sheet, Empty, EMOJIS, soft, TimePicker, EmojiPicker } from '../../components';


// A quick "type and press enter" row used by several lists.
export default function QuickAdd({ placeholder, onAdd }) {
  const [v, setV] = useState('');
  const submit = (e) => { e.preventDefault(); if (!v.trim()) return; onAdd(v.trim()); setV(''); buzz(15); };
  return (
    <form onSubmit={submit} className="row" style={{ gap: 8, marginTop: 14 }}>
      <input className="input" placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} />
      <motion.button whileTap={{ scale: 0.88 }} className="icon-btn" style={{ width: 50, height: 50, borderRadius: 14, background: 'var(--grad)', color: '#fff', border: 0, flex: 'none' }} aria-label="Add"><Plus size={22} /></motion.button>
    </form>
  );
}
