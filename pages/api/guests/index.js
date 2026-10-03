import sql from '../../../lib/db';
import { HttpError, parseColor, parseDate, parseId, route } from '../../../lib/api';
import { nameMatch } from '../../../lib/search';

// sort=name (default, A to Z), stays (most stays first) or recent (latest stay first). dir=asc|desc overrides the order.
const SORTS = {
  name: { sql: sql`lower(g.name)`, dir: 'asc' },
  stays: { sql: sql`count(b.id) FILTER (WHERE b.deleted_at IS NULL)`, dir: 'desc' },
  recent: { sql: sql`max(lower(b.stay))`, dir: 'desc' },
};

// GET /api/guests?q=rahul&room_id=3&from=2026-10-01&to=2026-11-01&sort=name|stays|recent&dir=asc|desc
// q matches name or organization (initials work: ZB, Z B or Z find Zee Bangla), phone or email. room_id and from/to keep
// the guests who stayed in that room and/or whose stay overlaps those days (to is the day after the last one). Each row shows stay count and last stay so that
// guests who share a name can be told apart.
async function list(req, res) {
  const q = req.query.q?.toString().trim();
  const like = q ? `%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%` : null;
  const { room_id, from, to } = req.query;
  const stayed = [];
  if (room_id) stayed.push(sql`x.room_id = ${parseId(room_id, 'room_id')}`);
  if (from || to) stayed.push(sql`x.stay && daterange(${from ? parseDate(from, 'from') : '-infinity'}::date, ${to ? parseDate(to, 'to') : 'infinity'}::date, '[)')`);
  const conditions = [];
  if (like) conditions.push(sql`(${nameMatch(q, [sql`g.name`, sql`g.organization`])} OR g.phone ILIKE ${like} OR g.email ILIKE ${like})`);
  if (stayed.length) {
    const all = stayed.reduce((acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`));
    conditions.push(sql`EXISTS (SELECT 1 FROM bookings x WHERE x.guest_id = g.id AND x.deleted_at IS NULL AND ${all})`);
  }
  const whereSql = conditions.length ? sql`WHERE ${conditions.reduce((acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`))}` : sql``;
  const sort = SORTS[req.query.sort ?? 'name'];
  if (!sort) throw new HttpError(400, `sort must be one of ${Object.keys(SORTS).join(', ')}`);
  const direction = (req.query.dir ?? sort.dir) === 'asc' ? sql`ASC` : sql`DESC`;
  const rows = await sql`
    SELECT g.id, g.name, g.phone, g.email, g.notes, g.organization, g.color,
           count(b.id) FILTER (WHERE b.deleted_at IS NULL) AS stays,
           max(lower(b.stay))::text AS last_check_in
    FROM guests g
    LEFT JOIN bookings b ON b.guest_id = g.id
    ${whereSql}
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
