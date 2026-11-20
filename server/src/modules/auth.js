// Sign in with Google.
//   GET  /auth/config  → is sign-in on? which Google client ID should the app use?
//   POST /auth/google  → { credential: <Google ID token> } → { token, user }
//   GET  /auth/me      → the signed-in person (needs a token)
// plus the middleware that puts every other request "inside" the signed-in user.
import { Router } from 'express';
import { wrap, bad } from '../lib/http.js';
import { createToken, readToken } from '../auth/session.js';
import { userContext } from '../db/scoped.js';

const publicUser = (u) => u && { id: u._id, email: u.email, name: u.name, picture: u.picture };

export function authModule({ store, config, verifyGoogleToken }) {
  const r = Router();

  r.get('/config', (req, res) => res.json({ required: config.authRequired, googleClientId: config.googleClientIds[0] || null }));

  r.post('/google', wrap(async (req, res) => {
    if (!config.authRequired) return bad(res, 'sign-in is not turned on for this server');
    if (!req.body?.credential) return bad(res, 'credential is required');
    let g;
    try { g = await verifyGoogleToken(req.body.credential); } catch (e) { return res.status(401).json({ error: 'Google sign-in failed', detail: e.message }); }

    const base = store.base; // users are shared, not per user
    let user = await base.findOne('users', { googleSub: g.sub });
    if (!user) {
      const isFirst = (await base.count('users', {})) === 0;
      user = await base.insert('users', { googleSub: g.sub, email: g.email, name: g.name, picture: g.picture, createdAt: Date.now() });
      // Data saved before sign-in existed belongs to the first person who signs in (the owner).
      if (isFirst) await base.claimOrphans(user._id);
    } else {
      user = await base.update('users', { _id: user._id }, { email: g.email, name: g.name, picture: g.picture, lastLoginAt: Date.now() });
    }
    res.json({ token: createToken(config.sessionSecret, user._id), user: publicUser(user) });
  }));

  r.get('/me', requireUser(config), wrap(async (req, res) => {
    const user = await store.base.findOne('users', { _id: req.userId });
    user ? res.json(publicUser(user)) : res.status(401).json({ error: 'account not found' });
  }));

  return r;
}

// Every API call after this needs a valid token when sign-in is on.
export function requireUser(config) {
  return (req, res, next) => {
    if (!config.authRequired) return next();
    const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const userId = readToken(config.sessionSecret, token);
    if (!userId) return res.status(401).json({ error: 'sign in required' });
    req.userId = userId;
    userContext.run({ userId }, next);
  };
}
