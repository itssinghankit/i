import { useEffect, useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Trash2, ArrowLeftRight, Star, Target } from 'lucide-react';
import { api, todayKey, buzz } from '../../lib';
import { Check, Ring, Counter, Segmented, Sheet, Empty, EMOJIS, soft, TimePicker, EmojiPicker } from '../../components';

import QuickAdd from './QuickAdd.jsx';

// ---------- Insights: what the app learned from your history ----------
export function Insights({ onChanged, toast, active }) {
  const [tips, setTips] = useState(null);
  const load = () => api.get('/insights').then(setTips);
  useEffect(() => { if (active) load(); }, [active]); // fresh tips every time you open Insights
  const graduate = async (id) => { await api.post(`/weeklyHabits/${id}/graduate`, { minutes: 10 }); toast?.('Added to your daily routine 🎓'); load(); onChanged?.(); };
  const tone = { good: 'linear-gradient(135deg,#ecfdf5,#f0fdf4)', warn: 'linear-gradient(135deg,#fff7ed,#fef2f2)' };
  return (
    <div>
      <div className="small muted bold">The app learns from you</div>
      <h1>Insights</h1>
      <p className="small muted" style={{ marginTop: 8 }}>Built from your last 14 days. It changes as you change.</p>
      <motion.div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        {tips?.map((t, i) => (
          <motion.div key={i} className="card rise" style={{ padding: 16, background: tone[t.tone] }}>
            <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
              <motion.div style={{ fontSize: 26 }} animate={{ rotate: [0, -10, 10, 0] }} transition={{ delay: 0.4 + i * 0.1, duration: 0.6 }}>{t.icon}</motion.div>
              <div style={{ flex: 1 }}>
                <div className="bold">{t.title}</div>
                <div className="small muted" style={{ marginTop: 4 }}>{t.body}</div>
                {t.action?.type === 'graduate' && (
                  <button className="ghost-btn" style={{ marginTop: 10, background: '#16151d', color: '#fff' }} onClick={() => graduate(t.action.id)}>Add to routine</button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
