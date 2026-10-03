import { useEffect, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { LockKey, SignIn, User } from '@phosphor-icons/react';
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
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    api('/api/login').then((d) => setConfigured(d.configured)).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
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
        <div className="w-full max-w-sm space-y-5 rounded-lg border border-line bg-surface p-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <Image src="/Pulse-Logo_Final.webp" alt="The Pulse Newtown" width={744} height={380} priority className="h-12 w-auto" />
            <h1 className="text-lg font-semibold">Sign in to Pulse Rooms</h1>
          </div>

          {!configured && (
            <p role="alert" className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm">
              Login is not set up yet. Add STAFF_ACCOUNTS and SESSION_SECRET to the environment variables (see .env.example).
            </p>
          )}

          <form onSubmit={submit} className="space-y-3">
            <div>
              <FieldLabel icon={User} htmlFor="login-name">Name</FieldLabel>
              <input id="login-name" name="username" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus />
            </div>
            <div>
              <FieldLabel icon={LockKey} htmlFor="login-password">Password</FieldLabel>
              <input id="login-password" name="password" type="password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            {error && <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">{error}</p>}
            <button type="submit" className="btn btn-primary w-full" disabled={busy || !name.trim() || !password}>
              <SignIn size={18} aria-hidden="true" /> {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
