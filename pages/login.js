import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Eye, EyeSlash, LockKey, User, WarningCircle } from '@phosphor-icons/react';
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
  const [caps, setCaps] = useState(false); // Caps Lock is on while typing the password
  const nameBox = useRef(null);
  const passBox = useRef(null);
  // The Swell background (asciify-engine): small gold symbols that keep changing as slow waves roll through them, quiet round the
  // card, lit under the pointer. Loaded after the page so sign-in never waits for it; if it cannot load or draw (no WebGL2) the page is just plain. It
  // pauses off screen and holds a still frame with reduced motion by itself, and is torn down when the page goes.
  const page = useRef(null);
  const card = useRef(null);
  useEffect(() => {
    let bg;
    let gone = false;
    // Start once the card has finished rising: the quiet oval round it is measured when the background is made, so measuring a card
    // that is still moving left the oval in the wrong place and it jumped. The canvas then fades in (see main > canvas in globals.css).
    const risen = () => Promise.all((card.current?.getAnimations({ subtree: true }) ?? []).map((a) => a.finished.catch(() => {})));
    Promise.all([import('asciify-engine/kit'), risen()])
      .then(([{ background, swell }]) => {
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
    if (!name.trim() || !password) {
      // Say what is missing and put the cursor there, so the fix is one keystroke away.
      setError(!name.trim() ? 'Please type your email.' : 'Please type your password.');
      (!name.trim() ? nameBox : passBox).current?.focus();
      return;
    }
    setBusy(true);
    try {
      await api('/api/login', { method: 'POST', body: { name, password } });
      window.location.assign(safeNext(router.query.next)); // a full load, so every request starts with the new session
    } catch (err) {
      setError(err.message);
      setBusy(false);
      passBox.current?.select(); // a wrong password is the usual reason: select it so typing replaces it
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
        <div ref={card} style={{ boxShadow: '0 1px 0 rgb(255 255 255 / 0.7) inset, 0 2px 6px rgb(var(--shadow-rgb) / 0.06), 0 28px 64px -24px rgb(var(--shadow-rgb) / 0.28)' }} className="card login-rise relative w-full max-w-[27rem] space-y-10 !rounded-[28px] border-surface/70 !p-8 sm:!p-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <Image src="/Pulse-Logo_Final.webp" alt="The Pulse Newtown" width={744} height={380} priority style={{ '--i': 1 }} className="login-rise h-16 w-auto" />
            <h1 style={{ '--i': 2 }} className="t-display login-rise">Sign in</h1>
          </div>

          {!configured && (
            <p role="alert" className="rounded-lg bg-surface-2 px-4 py-3 text-base">
              Login is not set up yet. Add STAFF_ACCOUNTS and SESSION_SECRET to the environment variables (see .env.example).
            </p>
          )}

          <form onSubmit={submit} className="form-area space-y-5" noValidate>
            <div style={{ '--i': 3 }} className="login-rise">
              <FieldLabel icon={User} htmlFor="login-name">Your email</FieldLabel>
              <input id="login-name" ref={nameBox} name="username" type="email" inputMode="email" className="field !min-h-14 !rounded-xl !px-4 !text-[1.0625rem]" aria-invalid={error && !name.trim() ? true : undefined} aria-describedby={error ? 'login-error' : undefined} readOnly={busy} value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus />
            </div>
            <div style={{ '--i': 4 }} className="login-rise">
              <FieldLabel icon={LockKey} htmlFor="login-password">Password</FieldLabel>
              <div className="relative">
                <input id="login-password" ref={passBox} name="password" type={show ? 'text' : 'password'} className="field !min-h-14 !rounded-xl !pl-4 !pr-14 !text-[1.0625rem]" aria-invalid={error && name.trim() && !password ? true : undefined} aria-describedby={error ? 'login-error' : undefined} readOnly={busy} onKeyUp={(e) => setCaps(e.getModifierState?.('CapsLock') ?? false)} onBlur={() => setCaps(false)} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                <button type="button" className="btn btn-quiet btn-icon absolute right-0 top-0 h-full" onClick={() => setShow((v) => !v)} aria-pressed={show} aria-label={show ? 'Hide password' : 'Show password'} title={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeSlash size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}
                </button>
              </div>
            </div>
            {caps && !error && (
              <p role="status" className="-mt-1 flex items-center gap-2 text-base text-muted"><WarningCircle size={20} aria-hidden="true" className="shrink-0" />Caps Lock is on</p>
            )}
            {error && <p id="login-error" key={error} role="alert" className="animate-shake rounded-lg bg-danger-soft px-4 py-3 text-base font-medium text-danger">{error}</p>}
            <button type="submit" style={{ '--i': 5, boxShadow: '0 1px 0 rgb(255 255 255 / 0.14) inset, 0 10px 22px -10px rgb(var(--shadow-rgb) / 0.6)' }} className="btn btn-block login-rise bg-bar text-on-ink hover:opacity-90 disabled:opacity-100 !min-h-14 !rounded-xl !text-[1.0625rem]" disabled={busy}>
              {busy ? (
                <span className="inline-flex items-center gap-2" role="status">
                  Signing in
                  <span aria-hidden="true" className="spinner size-4 rounded-full border-2 border-current border-t-transparent" />
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

      </main>
    </>
  );
}
