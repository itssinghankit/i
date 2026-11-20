import { useEffect, useRef } from 'react';

// The big soft circle on the habit cards, acting like a ball on the moon.
//   Tilt the phone → it slowly "falls" toward the lower side (right side up → it rolls left),
//   floats with very little drag, and bounces softly off the card's edges (with a small squash).
//   Hold the phone still → it drifts back near its usual spot (top-right) and wobbles a little there.
//   Shake the phone → it gets a little push.
//
// How it works:
//   1. Gravity direction: the accelerometer (devicemotion, accelerationIncludingGravity) gives the pull of
//      gravity along the screen's left-right and up-down. Unlike tilt angles it doesn't jump around when
//      the phone is held upright. (Phones without it: the tilt angles from deviceorientation are used.)
//   2. Smoothed (hand tremor removed), then compared with a "resting" pull that slowly follows how you
//      normally hold the phone (~8 s). Only the difference moves the ball, so holding the phone upright
//      doesn't pin the ball to the bottom.
//   3. When the phone is close to its resting angle, a soft spring brings the ball home; when tilted,
//      the spring lets go so the ball rolls freely.
// One shared animation loop moves every ball; it only runs while a ball is on screen and the app is
// visible. Turned off when the phone asks for reduced motion.

const SIZE = 140;          // ball size in px (matches .habit .shine)
const R = SIZE / 2;
const PX_PER_G = 62;       // px/s² per m/s² of tilt pull: the moon's gentle gravity
const SMOOTH_S = 0.09;     // seconds: removes hand tremor from the sensor
const REST_S = 8;          // seconds: how slowly the "resting" angle follows your hand
const DEAD = 0.18;         // m/s²: tiny tilts below this don't move the ball (≈1°)
const HOME_K = 1.3;        // spring toward home when the phone is still
const HOME_FADE = 2.2;     // m/s² of tilt at which the home spring has fully let go (≈13°)
const AIR = 0.35;          // drag while rolling (low: it's the moon)
const SETTLE = 1.6;        // extra damping near home, so it settles instead of orbiting
const BOUNCE = 0.62;       // speed kept after hitting an edge
const SLIDE = 0.92;        // speed kept along the edge while bouncing
const SHAKE = 220;         // push from a shake: px/s² per m/s² of the phone's own movement
const SHAKE_MIN = 0.8;     // m/s²: smaller movements are sensor noise, ignored
const OVERHANG = 0.42;     // how far past the card edge the ball may go (share of its size)

const sensor = { x: 0, y: 0, rawX: 0, rawY: 0, rx: null, ry: null, has: false, shakeX: 0, shakeY: 0, via: null };
const balls = new Set();
let raf = 0, last = 0, listening = false;

// The phone's tilt from the accelerometer (devicemotion).
function onMotion(e) {
  const a = e.accelerationIncludingGravity;
  if (!a || a.x == null || a.y == null) return;
  sensor.via = 'motion';
  sensor.has = true;
  // The sensor reports the push that holds the phone up (opposite to gravity) in the phone's own axes
  // (x → right edge, y → top edge). So gravity toward the right edge is −x, toward the bottom is +y.
  // Turned into tilt angles (degrees), so a 20° tilt pushes the ball just as hard whether you hold the
  // phone flat or upright: roll = left/right (right edge down +), pitch = top edge toward you (+).
  const gx = -a.x, gy = a.y, gz = a.z ?? 0;
  sensor.rawX = Math.atan2(gx, Math.hypot(gy, gz)) * DEG;
  sensor.rawY = Math.atan2(gy, gz) * DEG;
  const lin = e.acceleration;
  if (lin && lin.x != null) { sensor.shakeX = -lin.x; sensor.shakeY = lin.y; }
}
function onOrientation(e) {
  if (sensor.via === 'motion' || e.gamma == null || e.beta == null) return;
  sensor.via = 'orientation';
  sensor.has = true;
  // gamma: right edge down = positive; beta: top edge up (toward you when held) = positive.
  sensor.rawX = e.gamma;
  sensor.rawY = e.beta;
}

const DEG = 180 / Math.PI;
const G = 9.81;
// Change in tilt angle (degrees) → pull along the screen (m/s²), like real gravity on a slope.
const pull = (deg) => G * Math.sin(Math.max(-75, Math.min(75, deg)) / DEG);
const soften = (v) => (Math.abs(v) < DEAD ? 0 : v - Math.sign(v) * DEAD);
const soft = (v) => (Math.abs(v) < SHAKE_MIN ? 0 : v - Math.sign(v) * SHAKE_MIN);

