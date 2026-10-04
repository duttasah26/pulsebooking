import { HttpError, route } from '../../lib/api';
import { loginConfigured, staffAccounts, verifyPassword } from '../../lib/auth';
import { hashFor } from '../../lib/passwords';
import { COOKIE, SESSION_DAYS, signSession } from '../../lib/session';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// GET  /api/login  { configured }   whether login is set up (the login screen explains it when it is not)
// POST /api/login  { name, password }  signs in: sets the session cookie (HttpOnly, so scripts cannot read it)
async function status(req, res) {
  res.status(200).json({ configured: loginConfigured() });
}

async function login(req, res) {
  if (!loginConfigured()) {
    throw new HttpError(503, 'Login is not set up yet. Add STAFF_ACCOUNTS and SESSION_SECRET to the environment variables.');
  }
  const name = String(req.body?.name ?? '').trim();
  const password = String(req.body?.password ?? '');
  const account = staffAccounts().find((a) => a.name.toLowerCase() === name.toLowerCase());
  // The same message and the same wait for a wrong name or a wrong password, so neither can be guessed apart.
  const hash = account ? await hashFor(account.name).catch(() => account.hash) : null; // a password changed in the app wins
  if (!account || !password || !hash || !verifyPassword(password, hash)) {
    await wait(600);
    throw new HttpError(401, 'That name and password do not match.');
  }
  const token = await signSession(account.name, process.env.SESSION_SECRET);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`);
  res.status(200).json({ name: account.name });
}

export default route({ GET: status, POST: login });
