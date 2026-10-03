import sql from '../../lib/db';
import { route } from '../../lib/api';

// GET /api/rooms           active rooms only
// GET /api/rooms?all=1     include retired rooms (needed to show old bookings)
// Each room has a colour (palette key or #hex) that bookings without their own colour use.
async function list(req, res) {
  const rows = req.query.all
    ? await sql`SELECT id, number, active, color FROM rooms ORDER BY number`
    : await sql`SELECT id, number, active, color FROM rooms WHERE active ORDER BY number`;
  res.status(200).json(rows);
}

export default route({ GET: list });
