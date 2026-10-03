import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Add it to .env.local (see .env.example).');
}

// Neon's pooled endpoint (host contains "-pooler") sits behind PgBouncer, so prepared statements are off.
// On Vercel every function instance keeps a single connection; locally a few are fine.
const max = Number(process.env.DB_POOL_MAX) || (process.env.VERCEL ? 1 : 5);
const options = { max, prepare: false, idle_timeout: 20, connect_timeout: 30 };

// Reuse one client across hot reloads in dev.
const globalForDb = globalThis;
const sql = globalForDb.__pulseSql ?? postgres(process.env.DATABASE_URL, options);
if (process.env.NODE_ENV !== 'production') globalForDb.__pulseSql = sql;

export default sql;
