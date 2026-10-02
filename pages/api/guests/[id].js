import sql from '../../../lib/db';
import { bookingColumns, bookingJoins } from '../../../lib/bookings';
import { HttpError, parseId, route } from '../../../lib/api';

// GET /api/guests/:id returns the guest plus every stay, newest first (deleted ones included).
async function get(req, res) {
  const id = parseId(req.query.id);
  const [guest] = await sql`SELECT id, name, phone, email, notes, created_at FROM guests WHERE id = ${id}`;
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
  for (const key of ['name', 'phone', 'email', 'notes']) if (body[key] !== undefined) updates[key] = body[key];
  if (Object.keys(updates).length === 0) throw new HttpError(400, 'Nothing to update');
  const [guest] = await sql`
    UPDATE guests SET ${sql(updates, ...Object.keys(updates))} WHERE id = ${id}
    RETURNING id, name, phone, email, notes
  `;
  if (!guest) throw new HttpError(404, 'Guest not found');
  res.status(200).json(guest);
}

export default route({ GET: get, PATCH: patch });
