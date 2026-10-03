import sql from '../../lib/db';
import { HttpError, route } from '../../lib/api';

// GET /api/rooms           active rooms only
// GET /api/rooms?all=1     include retired rooms (needed to show old bookings)
// POST /api/rooms  { number }   adds a room. The first digit is its floor (106 is on the 1st floor), and the floor sets its colour.
async function list(req, res) {
  const rows = req.query.all
    ? await sql`SELECT id, number, active, color FROM rooms ORDER BY number`
    : await sql`SELECT id, number, active, color FROM rooms WHERE active ORDER BY number`;
  res.status(200).json(rows);
}

async function create(req, res) {
  const number = req.body?.number?.toString().trim();
  if (!number || !/^[1-9]\d{1,3}$/.test(number)) throw new HttpError(400, 'Room number must be digits, and the first digit is the floor (for example 107)');
  const [room] = await sql`INSERT INTO rooms (number) VALUES (${number}) RETURNING id, number, active, color`;
  res.status(201).json(room);
}

export default route({ GET: list, POST: create });
