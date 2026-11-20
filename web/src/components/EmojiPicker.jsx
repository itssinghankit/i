import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Minus, Plus, Keyboard } from 'lucide-react';
import { buzz } from '../lib';
import { spring, soft } from './motion.js';
import { EMOJIS } from './palette.js';

// First "character as people see it" (keeps multi-part emoji like 👨‍👩‍👧 or 🧑‍💻 whole).
const firstGrapheme = (text) => {
  const t = (text || '').trim();
  if (!t) return '';
  try { return new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(t)[Symbol.iterator]().next().value?.segment || ''; }
  catch { return Array.from(t)[0] || ''; }
};

// Emoji chooser: quick picks + a keyboard tile that opens the phone keyboard for ANY emoji.
export function EmojiPicker({ value, onChange, options = EMOJIS }) {
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const custom = value && !options.includes(value);
  const pick = (e) => { buzz(6); onChange(e); };
  const accept = (text) => { const e = firstGrapheme(text); if (e) { pick(e); setTyping(false); setDraft(''); } };
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 6 }}>
        {options.map((e) => <button type="button" key={e} className={`emoji-pick ${value === e ? 'on' : ''}`} onClick={() => pick(e)}>{e}</button>)}
        {custom && <button type="button" className="emoji-pick on" onClick={() => setTyping(true)}>{value}</button>}
        <button type="button" className={`emoji-pick ${typing ? 'on' : ''}`} onClick={() => setTyping((v) => !v)} aria-label="Use any emoji from the keyboard"
          style={{ color: 'var(--violet)' }}><Keyboard size={18} /></button>
      </div>
      <AnimatePresence initial={false}>
        {typing && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <input className="input" autoFocus value={draft} placeholder="Tap the 😊 key on your keyboard…"
                onChange={(e) => { setDraft(e.target.value); accept(e.target.value); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); accept(draft); } }}
                style={{ fontSize: 20 }} />
              <button type="button" className="icon-btn" style={{ width: 50, height: 50, borderRadius: 14, flex: 'none' }} onClick={() => { setTyping(false); setDraft(''); }} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="tiny faint" style={{ marginTop: 6 }}>Any emoji works. The first one you type is used.</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
