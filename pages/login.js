import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Eye, EyeSlash, LockKey, User } from '@phosphor-icons/react';
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
  // The Swell background (asciify-engine): small gold symbols that keep changing as slow waves roll through them, quiet round the
  // card, lit under the pointer. Loaded after the page so sign-in never waits for it; if it cannot load or draw (no WebGL2) the page is just plain. It
  // pauses off screen and holds a still frame with reduced motion by itself, and is torn down when the page goes.
  const page = useRef(null);
  const card = useRef(null);
  useEffect(() => {
    let bg;
    let gone = false;
    import('asciify-engine/kit')
      .then(({ background, swell }) => {
        if (gone || !page.current) return;
        bg = background(page.current, {
          preset: swell,
          clear: card.current ?? false,
          palette: '#b8923a', // the logo's gold
          mark: 'glyph',
          charset: ' .:+*x=#%@', // real symbols, swapping as the waves roll
          cellSize: 8,
          speed: 1,
          opacity: 0.7,
          cursor: 'lantern',
        });
      })
      .catch(() => {});
    return () => {
      gone = true;
      bg?.destroy();
    };
  }, []);

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
      <main ref={page} className="relative grid min-h-[100dvh] place-items-center px-4 py-10">
        <div ref={card} className="card login-rise relative w-full max-w-md space-y-8 !rounded-3xl border-white/70 p-6 shadow-md sm:p-10">
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
              {busy ? (
                <span className="inline-flex items-center gap-2" role="status">
                  Signing in
                  <span aria-hidden="true" className="inline-flex items-end gap-1 pb-0.5">
                    {[0, 1, 2].map((i) => <span key={i} style={{ '--i': i }} className="dot-bounce size-1.5 rounded-full bg-current" />)}
                  </span>
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

      </main>
    </>
  );
}
