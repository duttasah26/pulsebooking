import sql from '../../../lib/db';
import { bookingColumns, bookingJoins } from '../../../lib/bookings';
import { HttpError, parseColor, parseId, route } from '../../../lib/api';

// GET /api/guests/:id returns the guest plus every stay, newest first (deleted ones included).
async function get(req, res) {
  const id = parseId(req.query.id);
  const [guest] = await sql`SELECT id, name, phone, email, notes, organization, color, created_at FROM guests WHERE id = ${id}`;
  if (!guest) throw new HttpError(404, 'Guest not found');
  const bookings = await sql`
    SELECT ${bookingColumns} ${bookingJoins}
    WHERE b.guest_id = ${id} ORDER BY lower(b.stay) DESC
  `;
  res.status(200).json({ ...guest, bookings });
}

async function patch(req, res) {
  const id = parseId(req.query.id);
  const body = req.body ?? {};
  const updates = {};
  for (const key of ['name', 'phone', 'email', 'notes', 'organization']) if (body[key] !== undefined) updates[key] = body[key];
  if ('color' in body) updates.color = parseColor(body.color);
  if (Object.keys(updates).length === 0) throw new HttpError(400, 'Nothing to update');
  const [guest] = await sql`
    UPDATE guests SET ${sql(updates, ...Object.keys(updates))} WHERE id = ${id}
    RETURNING id, name, phone, email, notes, organization, color
  `;
  if (!guest) throw new HttpError(404, 'Guest not found');
  res.status(200).json(guest);
}

// DELETE /api/guests/:id removes the guest for good. Refused while any of their stays is still on the calendar
// (not deleted): those must be deleted first, or the guest merged into another. Stays that were already deleted
// go with the guest (their change history in booking_history is kept).
async function remove(req, res) {
  const id = parseId(req.query.id);
  const result = await sql.begin(async (tx) => {
    const [guest] = await tx`SELECT id, name FROM guests WHERE id = ${id} FOR UPDATE`;
    if (!guest) throw new HttpError(404, 'Guest not found');
    const [{ live }] = await tx`SELECT count(*)::int AS live FROM bookings WHERE guest_id = ${id} AND deleted_at IS NULL`;
    if (live > 0) {
      throw new HttpError(409, `${guest.name} has ${live} ${live === 1 ? 'stay' : 'stays'} on the calendar. Delete those first, or merge this guest into another.`);
    }
    await tx`DELETE FROM bookings WHERE guest_id = ${id} AND deleted_at IS NOT NULL`;
    await tx`DELETE FROM guests WHERE id = ${id}`;
    return { id, name: guest.name };
  });
  res.status(200).json(result);
}

export default route({ GET: get, PATCH: patch, DELETE: remove });
