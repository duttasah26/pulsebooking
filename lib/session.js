// A signed session token kept in a cookie. Web Crypto only (no Node modules), so the same code runs in the middleware (Edge
// runtime) and in the API routes. The token is "<payload>.<signature>": the payload says who (name) and until when
// (exp, in seconds), the signature is an HMAC-SHA256 of it with SESSION_SECRET, so it cannot be forged or edited.
export const COOKIE = 'pulse_session';
export const SESSION_DAYS = 30;

const enc = new TextEncoder();
const hmacKey = (secret) => crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

const toB64 = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64 = (text) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

export async function signSession(name, secret, days = SESSION_DAYS) {
  const payload = toB64(enc.encode(JSON.stringify({ u: name, exp: Math.floor(Date.now() / 1000) + days * 86400 })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(payload));
  return `${payload}.${toB64(new Uint8Array(sig))}`;
}

// The name in a valid, unexpired token, or null.
export async function readSession(token, secret) {
  if (!token || !secret) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64(sig), enc.encode(payload));
    if (!ok) return null;
    const { u, exp } = JSON.parse(new TextDecoder().decode(fromB64(payload)));
    return u && exp > Date.now() / 1000 ? String(u) : null;
  } catch {
    return null;
  }
}
