import { useEffect, useState } from 'react';
import { m as motion } from 'framer-motion';
import App from './App.jsx';
import Login from '../features/account/LoginScreen.jsx';
import { api, auth } from '../lib';
import { AppMark } from '../components';

// Decides what to show: the sign-in screen or the app.
//   1. Ask the server whether sign-in is on (GET /auth/config).
//   2. Sign-in off (local demo)  → show the app.
//   3. Sign-in on + saved token → check it (GET /auth/me) → show the app.
//   4. Otherwise                → show the sign-in screen.
export default function AuthGate() {
  const [state, setState] = useState({ phase: 'loading' });

  const load = async () => {
    try {
      const cfg = await api.get('/auth/config');
      if (!cfg.required) return setState({ phase: 'app', user: null });
      if (!auth.get()) return setState({ phase: 'login', clientId: cfg.googleClientId });
      const user = await api.get('/auth/me');
      setState({ phase: 'app', user, clientId: cfg.googleClientId });
    } catch {
      const cfg = await api.get('/auth/config').catch(() => ({}));
      setState({ phase: 'login', clientId: cfg.googleClientId });
    }
  };

  useEffect(() => {
    load();
    const onOut = () => setState((s) => ({ phase: 'login', clientId: s.clientId }));
    window.addEventListener('i-signed-out', onOut);
    return () => window.removeEventListener('i-signed-out', onOut);
  }, []);

  const signOut = () => {
    auth.clear();
    try { window.google?.accounts?.id?.disableAutoSelect(); } catch { /* not loaded */ }
    window.Android?.googleSignOut?.();
    setState((s) => ({ phase: 'login', clientId: s.clientId }));
  };

  // The new screen replaces the old one at once and just fades in. Nothing waits for an
  // animation to finish, so the app never gets stuck if the device pauses animations.
  if (state.phase === 'loading') {
    return (
      <div className="frame" style={{ display: 'grid', placeItems: 'center' }}>
        <div className="pulse"><AppMark size={72} /></div>
      </div>
    );
  }
  if (state.phase === 'login') {
    return <Login clientId={state.clientId} onSignedIn={(user) => setState((s) => ({ phase: 'app', user, clientId: s.clientId }))} />;
  }
  return <App user={state.user} onSignOut={state.user ? signOut : null} />;
}

