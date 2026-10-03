// Runs SQL files against the database in DATABASE_URL. For setting up Neon without pasting into the browser:
//
//   node --env-file=.env.local scripts/run-sql.mjs db/schema.sql db/seed.sql
//
// It prints which database host it is talking to (never the password) and what it found, and it refuses to run
// db/schema.sql when the tables already exist (that file is for an empty database only). Files run in the order given,
// each in one go; a failure stops the rest and prints the database's message.
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
const files = process.argv.slice(2);
if (!url || files.length === 0) {
  console.error('Usage: node --env-file=.env.local scripts/run-sql.mjs <file.sql> [more.sql]');
  console.error(url ? '' : 'DATABASE_URL is not set (is it in .env.local?).');
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 30, onnotice: () => {} });
try {
  const host = new URL(url).host;
  console.log(`Database: ${host}`);

  const have = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1`;
  console.log(`Tables now: ${have.length ? have.map((t) => t.table_name).join(', ') : '(none, empty database)'}`);

  for (const file of files) {
    if (/schema\.sql$/.test(file) && have.some((t) => t.table_name === 'rooms')) {
      console.error(`\nSkipped ${file}: the tables already exist, and it is only for an empty database.`);
      console.error('Tell Claude which tables are listed above, and it will say which migration files to run instead.');
      process.exit(2);
    }
    process.stdout.write(`\nRunning ${file} ... `);
    await sql.unsafe(readFileSync(file, 'utf8'));
    console.log('done');
  }

  const rooms = await sql`SELECT count(*)::int AS n FROM rooms`.catch(() => [{ n: '(no rooms table)' }]);
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1`;
  console.log(`\nTables: ${tables.map((t) => t.table_name).join(', ')}`);
  console.log(`Rooms: ${rooms[0].n}`);
} catch (err) {
  console.error(`\nFailed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