function step(b, dt, gx, gy, still, t) {
  // Home: the usual top-right spot, drifting a little so it never looks frozen.
  const hx = b.w - 30 + 6 * Math.sin(t * 0.55 + b.phase);
  const hy = 20 + 5 * Math.cos(t * 0.75 + b.phase);
  const k = HOME_K * still;
  b.vx += (gx * PX_PER_G + (hx - b.x) * k) * dt;
  b.vy += (gy * PX_PER_G + (hy - b.y) * k) * dt;
  const keep = Math.exp(-(AIR + SETTLE * still) * dt);
  b.vx *= keep; b.vy *= keep;
  b.x += b.vx * dt; b.y += b.vy * dt;

  // Edges (the ball may hang over the card's edge a bit; the card clips it).
  const over = SIZE * OVERHANG;
  const minX = R - over, maxX = b.w - R + over, minY = R - over, maxY = b.h - R + over;
  const hit = (v) => { b.squash = Math.max(b.squash, Math.min(0.14, Math.abs(v) / 2200)); };
  if (b.x < minX) { b.x = minX; if (b.vx < 0) { hit(b.vx); b.squashAxis = 'x'; b.vx = -b.vx * BOUNCE; b.vy *= SLIDE; } }
  if (b.x > maxX) { b.x = maxX; if (b.vx > 0) { hit(b.vx); b.squashAxis = 'x'; b.vx = -b.vx * BOUNCE; b.vy *= SLIDE; } }
  if (b.y < minY) { b.y = minY; if (b.vy < 0) { hit(b.vy); b.squashAxis = 'y'; b.vy = -b.vy * BOUNCE; b.vx *= SLIDE; } }
  if (b.y > maxY) { b.y = maxY; if (b.vy > 0) { hit(b.vy); b.squashAxis = 'y'; b.vy = -b.vy * BOUNCE; b.vx *= SLIDE; } }
}

function draw(b) {
  b.squash *= 0.86; // squash springs back over ~100 ms
  const s = b.squash < 0.004 ? 0 : b.squash;
  const sx = b.squashAxis === 'x' ? 1 - s : 1 + s * 0.6;
  const sy = b.squashAxis === 'x' ? 1 + s * 0.6 : 1 - s;
  b.el.style.transform = `translate3d(${(b.x - R).toFixed(1)}px, ${(b.y - R).toFixed(1)}px, 0)${s ? ` scale(${sx.toFixed(3)}, ${sy.toFixed(3)})` : ''}`;
}

function frame(now) {
  const dt = Math.min(0.05, (now - (last || now)) / 1000);
  last = now;
  // 1. Smooth the sensor, 2. let the resting angle slowly follow it.
  let gx = 0, gy = 0, still = 1;
  if (sensor.has) {
    // First reading: start the smoothed and resting values right there (not at 0), so holding the
    // phone still doesn't look like a sudden tilt.
    if (sensor.rx == null) { sensor.x = sensor.rx = sensor.rawX; sensor.y = sensor.ry = sensor.rawY; }
    const a = 1 - Math.exp(-dt / SMOOTH_S);
    sensor.x += (sensor.rawX - sensor.x) * a;
    sensor.y += (sensor.rawY - sensor.y) * a;
    const r = 1 - Math.exp(-dt / REST_S);
    sensor.rx += (sensor.x - sensor.rx) * r;
    sensor.ry += (sensor.y - sensor.ry) * r;
    gx = soften(pull(sensor.x - sensor.rx));
    gy = soften(pull(sensor.y - sensor.ry));
    still = Math.max(0, 1 - Math.hypot(gx, gy) / HOME_FADE);
  }
  const t = now / 1000;
  let anyVisible = false;
  for (const b of balls) {
    if (!b.visible || !b.w) continue;
    anyVisible = true;
    // A shake gives a push (once per frame, from the phone's own movement).
    if (sensor.via === 'motion') { b.vx += soft(sensor.shakeX) * SHAKE * dt; b.vy += soft(sensor.shakeY) * SHAKE * dt; }
    // Two half steps per frame: steadier bounces.
    step(b, dt / 2, gx, gy, still, t);
    step(b, dt / 2, gx, gy, still, t);
    draw(b);
  }
  raf = anyVisible && !document.hidden ? requestAnimationFrame(frame) : 0;
}

function wake() {
  if (!raf && !document.hidden && [...balls].some((b) => b.visible)) { last = 0; raf = requestAnimationFrame(frame); }
}

function listen(on) {
  const fn = on ? 'addEventListener' : 'removeEventListener';
  window[fn]('devicemotion', onMotion);
  window[fn]('deviceorientation', onOrientation);
  document[fn]('visibilitychange', wake);
  listening = on;
  if (!on) Object.assign(sensor, { rx: null, ry: null, has: false, via: null });
}

export function MoonBall() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const card = el?.parentElement;
    if (!el || !card) return undefined;
    const b = { el, w: card.clientWidth, h: card.clientHeight, x: card.clientWidth - 30, y: 20, vx: 0, vy: 0, squash: 0, squashAxis: 'y', phase: Math.random() * 6.28, visible: false };
    draw(b);
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    if (!listening && typeof window !== 'undefined') listen(true);
    balls.add(b);
    const ro = new ResizeObserver(() => { b.w = card.clientWidth; b.h = card.clientHeight; });
    ro.observe(card);
    // Only animate while the card is actually on screen (hidden tabs don't count).
    const io = new IntersectionObserver(([entry]) => { b.visible = entry.isIntersecting; wake(); });
    io.observe(card);
    return () => {
      balls.delete(b); ro.disconnect(); io.disconnect();
      if (!balls.size && listening) listen(false);
    };
  }, []);
  return <div ref={ref} className="shine moon" aria-hidden="true" />;
}
