import sql from '../../lib/db';
import { HttpError, parseColor, parseTime, route } from '../../lib/api';
import { SPAN_CHOICES, STATUS_COLOR_KEYS, STAY_COLOR_KEYS, VIEW_CHOICES, mergeSettings, patchSettings } from '../../lib/settings';

const KEY = 'app';

async function load() {
  const [row] = await sql`SELECT value FROM settings WHERE key = ${KEY}`;
  return mergeSettings(row?.value);
}

// GET /api/settings: floor colours, status colours and the default check-in / check-out times.
async function get(req, res) {
  res.status(200).json(await load());
}

// PATCH /api/settings  { floorColors?: {1: 'sky'}, statusColors?: {on_hold: '#f5d547'}, stayColors?: {checkIn: 'sky'}, checkInTime?, checkOutTime?,
//                         autoCheckout?: boolean, defaultView?: 'timeline'|'month'|'calendar'|'day', defaultSpan?: 'auto'|'7'|'14'|'30'|'month' }
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
  if (body.stayColors) {
    change.stayColors = {};
    for (const [which, color] of Object.entries(body.stayColors)) {
      if (!STAY_COLOR_KEYS.includes(which)) throw new HttpError(400, `Stay colours can be set for ${STAY_COLOR_KEYS.join(' and ')}`);
      change.stayColors[which] = parseColor(color);
    }
  }
  if ('checkInTime' in body) change.checkInTime = parseTime(body.checkInTime, 'checkInTime');
  if ('checkOutTime' in body) change.checkOutTime = parseTime(body.checkOutTime, 'checkOutTime');
  if ('autoCheckout' in body) {
    if (typeof body.autoCheckout !== 'boolean') throw new HttpError(400, 'autoCheckout must be true or false');
    change.autoCheckout = body.autoCheckout;
  }
  if ('defaultView' in body) {
    if (!VIEW_CHOICES.includes(body.defaultView)) throw new HttpError(400, `defaultView must be one of ${VIEW_CHOICES.join(', ')}`);
    change.defaultView = body.defaultView;
  }
  if ('defaultSpan' in body) {
    if (!SPAN_CHOICES.includes(String(body.defaultSpan))) throw new HttpError(400, `defaultSpan must be one of ${SPAN_CHOICES.join(', ')}`);
    change.defaultSpan = String(body.defaultSpan);
  }
  if (Object.keys(change).length === 0) throw new HttpError(400, 'Nothing to update');

  const next = patchSettings(await load(), change);
  await sql`
    INSERT INTO settings (key, value) VALUES (${KEY}, ${sql.json(next)})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
  res.status(200).json(next);
}

export default route({ GET: get, PATCH: patch });
