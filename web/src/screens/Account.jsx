import { useEffect, useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { LogOut, ShieldCheck, Smartphone, Globe, Info } from 'lucide-react';
import { api } from '../api';
import { Sheet } from '../ui';

// Account: who is signed in, where the data lives, app version, and Sign out (with a confirm step).
export default function Account({ open, onClose, user, onSignOut }) {
  const [confirm, setConfirm] = useState(false);
  const [health, setHealth] = useState(null);
  useEffect(() => { if (open) { setConfirm(false); api.get('/health').then(setHealth).catch(() => setHealth(null)); } }, [open]);

  const inApp = typeof window !== 'undefined' && !!window.Android;
  let appVersion = null;
  try { appVersion = window.Android?.appVersion?.() || null; } catch { /* old app */ }

  return (
    <Sheet open={open} onClose={onClose} title="Account">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '4px 0 18px' }}>
        {user?.picture
          ? <img src={user.picture} alt="" referrerPolicy="no-referrer" style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 0 0 4px #fff, 0 0 0 6px #ede9fe' }} />
          : <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'var(--grad)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 34, fontWeight: 800 }}>{user ? (user.name || '?')[0] : 'i'}</div>}
        <div className="bold" style={{ fontSize: 20, marginTop: 12 }}>{user ? user.name : 'Not signed in'}</div>
        <div className="small muted" style={{ marginTop: 2 }}>{user ? user.email : 'Sign-in is turned off on this server'}</div>
      </div>

      <div className="card list" style={{ boxShadow: 'none' }}>
        <Row icon={<ShieldCheck size={18} color="#16a34a" />} label="Signed in with" value={user ? 'Google' : '—'} />
        <Row icon={<Globe size={18} color="#6366f1" />} label="Your data" value={health?.store === 'mongodb' ? 'Private to this account (cloud)' : health ? 'This computer only (local)' : '…'} />
        <Row icon={<Smartphone size={18} color="#ec4899" />} label="App" value={inApp ? `Android ${appVersion ? 'v' + appVersion : ''}` : 'Website'} />
        <Row icon={<Info size={18} color="#9a98a8" />} label="Made by" value="itssinghankit" />
      </div>

      {onSignOut && (
        <AnimatePresence mode="wait" initial={false}>
          {!confirm ? (
            <motion.button key="out" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} whileTap={{ scale: 0.97 }}
              onClick={() => setConfirm(true)}
              style={{ marginTop: 18, width: '100%', height: 50, borderRadius: 16, background: '#fff1f2', color: '#e11d48', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <LogOut size={18} /> Log out
            </motion.button>
          ) : (
            <motion.div key="confirm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginTop: 18 }}>
              <div className="small muted" style={{ textAlign: 'center', marginBottom: 10 }}>Log out of this device? Your data stays safe in your account.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button className="ghost-btn" style={{ height: 48, fontSize: 15 }} onClick={() => setConfirm(false)}>Cancel</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => { onClose(); onSignOut(); }}
                  style={{ height: 48, borderRadius: 12, background: '#e11d48', color: '#fff', fontWeight: 700 }}>Log out</motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </Sheet>
  );
}

function Row({ icon, label, value }) {
  return (
    <div className="item" style={{ gap: 12 }}>
      <span style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--soft)', display: 'grid', placeItems: 'center', flex: 'none' }}>{icon}</span>
      <span className="small muted" style={{ flex: 1 }}>{label}</span>
      <span className="small bold" style={{ textAlign: 'right' }}>{value}</span>
    </div>
  );
}
