import { randomUUID } from 'node:crypto';
import sql from '../../lib/db';
import { HttpError, route } from '../../lib/api';

// Saved custom views for the Bookings and Guests screens. They live in the database (settings table, key 'views'), so every
// device and every member of staff sees the same views and a cleared browser loses nothing. No migration is needed: the
// settings table already exists.
//   a view: { id, page: 'bookings' | 'guests', name, params: { key: 'value' } }
// params is the page's own URL state (tab, sort, filters, columns, density, search), kept as plain text values.
const KEY = 'views';
const PAGES = ['bookings', 'guests'];
const MAX_VIEWS = 40;

async function load() {
  const [row] = await sql`SELECT value FROM settings WHERE key = ${KEY}`;
  return Array.isArray(row?.value?.views) ? row.value.views : [];
}

async function save(views) {
  await sql`
    INSERT INTO settings (key, value) VALUES (${KEY}, ${sql.json({ views })})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}

function clean(input) {
  const name = String(input?.name ?? '').trim().slice(0, 40);
  if (!name) throw new HttpError(400, 'Give the view a name');
  if (!PAGES.includes(input?.page)) throw new HttpError(400, 'page must be bookings or guests');
  const params = {};
  for (const [k, v] of Object.entries(input?.params ?? {})) {
    if (!/^[a-z0-9_]{1,16}$/i.test(k)) continue;
    if (typeof v !== 'string' || v === '') continue;
    params[k] = v.slice(0, 200);
  }
  return { name, page: input.page, params };
}

// GET /api/views?page=bookings
async function get(req, res) {
  const all = await load();
  const page = req.query.page;
  res.status(200).json(page ? all.filter((v) => v.page === page) : all);
}

// POST /api/views { page, name, params }: add a view (a view with the same name on that page is replaced).
async function post(req, res) {
  const view = clean(req.body);
  const all = await load();
  const same = all.find((v) => v.page === view.page && v.name.toLowerCase() === view.name.toLowerCase());
  const next = same
    ? all.map((v) => (v.id === same.id ? { ...v, ...view } : v))
    : [...all, { id: randomUUID(), ...view }];
  if (next.length > MAX_VIEWS) throw new HttpError(400, `You can keep up to ${MAX_VIEWS} views. Delete one first.`);
  await save(next);
  res.status(201).json(next.filter((v) => v.page === view.page));
}

// PATCH /api/views { id, name }: rename.  DELETE /api/views?id=...
async function patch(req, res) {
  const { id, name } = req.body ?? {};
  const label = String(name ?? '').trim().slice(0, 40);
  if (!label) throw new HttpError(400, 'Give the view a name');
  const all = await load();
  if (!all.some((v) => v.id === id)) throw new HttpError(404, 'View not found');
  const next = all.map((v) => (v.id === id ? { ...v, name: label } : v));
  await save(next);
  res.status(200).json(next);
}

async function del(req, res) {
  const id = req.query.id;
  const all = await load();
  const next = all.filter((v) => v.id !== id);
  if (next.length === all.length) throw new HttpError(404, 'View not found');
  await save(next);
  res.status(200).json(next);
}

export default route({ GET: get, POST: post, PATCH: patch, DELETE: del });
