import sql from '../../../lib/db';
import { bookingColumns, bookingJoins, getBooking } from '../../../lib/bookings';
import { HttpError, actor, parseId, parseDate, parseStay, route } from '../../../lib/api';

const SORTS = {
  check_in: sql`lower(b.stay)`,
  check_out: sql`upper(b.stay)`,
  room: sql`r.number`,
  guest: sql`lower(g.name)`,
  created: sql`b.created_at`,
};

// GET /api/bookings
//   when=past|current|upcoming|all (default all)    deleted=hide|show|only (default hide)
//   from=YYYY-MM-DD&to=YYYY-MM-DD  (bookings overlapping that range, to is exclusive)
//   room_id, guest_id, q (guest name contains), sort=check_in|check_out|room|guest|created, dir=asc|desc
//   year & month (1-12) still work for the current calendar.
async function list(req, res) {
  const { when = 'all', deleted = 'hide', room_id, guest_id, q, sort = 'check_in', dir = 'desc' } = req.query;
  let { from, to } = req.query;

  if (req.query.year && req.query.month) {
    const y = parseInt(req.query.year, 10);
    const m = parseInt(req.query.month, 10);
    if (!(y > 1900 && y < 3000 && m >= 1 && m <= 12)) throw new HttpError(400, 'Invalid year or month');
    const next = m === 12 ? [y + 1, 1] : [y, m + 1];
    from = `${y}-${String(m).padStart(2, '0')}-01`;
    to = `${next[0]}-${String(next[1]).padStart(2, '0')}-01`;
  }

  const where = [];
  if (deleted === 'hide') where.push(sql`b.deleted_at IS NULL`);
  else if (deleted === 'only') where.push(sql`b.deleted_at IS NOT NULL`);
  else if (deleted !== 'show') throw new HttpError(400, 'deleted must be hide, show or only');

  if (when === 'past') where.push(sql`upper(b.stay) <= CURRENT_DATE`);
  else if (when === 'current') where.push(sql`b.stay @> CURRENT_DATE`);
  else if (when === 'upcoming') where.push(sql`lower(b.stay) > CURRENT_DATE`);
  else if (when !== 'all') throw new HttpError(400, 'when must be past, current, upcoming or all');

  if (from || to) {
    const a = from ? parseDate(from, 'from') : '-infinity';
    const b = to ? parseDate(to, 'to') : 'infinity';
    where.push(sql`b.stay && daterange(${a}::date, ${b}::date, '[)')`);
  }
  if (room_id) where.push(sql`b.room_id = ${parseId(room_id, 'room_id')}`);
  if (guest_id) where.push(sql`b.guest_id = ${parseId(guest_id, 'guest_id')}`);
  if (q) where.push(sql`g.name ILIKE ${'%' + q + '%'}`);

  const orderBy = SORTS[sort];
  if (!orderBy) throw new HttpError(400, `sort must be one of ${Object.keys(SORTS).join(', ')}`);
  const direction = dir === 'asc' ? sql`ASC` : sql`DESC`;

  const whereSql = where.length
    ? sql`WHERE ${where.reduce((acc, cond, i) => (i === 0 ? cond : sql`${acc} AND ${cond}`))}`
    : sql``;

  const rows = await sql`
    SELECT ${bookingColumns} ${bookingJoins}
    ${whereSql}
    ORDER BY ${orderBy} ${direction}, b.id ${direction}
  `;
  res.status(200).json(rows);
}

async function resolveRoomId(body) {
  if (body.room_id) return parseId(body.room_id, 'room_id');
  if (body.room_number) {
    const [room] = await sql`SELECT id FROM rooms WHERE number = ${String(body.room_number)} AND active`;
    if (!room) throw new HttpError(400, `Room ${body.room_number} not found`);
    return room.id;
  }
  throw new HttpError(400, 'room_id (or room_number) is required');
}

// A booking points at an existing guest (guest_id) or creates a new one.
// For a new guest, name plus a phone or email is required. Names are not unique.
async function resolveGuestId(tx, body) {
  if (body.guest_id) return parseId(body.guest_id, 'guest_id');
  const g = body.guest ?? body;
  const name = g.name?.toString().trim();
  if (!name) throw new HttpError(400, 'Guest name is required');
  const phone = g.phone?.toString().trim() || null;
  const email = g.email?.toString().trim() || null;
  if (!phone && !email) throw new HttpError(400, 'A new guest needs a phone number or email');
  const [guest] = await tx`
    INSERT INTO guests (name, phone, email) VALUES (${name}, ${phone}, ${email}) RETURNING id
  `;
  return guest.id;
}

async function create(req, res) {
  const body = req.body ?? {};
  const by = actor(req);
  const stay = parseStay(body.check_in, body.check_out);
  const roomId = await resolveRoomId(body);

  const id = await sql.begin(async (tx) => {
    const guestId = await resolveGuestId(tx, body);
    const [row] = await tx`
      INSERT INTO bookings (room_id, guest_id, stay, status, channel, rate_plan, adults, children, notes, created_by)
      VALUES (
        ${roomId}, ${guestId}, ${stay},
        ${body.status ?? 'confirmed'}, ${body.channel ?? 'Direct'}, ${body.rate_plan ?? 'EP'},
        ${Number.isInteger(body.adults) ? body.adults : Number.isInteger(body.guests) ? body.guests : 1},
        ${Number.isInteger(body.children) ? body.children : 0},
        ${body.notes ?? null}, ${by}
      )
      RETURNING id
    `;
    return row.id;
  });

  res.status(201).json(await getBooking(id));
}

export default route({ GET: list, POST: create });
