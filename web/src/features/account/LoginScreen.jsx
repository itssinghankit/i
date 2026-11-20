import { useEffect, useRef, useState } from 'react';
import { m as motion } from 'framer-motion';
import { api, auth, applyTheme } from '../../lib';
import { AppMark } from '../../components';

// Sign-in screen.
// - In a normal browser: Google's own "Sign in with Google" button (Google Identity Services).
// - Inside the Android app: Google blocks sign-in inside web views, so the button asks the
//   Android side (window.Android.googleSignIn) to show the phone's native Google account sheet.
// Both give us a Google ID token, which the server checks and swaps for our own login token.
export default function Login({ clientId, onSignedIn }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const btnRef = useRef(null);
  const native = typeof window !== 'undefined' && !!window.Android?.googleSignIn;

  const finish = async (credential) => {
    setBusy(true); setError('');
    try {
      const { token, user } = await api.post('/auth/google', { credential });
      auth.set(token);
      onSignedIn(user);
    } catch (e) {
      setError(e.message || 'Sign-in failed. Please try again.');
    } finally { setBusy(false); }
  };

  // Dark sign-in screen → white status bar icons (Android app only). The main app switches them back.
  useEffect(() => { window.Android?.setLightBars?.(false); return () => applyTheme(); }, []);

  useEffect(() => {
    // Android hands the Google token back through these two functions.
    window.onNativeGoogleCredential = (credential) => finish(credential);
    window.onNativeGoogleError = (msg) => { setBusy(false); if (msg) setError(msg); };
    if (native || !clientId) return undefined;

    // Load Google's sign-in script once, then draw its button.
    const draw = () => {
      window.google.accounts.id.initialize({ client_id: clientId, callback: (r) => finish(r.credential), ux_mode: 'popup' });
      window.google.accounts.id.renderButton(btnRef.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 300 });
    };
    if (window.google?.accounts?.id) { draw(); return undefined; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = draw;
    s.onerror = () => setError('Could not load Google sign-in. Check your internet connection.');
    document.head.appendChild(s);
    return undefined;
  }, [clientId]);

  return (
    <div className="frame login">
      <div className="login-bg" />
      <div className="login-orb a" />
      <div className="login-orb b" />

      <div className="login-body">
        <motion.div initial={{ scale: 0.5, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }}>
          <AppMark size={104} />
        </motion.div>
        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="login-tag" style={{ marginTop: 26 }}>
          Grow 1% every day.<br />Your routine, habits and goals in one place.
        </motion.p>

        <motion.div className="login-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, type: 'spring', stiffness: 200, damping: 22 }}>
          {native ? (
            <motion.button whileTap={{ scale: 0.97 }} className="google-btn" disabled={busy}
              onClick={() => { setBusy(true); setError(''); window.Android.googleSignIn(); }}>
              <GoogleG /> {busy ? 'Signing in…' : 'Continue with Google'}
            </motion.button>
          ) : clientId ? (
            <div style={{ display: 'flex', justifyContent: 'center', minHeight: 44, opacity: busy ? 0.5 : 1 }} ref={btnRef} />
          ) : (
            <div className="small muted">Sign-in isn’t set up on this server yet.</div>
          )}
          {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="small" style={{ color: '#e11d48', marginTop: 12, textAlign: 'center' }}>{error}</motion.div>}
          <div className="tiny faint" style={{ marginTop: 14, textAlign: 'center' }}>Each Google account has its own private data.</div>
        </motion.div>
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
