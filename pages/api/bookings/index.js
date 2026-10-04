import { nameMatch } from '../../../lib/search';
import { randomUUID } from 'node:crypto';
import sql from '../../../lib/db';
import { bookingColumns, bookingJoins } from '../../../lib/bookings';
import { shareOut } from '../../../lib/party';
import { autoCheckout } from '../../../lib/autoCheckout';
import { HttpError, actor, parseColor, parseId, parseDate, parseStay, parseTime, parseUuid, route } from '../../../lib/api';

const SORTS = {
  check_in: sql`lower(b.stay)`,
  check_out: sql`upper(b.stay)`,
  room: sql`r.number`,
  guest: sql`lower(COALESCE(g.name, b.label, b.organization, ''))`,
  created: sql`b.created_at`,
};
const STATUSES = ['confirmed', 'checked_in', 'checked_out', 'cancelled', 'on_hold'];

// GET /api/bookings
//   when=past|current|upcoming|all (default all)    deleted=hide|show|only (default hide)
//   status=confirmed|checked_in|checked_out|cancelled|on_hold    holds=hide leaves on-hold bookings out
//   from=YYYY-MM-DD&to=YYYY-MM-DD  (bookings overlapping that range, to is exclusive)
//   room_id, guest_id, q (guest name, organization or hold label contains), sort=check_in|check_out|room|guest|created, dir=asc|desc
//   year & month (1-12) still work for the current calendar.
// deleted=only never lists on-hold bookings: removing a hold deletes it for good, so old ones are not "deleted records".
async function list(req, res) {
  await autoCheckout(); // anything whose leaving day and time have passed becomes Checked out
  const { when = 'all', deleted = 'hide', status, holds, room_id, guest_id, q, sort = 'check_in', dir = 'desc' } = req.query;
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
  else if (deleted === 'only') where.push(sql`b.deleted_at IS NOT NULL AND b.status <> 'on_hold'`);
  else if (deleted !== 'show') throw new HttpError(400, 'deleted must be hide, show or only');

  if (when === 'past') where.push(sql`upper(b.stay) <= CURRENT_DATE`);
  else if (when === 'current') where.push(sql`b.stay @> CURRENT_DATE`);
  else if (when === 'upcoming') where.push(sql`lower(b.stay) > CURRENT_DATE`);
  else if (when !== 'all') throw new HttpError(400, 'when must be past, current, upcoming or all');

  if (status) {
    if (!STATUSES.includes(status)) throw new HttpError(400, `status must be one of ${STATUSES.join(', ')}`);
    where.push(sql`b.status = ${status}`);
  }
  if (holds === 'hide') where.push(sql`b.status <> 'on_hold'`);
  if (from || to) {
    const a = from ? parseDate(from, 'from') : '-infinity';
    const b = to ? parseDate(to, 'to') : 'infinity';
    where.push(sql`b.stay && daterange(${a}::date, ${b}::date, '[)')`);
  }
  if (room_id) where.push(sql`b.room_id = ${parseId(room_id, 'room_id')}`);
  if (guest_id) where.push(sql`b.guest_id = ${parseId(guest_id, 'guest_id')}`);
  if (q) {
    where.push(sql`(${nameMatch(q, [sql`g.name`, sql`b.organization`, sql`b.label`])})`);
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

// An existing guest (guest_id), a new guest (a name; phone and email are optional), or none.
// Only an on-hold booking may have no guest.
function resolveGuest(body, isHold) {
  if (body.guest_id) return { id: parseId(body.guest_id, 'guest_id') };
  const g = body.guest ?? body;
  const name = g.name?.toString().trim();
  if (!name) {
    if (isHold) return null;
    throw new HttpError(400, 'Guest name is required');
  }
  return {
    newGuest: {
      name,
      phone: g.phone?.toString().trim() || null,
      email: g.email?.toString().trim() || null,
      organization: g.organization?.toString().trim() || null,
      color: parseColor(g.color),
    },
  };
}

// POST /api/bookings
// Several rooms are booked together in ONE statement, so it is a single database round trip and all-or-nothing:
// if any room is taken, none are booked (409). A new guest is created in the same statement.
// Returns the booking, or an array of bookings when room_ids is used.
async function create(req, res) {
  const body = req.body ?? {};
  const by = actor(req);
  const stay = parseStay(body.check_in, body.check_out);
  const roomIds = await resolveRoomIds(body);
  const status = body.status ?? 'confirmed';
  if (!STATUSES.includes(status)) throw new HttpError(400, `status must be one of ${STATUSES.join(', ')}`);
  const guest = resolveGuest(body, status === 'on_hold');
  // Rooms booked together share a group. A caller can pass group_id to add rooms to an existing group.
  const groupId = parseUuid(body.group_id, 'group_id') ?? (roomIds.length > 1 ? randomUUID() : null);
  // adults and children are the TOTAL for the booking, shared out over its rooms (at least one adult per room). Without
  // adults, every room gets one (a hold on 4 rooms is 4 adults).
  const adultTotal = Number.isInteger(body.adults) ? body.adults : Number.isInteger(body.guests) ? body.guests : roomIds.length;
  const adultsPer = shareOut(adultTotal, roomIds.length, 1);
  const childrenPer = shareOut(Number.isInteger(body.children) ? body.children : 0, roomIds.length, 0);

  // A new guest is inserted in the same statement. A statement cannot read rows it is inserting from the table itself,
  // so the result joins the new guest from the CTE as well as the existing guests.
  const newGuestCte = guest?.newGuest
    ? sql`new_guest AS (
        INSERT INTO guests (name, phone, email, organization, color)
        VALUES (${guest.newGuest.name}, ${guest.newGuest.phone}::text, ${guest.newGuest.email}::text, ${guest.newGuest.organization}::text, ${guest.newGuest.color}::text)
        RETURNING id, name, phone, email, color
      ),`
    : sql``;
  const guestId = guest?.newGuest ? sql`(SELECT id FROM new_guest)` : sql`${guest?.id ?? null}::int`;
  const guestRows = guest?.newGuest
    ? sql`SELECT id, name, phone, email, color FROM guests UNION ALL SELECT id, name, phone, email, color FROM new_guest`
    : sql`SELECT id, name, phone, email, color FROM guests`;

  const rows = await sql`
    WITH ${newGuestCte}
    ins AS (
      INSERT INTO bookings (room_id, guest_id, stay, status, channel, rate_plan, adults, children, notes, color,
                            organization, label, group_id, check_in_time, check_out_time, created_by)
      SELECT u.room, ${guestId}, ${stay}::daterange, ${status}::booking_status, ${body.channel ?? 'Direct'}::text,
             ${body.rate_plan ?? 'EP'}::text, u.a, u.c, ${body.notes ?? null}::text,
             ${parseColor(body.color)}::text, ${body.organization?.toString().trim() || null}::text,
             ${body.label?.toString().trim() || null}::text, ${groupId}::uuid,
             ${parseTime(body.check_in_time, 'check_in_time')}::time, ${parseTime(body.check_out_time, 'check_out_time')}::time,
             ${by}::text
      FROM unnest(${roomIds}::int[], ${adultsPer}::int[], ${childrenPer}::int[]) AS u(room, a, c)
      RETURNING *
    )
    SELECT ${bookingColumns}
    FROM ins b
    JOIN rooms r ON r.id = b.room_id
    LEFT JOIN (${guestRows}) g ON g.id = b.guest_id
    ORDER BY b.id
  `;
  res.status(201).json(Array.isArray(body.room_ids) ? rows : rows[0]);
}

export default route({ GET: list, POST: create });
