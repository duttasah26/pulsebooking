import { randomUUID } from 'node:crypto';
import sql from '../../../lib/db';
import { bookingColumns, bookingJoins, getBooking } from '../../../lib/bookings';
import { HttpError, actor, parseColor, parseId, parseDate, parseStay, route } from '../../../lib/api';

const SORTS = {
  check_in: sql`lower(b.stay)`,
  check_out: sql`upper(b.stay)`,
  room: sql`r.number`,
  guest: sql`lower(COALESCE(g.name, b.label, ''))`,
  created: sql`b.created_at`,
};
const STATUSES = ['confirmed', 'checked_in', 'checked_out', 'cancelled', 'on_hold'];

// GET /api/bookings
//   when=past|current|upcoming|all (default all)    deleted=hide|show|only (default hide)
//   status=confirmed|checked_in|checked_out|cancelled|on_hold
//   from=YYYY-MM-DD&to=YYYY-MM-DD  (bookings overlapping that range, to is exclusive)
//   room_id, guest_id, q (guest name, organization or hold label contains), sort=check_in|check_out|room|guest|created, dir=asc|desc
//   year & month (1-12) still work for the current calendar.
async function list(req, res) {
  const { when = 'all', deleted = 'hide', status, room_id, guest_id, q, sort = 'check_in', dir = 'desc' } = req.query;
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

  if (status) {
    if (!STATUSES.includes(status)) throw new HttpError(400, `status must be one of ${STATUSES.join(', ')}`);
    where.push(sql`b.status = ${status}`);
  }
  if (from || to) {
    const a = from ? parseDate(from, 'from') : '-infinity';
    const b = to ? parseDate(to, 'to') : 'infinity';
    where.push(sql`b.stay && daterange(${a}::date, ${b}::date, '[)')`);
  }
  if (room_id) where.push(sql`b.room_id = ${parseId(room_id, 'room_id')}`);
  if (guest_id) where.push(sql`b.guest_id = ${parseId(guest_id, 'guest_id')}`);
  if (q) {
    const like = '%' + q + '%';
    where.push(sql`(g.name ILIKE ${like} OR b.organization ILIKE ${like} OR b.label ILIKE ${like})`);
  }

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

// One room (room_id / room_number) or several (room_ids).
async function resolveRoomIds(body) {
  if (Array.isArray(body.room_ids)) {
    const ids = [...new Set(body.room_ids.map((v) => parseId(v, 'room_ids')))];
    if (ids.length === 0) throw new HttpError(400, 'Choose at least one room');
    return ids;
  }
  if (body.room_id) return [parseId(body.room_id, 'room_id')];
  if (body.room_number) {
    const [room] = await sql`SELECT id FROM rooms WHERE number = ${String(body.room_number)} AND active`;
    if (!room) throw new HttpError(400, `Room ${body.room_number} not found`);
    return [room.id];
  }
  throw new HttpError(400, 'room_id, room_ids or room_number is required');
}

// A booking points at an existing guest (guest_id) or creates a new one.
// For a new guest, name plus a phone or email is required. Names are not unique.
// An on-hold booking may have no guest at all.
async function resolveGuestId(tx, body, isHold) {
  if (body.guest_id) return parseId(body.guest_id, 'guest_id');
  const g = body.guest ?? body;
  const name = g.name?.toString().trim();
  if (!name) {
    if (isHold) return null;
    throw new HttpError(400, 'Guest name is required');
  }
  const phone = g.phone?.toString().trim() || null;
  const email = g.email?.toString().trim() || null;
  if (!phone && !email) {
    if (isHold) return null;
    throw new HttpError(400, 'A new guest needs a phone number or email');
  }
  const [guest] = await tx`
    INSERT INTO guests (name, phone, email, organization)
    VALUES (${name}, ${phone}, ${email}, ${g.organization?.toString().trim() || null}) RETURNING id
  `;
  return guest.id;
}

// POST /api/bookings
// Several rooms are booked together in one transaction: if any room is taken, none are booked.
// Returns the booking, or an array of bookings when room_ids is used.
async function create(req, res) {
  const body = req.body ?? {};
  const by = actor(req);
  const stay = parseStay(body.check_in, body.check_out);
  const roomIds = await resolveRoomIds(body);
  const status = body.status ?? 'confirmed';
  if (!STATUSES.includes(status)) throw new HttpError(400, `status must be one of ${STATUSES.join(', ')}`);
  const isHold = status === 'on_hold';
  const groupId = roomIds.length > 1 ? randomUUID() : null;

  const ids = await sql.begin(async (tx) => {
    const guestId = await resolveGuestId(tx, body, isHold);
    const out = [];
    for (const roomId of roomIds) {
      const [row] = await tx`
        INSERT INTO bookings (room_id, guest_id, stay, status, channel, rate_plan, adults, children, notes, color,
                              organization, label, group_id, created_by)
        VALUES (
          ${roomId}, ${guestId}, ${stay}, ${status}, ${body.channel ?? 'Direct'}, ${body.rate_plan ?? 'EP'},
          ${Number.isInteger(body.adults) ? body.adults : Number.isInteger(body.guests) ? body.guests : 1},
          ${Number.isInteger(body.children) ? body.children : 0},
          ${body.notes ?? null}, ${parseColor(body.color)},
          ${body.organization?.toString().trim() || null}, ${body.label?.toString().trim() || null}, ${groupId}, ${by}
        )
        RETURNING id
      `;
      out.push(row.id);
    }
    return out;
  });

  const created = await Promise.all(ids.map((id) => getBooking(id)));
  res.status(201).json(Array.isArray(body.room_ids) ? created : created[0]);
}

export default route({ GET: list, POST: create });
