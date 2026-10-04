import sql from './db';
import { staffAccounts } from './auth';

const KEY = 'staff_passwords';

// Passwords changed inside the app are kept as salted hashes in the settings table (row 'staff_passwords': { lowercase name:
// hash }), in front of the ones in STAFF_ACCOUNTS. Nothing is stored in plain text, and no migration is needed.
export async function savedHashes() {
  const [row] = await sql`SELECT value FROM settings WHERE key = ${KEY}`;
  return row?.value ?? {};
}

// The hash to check a person's password against: the one they chose in the app, else the one from STAFF_ACCOUNTS.
export async function hashFor(name) {
  const saved = await savedHashes();
  const key = String(name).toLowerCase();
  return saved[key] ?? staffAccounts().find((a) => a.name.toLowerCase() === key)?.hash ?? null;
}

export async function savePasswordHash(name, hash) {
  const next = { ...(await savedHashes()), [String(name).toLowerCase()]: hash };
  await sql`
    INSERT INTO settings (key, value) VALUES (${KEY}, ${sql.json(next)})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}
