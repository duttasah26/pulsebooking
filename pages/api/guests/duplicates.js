import sql from '../../../lib/db';
import { route } from '../../../lib/api';

// GET /api/guests/duplicates: guests that may be the same person, grouped. Two guests are "the same name" when their
// names are equal once spaces, dots and capitals are ignored (Z B, Z.B. and ZB). Nothing is merged here: the person at
// the desk decides, and merges from the Guests screen.
async function list(req, res) {
  const groups = await sql`
    SELECT key, json_agg(json_build_object(
             'id', id, 'name', name, 'phone', phone, 'email', email, 'organization', organization, 'stays', stays
           ) ORDER BY stays DESC, id) AS guests
    FROM (
      SELECT g.id, g.name, g.phone, g.email, g.organization,
             lower(regexp_replace(g.name, ${'[^a-zA-Z0-9]'}::text, '', 'g')) AS key,
             (SELECT count(*) FROM bookings b WHERE b.guest_id = g.id AND b.deleted_at IS NULL)::int AS stays
      FROM guests g
    ) t
    WHERE key <> ''
    GROUP BY key
    HAVING count(*) > 1
    ORDER BY key
    LIMIT 30
  `;
  res.status(200).json(groups);
}

export default route({ GET: list });
