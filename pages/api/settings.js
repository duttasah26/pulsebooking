import sql from '../../lib/db';
import { HttpError, parseColor, parseTime, route } from '../../lib/api';
import { STATUS_COLOR_KEYS, mergeSettings, patchSettings } from '../../lib/settings';

const KEY = 'app';

async function load() {
  const [row] = await sql`SELECT value FROM settings WHERE key = ${KEY}`;
  return mergeSettings(row?.value);
}

// GET /api/settings: floor colours, status colours and the default check-in / check-out times.
async function get(req, res) {
  res.status(200).json(await load());
}

// PATCH /api/settings  { floorColors?: {1: 'sky'}, statusColors?: {on_hold: '#f5d547'}, checkInTime?, checkOutTime? }
// A null colour goes back to the default. Only the parts sent are changed.
async function patch(req, res) {
  const body = req.body ?? {};
  const change = {};
  if (body.floorColors) {
    change.floorColors = {};
    for (const [floor, color] of Object.entries(body.floorColors)) {
      if (!/^[1-9]$/.test(floor)) throw new HttpError(400, 'Floors are the digits 1 to 9');
      change.floorColors[floor] = parseColor(color);
    }
  }
  if (body.statusColors) {
    change.statusColors = {};
    for (const [status, color] of Object.entries(body.statusColors)) {
      if (!STATUS_COLOR_KEYS.includes(status)) throw new HttpError(400, `Status colours can be set for ${STATUS_COLOR_KEYS.join(' and ')}`);
      change.statusColors[status] = parseColor(color);
    }
  }
  if ('checkInTime' in body) change.checkInTime = parseTime(body.checkInTime, 'checkInTime');
  if ('checkOutTime' in body) change.checkOutTime = parseTime(body.checkOutTime, 'checkOutTime');
  if (Object.keys(change).length === 0) throw new HttpError(400, 'Nothing to update');

  const next = patchSettings(await load(), change);
  await sql`
    INSERT INTO settings (key, value) VALUES (${KEY}, ${sql.json(next)})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
  res.status(200).json(next);
}

export default route({ GET: get, PATCH: patch });
