import sql from '../../../../lib/db';
import { getBooking } from '../../../../lib/bookings';
import { HttpError, actor, parseId, parseStay, route } from '../../../../lib/api';

async function get(req, res) {
  const booking = await getBooking(parseId(req.query.id));
  if (!booking) throw new HttpError(404, 'Booking not found');
  const history = await sql`
    SELECT id, changed_at, changed_by, action, old_row, new_row
    FROM booking_history WHERE booking_id = ${booking.id} ORDER BY id DESC
  `;
  res.status(200).json({ ...booking, history });
}

const EDITABLE = ['room_id', 'guest_id', 'status', 'channel', 'rate_plan', 'adults', 'children', 'notes'];

// PATCH sends only the fields that changed. Dates: send check_in and/or check_out.
// The no-overlap rule is re-checked by the database on every edit.
async function patch(req, res) {
  const id = parseId(req.query.id);
  const body = req.body ?? {};
  const existing = await getBooking(id);
  if (!existing) throw new HttpError(404, 'Booking not found');
  if (existing.deleted_at) throw new HttpError(409, 'Booking is deleted. Restore it before editing');

  const updates = { updated_by: actor(req) };
  for (const key of EDITABLE) if (body[key] !== undefined) updates[key] = body[key];
  if (body.guests !== undefined && body.adults === undefined) updates.adults = body.guests;
  if (body.check_in !== undefined || body.check_out !== undefined) {
    updates.stay = parseStay(body.check_in ?? existing.check_in, body.check_out ?? existing.check_out);
  }

  const keys = Object.keys(updates);
  await sql`UPDATE bookings SET ${sql(updates, ...keys)} WHERE id = ${id}`;
  res.status(200).json(await getBooking(id));
}

// DELETE is a soft delete. The booking stays in the database and can be restored.
async function remove(req, res) {
  const id = parseId(req.query.id);
  const [row] = await sql`
    UPDATE bookings SET deleted_at = now(), deleted_by = ${actor(req)}
    WHERE id = ${id} AND deleted_at IS NULL RETURNING id
  `;
  if (!row) throw new HttpError(404, 'Booking not found or already deleted');
  res.status(200).json(await getBooking(id));
}

export default route({ GET: get, PATCH: patch, DELETE: remove });
