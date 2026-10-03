import sql from '../../../lib/db';
import { HttpError, parseColor, route } from '../../../lib/api';

// sort=name (default, A to Z), stays (most stays first) or recent (latest stay first). dir=asc|desc overrides the order.
const SORTS = {
  name: { sql: sql`lower(g.name)`, dir: 'asc' },
  stays: { sql: sql`count(b.id) FILTER (WHERE b.deleted_at IS NULL)`, dir: 'desc' },
  recent: { sql: sql`max(lower(b.stay))`, dir: 'desc' },
};

// GET /api/guests?q=rahul&sort=name|stays|recent&dir=asc|desc
// Matches by name, phone or email. Each row shows stay count and last stay so that
// guests who share a name can be told apart.
async function list(req, res) {
  const q = req.query.q?.toString().trim();
  const like = q ? `%${q}%` : null;
  const sort = SORTS[req.query.sort ?? 'name'];
  if (!sort) throw new HttpError(400, `sort must be one of ${Object.keys(SORTS).join(', ')}`);
  const direction = (req.query.dir ?? sort.dir) === 'asc' ? sql`ASC` : sql`DESC`;
  const rows = await sql`
    SELECT g.id, g.name, g.phone, g.email, g.notes, g.organization, g.color,
           count(b.id) FILTER (WHERE b.deleted_at IS NULL) AS stays,
           max(lower(b.stay))::text AS last_check_in
    FROM guests g
    LEFT JOIN bookings b ON b.guest_id = g.id
    ${like ? sql`WHERE g.name ILIKE ${like} OR g.phone ILIKE ${like} OR g.email ILIKE ${like} OR g.organization ILIKE ${like}` : sql``}
    GROUP BY g.id
    ORDER BY ${sort.sql} ${direction} NULLS LAST, lower(g.name), g.id
    LIMIT 100
  `;
  res.status(200).json(rows);
}

async function create(req, res) {
  const { name, phone, email, notes, organization, color } = req.body ?? {};
  if (!name?.trim()) throw new HttpError(400, 'Guest name is required');
  const [guest] = await sql`
    INSERT INTO guests (name, phone, email, notes, organization, color)
    VALUES (${name.trim()}, ${phone?.trim() || null}, ${email?.trim() || null}, ${notes ?? null}, ${organization?.trim() || null}, ${parseColor(color)})
    RETURNING id, name, phone, email, notes, organization, color
  `;
  res.status(201).json(guest);
}

export default route({ GET: list, POST: create });
