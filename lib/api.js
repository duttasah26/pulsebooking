import { COLOR_KEYS } from './colors';

// Small helpers shared by the API routes.

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Staff name sent by the UI (until real login exists). Stored in *_by columns.
export const actor = (req) => req.headers['x-staff-name']?.toString().trim() || null;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseDate(value, field) {
  if (typeof value !== 'string' || !DATE_RE.test(value) || isNaN(new Date(value))) {
    throw new HttpError(400, `${field} must be a date in YYYY-MM-DD format`);
  }
  return value;
}

export function parseStay(checkIn, checkOut) {
  const a = parseDate(checkIn, 'check_in');
  const b = parseDate(checkOut, 'check_out');
  if (b <= a) throw new HttpError(400, 'check_out must be after check_in');
  return `[${a},${b})`;
}

export function parseColor(value) {
  if (value === null || value === undefined || value === '') return null;
  if (!COLOR_KEYS.includes(value)) throw new HttpError(400, `color must be one of ${COLOR_KEYS.join(', ')}`);
  return value;
}

export function parseId(value, field = 'id') {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `${field} must be a positive integer`);
  return n;
}

// Wraps a route handler: maps thrown errors and Postgres errors to JSON responses.
export const route = (methods) => async (req, res) => {
  const fn = methods[req.method];
  if (!fn) {
    res.setHeader('Allow', Object.keys(methods));
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err.code === '23P01') {
      return res.status(409).json({ error: 'That room is already booked for those dates' });
    }
    if (err.code === '22P02') return res.status(400).json({ error: 'Invalid value (check status and number fields)' });
    if (err.code === '23503') return res.status(400).json({ error: 'Unknown room or guest' });
    if (err.code === '23514') {
      return res.status(400).json({ error: 'Guest needs a phone or email, and dates must be valid' });
    }
    if (err.code === '23505') return res.status(409).json({ error: 'That value already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
