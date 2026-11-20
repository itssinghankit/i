import React from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig, LazyMotion } from 'framer-motion';
import AuthGate from './app/AuthGate.jsx';
import './styles.css';
import { applyTheme } from './lib/theme.js';

// Light / dark before the first paint, so there's no white flash in dark mode.
applyTheme();

const loadMotion = () => import('./motionFeatures.js').catch(() => import('./motionFeatures.js')).then((r) => r.default);
// Start fetching the engine immediately, in parallel with the first screen.
loadMotion();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      {/* Animations use the light "m" components; the engine arrives a moment later (retries once). */}
      <LazyMotion features={loadMotion}>
        <AuthGate />
      </LazyMotion>
    </MotionConfig>
  </React.StrictMode>,
);
