import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig, LazyMotion, m as motion } from 'framer-motion';
import App from './App';
import Login from './screens/Login';
import { api, auth } from './api';
import { AppMark } from './ui';
import './styles.css';

const loadMotion = () => import('./motionFeatures.js').catch(() => import('./motionFeatures.js')).then((r) => r.default);
// Start fetching the engine immediately, in parallel with the first screen.
loadMotion();

// Decides what to show: the sign-in screen or the app.
//   1. Ask the server whether sign-in is on (GET /auth/config).
//   2. Sign-in off (local demo)  → show the app.
//   3. Sign-in on + saved token → check it (GET /auth/me) → show the app.
//   4. Otherwise                → show the sign-in screen.
function Gate() {
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

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      {/* Animations use the light "m" components; the engine arrives a moment later (retries once). */}
      <LazyMotion features={loadMotion}>
        <Gate />
      </LazyMotion>
    </MotionConfig>
  </React.StrictMode>,
);
