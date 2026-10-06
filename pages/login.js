import { useEffect, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Eye, EyeSlash, LockKey, User, SignIn } from '@phosphor-icons/react';
import FieldLabel from '../components/FieldLabel';
import { api } from '../lib/useApi';

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
      <main className="grid min-h-[100dvh] place-items-center px-4 py-10">
        <div className="card w-full max-w-md space-y-6 p-6 sm:p-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <Image src="/Pulse-Logo_Final.webp" alt="The Pulse Newtown" width={744} height={380} priority className="h-12 w-auto" />
            <h1 className="text-xl font-semibold">Sign in to Pulse Rooms</h1>
          </div>

          {!configured && (
            <p role="alert" className="rounded-lg border-2 border-amber-400 bg-amber-50 px-3 py-2 text-base">
              Login is not set up yet. Add STAFF_ACCOUNTS and SESSION_SECRET to the environment variables (see .env.example).
            </p>
          )}

          <form onSubmit={submit} className="form-area space-y-4" noValidate>
            <div>
              <FieldLabel icon={User} htmlFor="login-name">Your name</FieldLabel>
              <input id="login-name" name="username" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus />
            </div>
            <div>
              <FieldLabel icon={LockKey} htmlFor="login-password">Password</FieldLabel>
              <div className="relative">
                <input id="login-password" name="password" type={show ? 'text' : 'password'} className="field pr-14" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                <button type="button" className="btn btn-quiet btn-icon absolute right-0 top-0 h-full" onClick={() => setShow((v) => !v)} aria-pressed={show} aria-label={show ? 'Hide password' : 'Show password'} title={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeSlash size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}
                </button>
              </div>
            </div>
            {error && <p key={error} role="alert" className="animate-shake rounded-lg border-2 border-danger bg-red-50 px-3 py-2 text-base text-danger">{error}</p>}
            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy ? 'Signing in…' : <><SignIn size={18} aria-hidden="true" /> Sign In</>}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
