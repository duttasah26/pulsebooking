import { useEffect, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Eye, EyeSlash, LockKey, User } from '@phosphor-icons/react';
import { roomShade } from '../lib/colors';
import FieldLabel from '../components/FieldLabel';
import { api } from '../lib/useApi';

// The rack of room keys under the card: the property's rooms, a row for each floor in that floor's colour. Decoration only.
const FLOORS = [1, 2, 3].map((f) => [1, 2, 3, 4, 5, 6].map((n) => `${f}0${n}`));

// Only ever go back to a page inside this app.
const safeNext = (next) => (typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/');

export default function Login() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    api('/api/login').then((d) => setConfigured(d.configured)).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !password) return setError(!name.trim() ? 'Please type your name.' : 'Please type your password.');
    setBusy(true);
    try {
      await api('/api/login', { method: 'POST', body: { name, password } });
      window.location.assign(safeNext(router.query.next)); // a full load, so every request starts with the new session
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign in | Pulse Rooms</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/icon.png" type="image/png" />
      </Head>
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 px-4 py-10">
        <div className="card login-rise w-full max-w-md space-y-8 p-6 sm:p-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <Image src="/Pulse-Logo_Final.webp" alt="The Pulse Newtown" width={744} height={380} priority style={{ '--i': 1 }} className="login-rise h-12 w-auto" />
            <h1 style={{ '--i': 2 }} className="t-display login-rise">Sign in</h1>
          </div>

          {!configured && (
            <p role="alert" className="rounded-lg bg-surface-2 px-4 py-3 text-base">
              Login is not set up yet. Add STAFF_ACCOUNTS and SESSION_SECRET to the environment variables (see .env.example).
            </p>
          )}

          <form onSubmit={submit} className="form-area space-y-4" noValidate>
            <div style={{ '--i': 3 }} className="login-rise">
              <FieldLabel icon={User} htmlFor="login-name">Your name</FieldLabel>
              <input id="login-name" name="username" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus />
            </div>
            <div style={{ '--i': 4 }} className="login-rise">
              <FieldLabel icon={LockKey} htmlFor="login-password">Password</FieldLabel>
              <div className="relative">
                <input id="login-password" name="password" type={show ? 'text' : 'password'} className="field pr-14" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                <button type="button" className="btn btn-quiet btn-icon absolute right-0 top-0 h-full" onClick={() => setShow((v) => !v)} aria-pressed={show} aria-label={show ? 'Hide password' : 'Show password'} title={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeSlash size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}
                </button>
              </div>
            </div>
            {error && <p key={error} role="alert" className="animate-shake rounded-lg bg-danger-soft px-4 py-3 text-base font-medium text-danger">{error}</p>}
            <button type="submit" style={{ '--i': 5 }} className="btn btn-primary btn-block login-rise" disabled={busy}>
              {busy ? 'Signing in…' : <>Sign In</>}
            </button>
          </form>
        </div>

        {/* Every room's key on its hook, a row per floor. While the sign-in is on its way the keys ripple along the rack. */}
        <ul aria-hidden="true" className="grid grid-cols-6 gap-x-2 gap-y-2.5">
          {FLOORS.flat().map((room, i) => {
            const shade = roomShade({ number: room });
            return (
              <li key={room} style={{ '--i': i }} className="key-hang">
                <span style={{ '--i': i % 6, backgroundColor: shade.fill, boxShadow: `inset 0 0 0 1px ${shade.edge}` }} className={`block rounded-md px-2.5 py-0.5 font-mono text-[0.8125rem] font-semibold leading-5 text-ink ${busy ? 'key-wave' : ''}`}>
                  {room}
                </span>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
