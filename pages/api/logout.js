import { route } from '../../lib/api';
import { COOKIE } from '../../lib/session';

// POST /api/logout  ends this browser's session.
async function logout(req, res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  res.status(200).json({ ok: true });
}

export default route({ POST: logout });
