import sql from '../../lib/db';
import { HttpError, parseColor, route } from '../../lib/api';

// Companies are the organizations typed on guests and bookings (there is no separate table, so no migration). A company's preset
// colour is kept in the settings table under the key 'companies':  { colors: { "<lowercase name>": "<palette key or #hex>" } }.
// Setting a colour also gives it to the company's guests (so their bookings take it on the calendar); a guest's own colour, set
// by hand on the guest, is left alone.
const KEY = 'companies';
const norm = (name) => String(name ?? '').trim().replace(/\s+/g, ' ');

async function loadColors() {
  const [row] = await sql`SELECT value FROM settings WHERE key = ${KEY}`;
  return row?.value?.colors ?? {};
}

// GET /api/companies?q=zee  ->  [{ name, color, guests, stays }]  (A to Z)
async function list(req, res) {
  const q = norm(req.query.q);
  const like = q ? `%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%` : '%';
  const [rows, colors] = await Promise.all([
    sql`
      WITH org AS (
        SELECT trim(organization) AS name, id AS guest_id, NULL::int AS booking_id FROM guests WHERE trim(coalesce(organization, '')) <> ''
        UNION ALL
        SELECT trim(organization), guest_id, id FROM bookings WHERE deleted_at IS NULL AND trim(coalesce(organization, '')) <> ''
      )
      SELECT min(name) AS name, count(DISTINCT guest_id)::int AS guests, count(booking_id)::int AS stays
      FROM org WHERE name ILIKE ${like}
      GROUP BY lower(name) ORDER BY lower(min(name))`,
    loadColors(),
  ]);
  res.status(200).json(rows.map((r) => ({ ...r, color: colors[r.name.toLowerCase()] ?? null })));
}

// PATCH /api/companies { name, color }  color null = no preset colour
async function patch(req, res) {
  const name = norm(req.body?.name);
  if (!name) throw new HttpError(400, 'Which company?');
  const color = parseColor(req.body?.color);
  const key = name.toLowerCase();
  const colors = await loadColors();
  const old = colors[key] ?? null;
  if (color) colors[key] = color;
  else delete colors[key];
  await sql`
    INSERT INTO settings (key, value) VALUES (${KEY}, ${sql.json({ colors })})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
  // Guests who had no colour (or the old preset) take the new one.
  await sql`
    UPDATE guests SET color = ${color}::text
    WHERE lower(trim(organization)) = ${key} AND (color IS NULL OR color IS NOT DISTINCT FROM ${old}::text)`;
  res.status(200).json({ name, color });
}

export default route({ GET: list, PATCH: patch });
