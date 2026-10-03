import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// Passwords are never stored: only a salted scrypt hash, "scrypt:<salt>:<hash>" (see scripts/hash-password.mjs).
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [kind, salt, hash] = String(stored).split(':');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// STAFF_ACCOUNTS="sahil:scrypt:<salt>:<hash>,rohit:scrypt:<salt>:<hash>" -> [{ name, hash }]
export function staffAccounts() {
  return (process.env.STAFF_ACCOUNTS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const i = entry.indexOf(':');
      return { name: entry.slice(0, i).trim(), hash: entry.slice(i + 1).trim() };
    })
    .filter((a) => a.name && a.hash);
}

// Login is always on in production (and closed until it is configured). While developing, it is off until
// STAFF_ACCOUNTS is set, so `npm run dev` keeps working without any setup.
export const loginRequired = () => Boolean(process.env.STAFF_ACCOUNTS?.trim()) || process.env.NODE_ENV === 'production';
export const loginConfigured = () => staffAccounts().length > 0 && (process.env.SESSION_SECRET ?? '').length >= 16;
