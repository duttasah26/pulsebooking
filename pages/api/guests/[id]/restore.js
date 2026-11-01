import sql from '../../../../lib/db';
import { HttpError, parseId, route } from '../../../../lib/api';

// POST /api/guests/:id/restore: undo a guest's delete. Their old stays were never touched, so they are all still theirs.
async function restore(req, res) {
  const id = parseId(req.query.id);
  const [guest] = await sql`
    UPDATE guests SET deleted_at = NULL, deleted_by = NULL
    WHERE id = ${id} AND deleted_at IS NOT NULL RETURNING id, name
  `;
  if (!guest) throw new HttpError(404, 'Guest not found or not deleted');
  res.status(200).json(guest);
}

export default route({ POST: restore });
