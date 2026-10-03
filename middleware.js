import { NextResponse } from 'next/server';
import { COOKIE, readSession } from './lib/session';

// Every page and every API route needs a signed-in staff member, except the login screen and its three small API routes.
// Signed in: the request carries the person's name in x-staff-name (set here, so a browser cannot fake it), which the API
// records as who created or changed a booking. Not signed in: pages go to /login, API calls get a 401.
// While developing without STAFF_ACCOUNTS set, nothing is checked (see lib/auth.js loginRequired).
const OPEN = ['/login', '/api/login', '/api/logout', '/api/me'];

export async function middleware(req) {
  const { pathname, search } = req.nextUrl;
  const headers = new Headers(req.headers);
  headers.delete('x-staff-name');

  const required = Boolean(process.env.STAFF_ACCOUNTS?.trim()) || process.env.NODE_ENV === 'production';
  if (!required) return NextResponse.next({ request: { headers } });

  const name = await readSession(req.cookies.get(COOKIE)?.value, process.env.SESSION_SECRET);
  if (name) {
    headers.set('x-staff-name', name);
    return NextResponse.next({ request: { headers } });
  }
  if (OPEN.includes(pathname)) return NextResponse.next({ request: { headers } });
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

// Not the build files, the icons and the logo (the login screen needs them).
export const config = { matcher: ['/((?!_next/|favicon.ico|icon.png|apple-touch-icon.png|Pulse-Logo_Final.webp).*)'] };
