import { nameMatch } from '../../../lib/search';
import sql from '../../../lib/db';
import { bookingColumns, bookingJoins } from '../../../lib/bookings';
import { autoCheckout } from '../../../lib/autoCheckout';
import { HttpError, actor, parseId, parseDate, route } from '../../../lib/api';
import { STATUSES, createBookings } from '../../../lib/createBookings';

const SORTS = {
  check_in: sql`lower(b.stay)`,
  check_out: sql`upper(b.stay)`,
  room: sql`r.number`,
  guest: sql`lower(COALESCE(g.name, b.label, b.organization, ''))`,
  created: sql`b.created_at`,
};
const csv = (value) => String(value ?? '').split(',').map((v) => v.trim()).filter(Boolean);
const escapeLike = (text) => text.replace(/[\\%_]/g, (c) => '\\' + c);

// GET /api/bookings
//   when=past|current|upcoming|all (default all)    deleted=hide|show|only (default hide)
//   status=confirmed|checked_in|checked_out|cancelled|on_hold    holds=hide leaves on-hold bookings out
//   from=YYYY-MM-DD&to=YYYY-MM-DD  (bookings overlapping that range, to is exclusive)
//   room_id, guest_id, q (guest name, organization or hold label contains), sort=check_in|check_out|room|guest|created, dir=asc|desc
//   year & month (1-12) still work for the current calendar.
//   Custom views: status, room_id and floor take several values separated by commas (status=confirmed,checked_in).
//   floor=1,2 (first digit of the room number), org (organization contains), contact=yes|no (the guest has a phone or email),
//   nights_min, nights_max, range_by=stay|check_in|check_out with range_from and range_to (both inclusive),
//   sort2 and dir2: a second sort for ties.
// deleted=only never lists on-hold bookings: removing a hold deletes it for good, so old ones are not "deleted records".
async function list(req, res) {
  await autoCheckout(); // anything whose leaving day and time have passed becomes Checked out
  const { when = 'all', deleted = 'hide', status, holds, room_id, guest_id, q, sort = 'check_in', dir = 'desc', sort2, dir2 = 'asc', floor, org, contact, nights_min, nights_max, range_by = 'stay', range_from, range_to } = req.query;
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
    const list = csv(status);
    for (const s of list) if (!STATUSES.includes(s)) throw new HttpError(400, `status must be one of ${STATUSES.join(', ')}`);
    if (list.length) where.push(list.length === 1 ? sql`b.status = ${list[0]}` : sql`b.status IN ${sql(list)}`);
  }
  if (holds === 'hide') where.push(sql`b.status <> 'on_hold'`);
  if (from || to) {
    const a = from ? parseDate(from, 'from') : '-infinity';
    const b = to ? parseDate(to, 'to') : 'infinity';
    where.push(sql`b.stay && daterange(${a}::date, ${b}::date, '[)')`);
  }
  if (room_id) {
    const ids = csv(room_id).map((v) => parseId(v, 'room_id'));
    if (ids.length) where.push(ids.length === 1 ? sql`b.room_id = ${ids[0]}` : sql`b.room_id IN ${sql(ids)}`);
  }
  if (floor) {
    const floors = csv(floor);
    for (const f of floors) if (!/^[1-9]$/.test(f)) throw new HttpError(400, 'floor must be digits 1 to 9');
    if (floors.length) where.push(sql`left(r.number, 1) IN ${sql(floors)}`);
  }
  if (org) {
    const like = `%${escapeLike(String(org).trim().slice(0, 60))}%`;
    where.push(sql`(b.organization ILIKE ${like} OR g.organization ILIKE ${like})`);
  }
  if (contact === 'yes') where.push(sql`(g.phone IS NOT NULL OR g.email IS NOT NULL)`);
  else if (contact === 'no') where.push(sql`(g.id IS NULL OR (g.phone IS NULL AND g.email IS NULL))`);
  else if (contact) throw new HttpError(400, 'contact must be yes or no');
  if (nights_min) where.push(sql`(upper(b.stay) - lower(b.stay)) >= ${parseId(nights_min, 'nights_min')}`);
  if (nights_max) where.push(sql`(upper(b.stay) - lower(b.stay)) <= ${parseId(nights_max, 'nights_max')}`);
  if (range_from || range_to) {
    const a = range_from ? parseDate(range_from, 'range_from') : '-infinity';
    const z = range_to ? parseDate(range_to, 'range_to') : 'infinity';
    if (range_by === 'check_in') where.push(sql`lower(b.stay) BETWEEN ${a}::date AND ${z}::date`);
    else if (range_by === 'check_out') where.push(sql`upper(b.stay) BETWEEN ${a}::date AND ${z}::date`);
    else if (range_by === 'stay') where.push(sql`b.stay && daterange(${a}::date, ${z}::date, '[]')`);
    else throw new HttpError(400, 'range_by must be stay, check_in or check_out');
  }
  if (guest_id) where.push(sql`b.guest_id = ${parseId(guest_id, 'guest_id')}`);
  if (q) {
    where.push(sql`(${nameMatch(q, [sql`g.name`, sql`b.organization`, sql`b.label`])})`);
  }

  const orderBy = SORTS[sort];
  if (!orderBy) throw new HttpError(400, `sort must be one of ${Object.keys(SORTS).join(', ')}`);
  const direction = dir === 'asc' ? sql`ASC` : sql`DESC`;
  let thenBy = sql``;
  if (sort2 && sort2 !== sort) {
    if (!SORTS[sort2]) throw new HttpError(400, `sort2 must be one of ${Object.keys(SORTS).join(', ')}`);
    thenBy = sql`${SORTS[sort2]} ${dir2 === 'desc' ? sql`DESC` : sql`ASC`},`;
  }

  const whereSql = where.length
    ? sql`WHERE ${where.reduce((acc, cond, i) => (i === 0 ? cond : sql`${acc} AND ${cond}`))}`
    : sql``;

  const rows = await sql`
    SELECT ${bookingColumns} ${bookingJoins}
    ${whereSql}
    ORDER BY ${orderBy} ${direction}, ${thenBy} b.id ${direction}
  `;
  res.status(200).json(rows);
}

// POST /api/bookings
// Several rooms are booked together in ONE statement, so it is a single database round trip and all-or-nothing:
// if any room is taken, none are booked (409). A new guest is created in the same statement.
// Returns the booking, or an array of bookings when room_ids is used. The work is in lib/createBookings.js.
async function create(req, res) {
  const body = req.body ?? {};
  const rows = await createBookings(body, actor(req));
  res.status(201).json(Array.isArray(body.room_ids) ? rows : rows[0]);
}

export default route({ GET: list, POST: create });
