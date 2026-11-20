import { useEffect, useRef } from 'react';

// The big soft circle on the habit cards, acting like a ball on the moon.
// Tilt the phone and it slowly "falls" toward the lower side (right side up → it drifts left),
// bouncing softly off the card's edges. Hold the phone still and it floats back near its
// usual spot (top-right) and just drifts a little there.
//
// How: the phone's tilt (deviceorientation: gamma = left/right, beta = forward/back) is compared
// with a slowly-following "resting" tilt, so only a change in tilt pushes the ball, not the way you
// normally hold the phone. One shared animation loop moves every ball; it only runs while a ball
// is on screen and the app is visible. Turned off when the phone asks for reduced motion.

const MOON_G = 420;      // px/s² at a 90° tilt (soft, floaty)
const HOME_PULL = 2.2;   // spring back toward the usual spot when the phone is still
const DRAG = 0.9;        // how fast speed fades (per second)
const BOUNCE = 0.55;     // speed kept after hitting an edge
const REST_FOLLOW = 3.5; // seconds for the "resting" tilt to catch up with how you hold the phone
const SIZE = 140;        // ball size (matches .habit .shine)

const tilt = { gamma: 0, beta: 0, baseGamma: null, baseBeta: null };
const balls = new Set();
let raf = 0, last = 0, listening = false;

function onOrientation(e) {
  if (e.gamma == null || e.beta == null) return;
  tilt.gamma = e.gamma; tilt.beta = e.beta;
  if (tilt.baseGamma == null) { tilt.baseGamma = e.gamma; tilt.baseBeta = e.beta; }
}

const rad = (deg) => (Math.max(-60, Math.min(60, deg)) * Math.PI) / 180;

function frame(now) {
  const dt = Math.min(0.05, (now - (last || now)) / 1000);
  last = now;
  // The resting tilt slowly follows the real one.
  if (tilt.baseGamma != null) {
    const k = Math.min(1, dt / REST_FOLLOW);
    tilt.baseGamma += (tilt.gamma - tilt.baseGamma) * k;
    tilt.baseBeta += (tilt.beta - tilt.baseBeta) * k;
  }
  const gx = tilt.baseGamma == null ? 0 : MOON_G * Math.sin(rad(tilt.gamma - tilt.baseGamma));
  const gy = tilt.baseBeta == null ? 0 : MOON_G * Math.sin(rad(tilt.beta - tilt.baseBeta));
  const t = now / 1000;
  let anyVisible = false;
  for (const b of balls) {
    if (!b.visible || !b.w) continue;
    anyVisible = true;
    // Home: the usual top-right spot, drifting a little.
    const hx = b.w - 30 + 7 * Math.sin(t * 0.6 + b.phase);
    const hy = 20 + 6 * Math.cos(t * 0.8 + b.phase);
    b.vx += (gx + (hx - b.x) * HOME_PULL) * dt;
    b.vy += (gy + (hy - b.y) * HOME_PULL) * dt;
    const keep = Math.exp(-DRAG * dt);
    b.vx *= keep; b.vy *= keep;
    b.x += b.vx * dt; b.y += b.vy * dt;
    // Edges: the ball's centre stays inside the card (part of it is cut off by the card's edge).
    const minX = 20, maxX = b.w - 20, minY = 10, maxY = b.h - 10;
    if (b.x < minX) { b.x = minX; b.vx = Math.abs(b.vx) * BOUNCE; }
    if (b.x > maxX) { b.x = maxX; b.vx = -Math.abs(b.vx) * BOUNCE; }
    if (b.y < minY) { b.y = minY; b.vy = Math.abs(b.vy) * BOUNCE; }
    if (b.y > maxY) { b.y = maxY; b.vy = -Math.abs(b.vy) * BOUNCE; }
    b.el.style.transform = `translate3d(${(b.x - SIZE / 2).toFixed(1)}px, ${(b.y - SIZE / 2).toFixed(1)}px, 0)`;
  }
  raf = anyVisible && !document.hidden ? requestAnimationFrame(frame) : 0;
}

function wake() {
  if (!raf && !document.hidden && [...balls].some((b) => b.visible)) { last = 0; raf = requestAnimationFrame(frame); }
}

export function MoonBall() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const card = el?.parentElement;
    if (!el || !card) return undefined;
    const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const b = { el, w: card.clientWidth, h: card.clientHeight, x: card.clientWidth - 30, y: 20, vx: 0, vy: 0, phase: Math.random() * 6.28, visible: false };
    el.style.transform = `translate3d(${b.x - SIZE / 2}px, ${b.y - SIZE / 2}px, 0)`;
    if (still) return undefined;

    if (!listening && typeof window !== 'undefined') {
      window.addEventListener('deviceorientation', onOrientation);
      document.addEventListener('visibilitychange', wake);
      listening = true;
    }
    balls.add(b);
    const ro = new ResizeObserver(() => { b.w = card.clientWidth; b.h = card.clientHeight; });
    ro.observe(card);
    // Only animate while the card is actually on screen (hidden tabs don't count).
    const io = new IntersectionObserver(([entry]) => { b.visible = entry.isIntersecting; wake(); });
    io.observe(card);
    return () => {
      balls.delete(b); ro.disconnect(); io.disconnect();
      if (!balls.size && listening) {
        window.removeEventListener('deviceorientation', onOrientation);
        document.removeEventListener('visibilitychange', wake);
        listening = false; tilt.baseGamma = tilt.baseBeta = null;
      }
    };
  }, []);
  return <div ref={ref} className="shine moon" aria-hidden="true" />;
}
