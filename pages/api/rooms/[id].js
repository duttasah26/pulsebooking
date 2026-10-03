import sql from '../../../lib/db';
import { HttpError, parseColor, parseId, route } from '../../../lib/api';

// PATCH /api/rooms/:id  { color?, number?, active? }
// Used by the Room view (to come). Retiring a room (active=false) keeps its old bookings intact.
async function patch(req, res) {
  const id = parseId(req.query.id);
  const body = req.body ?? {};
  const updates = {};
  if ('color' in body) updates.color = parseColor(body.color);
  if (body.number !== undefined) {
    const number = body.number?.toString().trim();
    if (!number) throw new HttpError(400, 'Room number cannot be empty');
    updates.number = number;
  }
  if (body.active !== undefined) updates.active = Boolean(body.active);
  if (Object.keys(updates).length === 0) throw new HttpError(400, 'Nothing to update');

  const [room] = await sql`
    UPDATE rooms SET ${sql(updates, ...Object.keys(updates))} WHERE id = ${id}
    RETURNING id, number, active, color
  `;
  if (!room) throw new HttpError(404, 'Room not found');
  res.status(200).json(room);
}

export default route({ PATCH: patch });
