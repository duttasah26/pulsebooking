import { HttpError, route } from '../../lib/api';
import { hashPassword, loginRequired, verifyPassword } from '../../lib/auth';
import { hashFor, savePasswordHash } from '../../lib/passwords';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// GET   /api/account  { name, loginRequired }  who is signed in
// PATCH /api/account  { current, next }        change your own password (the person is the one signed in, never named by the caller)
async function get(req, res) {
  res.status(200).json({ name: req.headers['x-staff-name']?.toString() || null, loginRequired: loginRequired() });
}

async function patch(req, res) {
  const name = req.headers['x-staff-name']?.toString();
  if (!name) throw new HttpError(400, 'Passwords are only used when you are signed in.');
  const current = String(req.body?.current ?? '');
  const next = String(req.body?.next ?? '');
  const stored = await hashFor(name);
  if (!stored || !current || !verifyPassword(current, stored)) {
    await wait(600);
    throw new HttpError(401, 'The password you typed as your current one is not right.');
  }
  if (next.length < 8) throw new HttpError(400, 'Please choose a new password of at least 8 characters.');
  if (next === current) throw new HttpError(400, 'The new password must be different from the current one.');
  await savePasswordHash(name, hashPassword(next));
  res.status(200).json({ ok: true });
}

export default route({ GET: get, PATCH: patch });
