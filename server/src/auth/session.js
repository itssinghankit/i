// Our own sign-in token, given out after Google confirms who you are.
// Format: v1.<payload>.<signature>, signed with SESSION_SECRET (HMAC-SHA256).
// The app (web and widget) sends it as "Authorization: Bearer <token>".
import crypto from 'node:crypto';

const b64 = (buf) => Buffer.from(buf).toString('base64url');
const sign = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('base64url');

export function createToken(secret, userId, days = 180) {
  const payload = b64(JSON.stringify({ uid: userId, exp: Math.floor(Date.now() / 1000) + days * 86400 }));
  return `v1.${payload}.${sign(secret, `v1.${payload}`)}`;
}

// Returns the userId, or null if the token is missing, forged or expired.
export function readToken(secret, token) {
  if (typeof token !== 'string') return null;
  const [v, payload, sig] = token.split('.');
  if (v !== 'v1' || !payload || !sig) return null;
  const expected = sign(secret, `v1.${payload}`);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return uid && exp > Date.now() / 1000 ? uid : null;
  } catch { return null; }
}
