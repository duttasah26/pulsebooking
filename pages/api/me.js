import { route } from '../../lib/api';
import { loginRequired } from '../../lib/auth';

// GET /api/me  { name, loginRequired }: who is signed in (the middleware puts the name in x-staff-name).
async function me(req, res) {
  res.status(200).json({ name: req.headers['x-staff-name']?.toString() || null, loginRequired: loginRequired() });
}

export default route({ GET: me });
