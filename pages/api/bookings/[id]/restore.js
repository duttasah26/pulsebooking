import sql from '../../../../lib/db';
import { getBooking } from '../../../../lib/bookings';
import { HttpError, actor, parseId, route } from '../../../../lib/api';

// POST /api/bookings/:id/restore: undo a delete.
// Returns 409 if the room has since been booked for those dates.
async function restore(req, res) {
  const id = parseId(req.query.id);
  const [row] = await sql`
    UPDATE bookings SET deleted_at = NULL, deleted_by = NULL, updated_by = ${actor(req)}
    WHERE id = ${id} AND deleted_at IS NOT NULL RETURNING id
  `;
  if (!row) throw new HttpError(404, 'Booking not found or not deleted');
  res.status(200).json(await getBooking(id));
}

export default route({ POST: restore });
