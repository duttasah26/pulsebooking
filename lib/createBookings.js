import { randomUUID } from 'node:crypto';
import sql from './db';
import { bookingColumns } from './bookings';
import { shareOut } from './party';
import { HttpError, parseColor, parseId, parseStay, parseTime, parseUuid } from './api';

export const STATUSES = ['confirmed', 'checked_in', 'checked_out', 'cancelled', 'on_hold'];

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

// Creates one booking per room, all-or-nothing, and returns the rows. This is the one place bookings are made: the API route and
// the chat assistant both call it, so both follow the same rules (the database refuses overlapping stays).
//   body: the same fields POST /api/bookings takes. by: who is recorded as having made it. db: the connection (a transaction, in tests).
export async function createBookings(body, by, db = sql) {
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

  const rows = await db`
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
  return rows;
}

