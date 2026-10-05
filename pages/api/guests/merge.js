import sql from '../../../lib/db';
import { HttpError, actor, parseId, route } from '../../../lib/api';

// POST /api/guests/merge { keep_id, merge_id }
// Merges the guest merge_id INTO keep_id, only when someone asks for it:
//   - every stay (past, current, deleted ones too) moves to keep_id, so the history is combined;
//   - keep_id keeps its own name and details; a phone, email, organization or colour it lacks is filled in from merge_id;
//   - the notes of both are kept, with a line saying what was merged and the old details of merge_id (nothing is lost);
//   - the merged guest record is then removed.
// All of it happens in one transaction: either everything is merged or nothing is.
async function merge(req, res) {
  const keepId = parseId(req.body?.keep_id, 'keep_id');
  const goneId = parseId(req.body?.merge_id, 'merge_id');
  if (keepId === goneId) throw new HttpError(400, 'Choose two different guests');
  const who = actor(req) || 'staff';
  const today = new Date().toISOString().slice(0, 10);

  const result = await sql.begin(async (tx) => {
    const rows = await tx`SELECT id, name, phone, email, notes, organization, color FROM guests WHERE id IN (${keepId}, ${goneId}) FOR UPDATE`;
    const keep = rows.find((g) => g.id === keepId);
    const gone = rows.find((g) => g.id === goneId);
    if (!keep || !gone) throw new HttpError(404, 'Guest not found');

    const old = [gone.phone && `phone ${gone.phone}`, gone.email && `email ${gone.email}`, gone.organization && `organization ${gone.organization}`].filter(Boolean).join(', ');
    const line = `Merged "${gone.name}" into this guest on ${today} by ${who}${old ? `. Their details were: ${old}` : ''}.`;
    const notes = [keep.notes, gone.notes && `Notes from "${gone.name}": ${gone.notes}`, line].filter(Boolean).join('\n\n');

    const moved = await tx`UPDATE bookings SET guest_id = ${keepId} WHERE guest_id = ${goneId} RETURNING id`;
    const [guest] = await tx`
      UPDATE guests SET
        phone = ${keep.phone || gone.phone || null},
        email = ${keep.email || gone.email || null},
        organization = ${keep.organization || gone.organization || null},
        color = ${keep.color || gone.color || null},
        notes = ${notes}
      WHERE id = ${keepId}
      RETURNING id, name, phone, email, notes, organization, color
    `;
    await tx`DELETE FROM guests WHERE id = ${goneId}`;
    return { guest, moved: moved.length, from: gone.name };
  });
  res.status(200).json(result);
}

export default route({ POST: merge });
