// Checks a Google ID token with Google's public keys and returns who signed in.
// Works for both the web button and the Android sign-in sheet: both ask Google for a token
// meant for our Web client ID (GOOGLE_CLIENT_ID), so one check covers both.
import { OAuth2Client } from 'google-auth-library';

export function googleVerifier(clientIds) {
  const client = new OAuth2Client();
  return async (idToken) => {
    const ticket = await client.verifyIdToken({ idToken, audience: clientIds });
    const p = ticket.getPayload();
    if (!p?.sub || !p.email_verified) throw new Error('Google account email is not verified');
    return { sub: p.sub, email: p.email, name: p.name || p.email, picture: p.picture || '' };
  };
}
