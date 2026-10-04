import { useState } from 'react';
import { Check, LockKey, SignOut, UserCircle, WarningCircle } from '@phosphor-icons/react';
import Layout from '../components/Layout';
import FieldLabel from '../components/FieldLabel';
import { api, useApi } from '../lib/useApi';

// Who you are, and a way to change your own password. The name is the one you signed in with (it is also what is recorded
// as who made or changed each booking).
export default function Account() {
  const me = useApi('/api/account');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const name = me.data?.name;
  const mismatch = again && next !== again;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setDone(false);
    if (next !== again) return setError('The two new passwords are not the same.');
    setBusy(true);
    try {
      await api('/api/account', { method: 'PATCH', body: { current, next } });
      setCurrent('');
      setNext('');
      setAgain('');
      setDone(true);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const signOut = async () => {
    await fetch('/api/logout', { method: 'POST' }).catch(() => {});
    window.location.assign('/login');
  };

  return (
    <Layout title="Your Account">
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-lg font-semibold">Your Account</h1>

        <section className="flex items-center gap-4 rounded-lg border border-line bg-surface p-4">
          <UserCircle size={56} weight="fill" aria-hidden="true" className="shrink-0 text-muted" />
          <div className="min-w-0 flex-1">
            <p className="text-base text-ink/70">Signed in as</p>
            <p className="break-words text-xl font-semibold leading-tight">{me.loading ? '…' : name ?? 'Nobody (sign in is off)'}</p>
            <p className="mt-1 text-sm text-ink/70">This name is saved on every booking you make or change.</p>
          </div>
          {name && (
            <button type="button" className="btn shrink-0 gap-1.5 px-3" onClick={signOut}>
              <SignOut size={18} aria-hidden="true" /> Sign Out
            </button>
          )}
        </section>

        {name ? (
          <section className="space-y-4 rounded-lg border border-line bg-surface p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <LockKey size={18} aria-hidden="true" /> Change Your Password
            </h2>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <FieldLabel icon={LockKey} htmlFor="acc-current">Password now</FieldLabel>
                <input id="acc-current" name="current-password" type="password" className="field" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
              </div>
              <div>
                <FieldLabel icon={LockKey} htmlFor="acc-next">New password</FieldLabel>
                <input id="acc-next" name="new-password" type="password" className="field" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
                <p className="mt-1 text-sm text-ink/70">At least 8 characters. A few words in a row is easy to remember.</p>
              </div>
              <div>
                <FieldLabel icon={LockKey} htmlFor="acc-again">New password again</FieldLabel>
                <input id="acc-again" name="new-password-again" type="password" className="field" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" aria-invalid={Boolean(mismatch)} />
                {mismatch && <p className="mt-1 text-sm text-danger">These two are not the same yet.</p>}
              </div>
              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-lg border border-danger px-3 py-2 text-base text-danger">
                  <WarningCircle size={20} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" /> {error}
                </p>
              )}
              {done && (
                <p role="status" className="flex items-center gap-2 rounded-lg border-2 border-accent bg-accent-soft px-3 py-2 text-base">
                  <Check size={20} weight="bold" aria-hidden="true" className="shrink-0 text-accent-text" /> Your password is changed. Use the new one next time you sign in.
                </p>
              )}
              <button type="submit" className="btn btn-primary w-full" disabled={busy || !current || !next || !again || Boolean(mismatch)}>
                {busy ? 'Saving…' : 'Change Password'}
              </button>
            </form>
          </section>
        ) : (
          !me.loading && <p className="rounded-lg border border-line bg-surface p-4 text-base">Passwords are only used when sign in is on. It is off on this computer.</p>
        )}
      </div>
    </Layout>
  );
}
