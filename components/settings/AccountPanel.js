import { useState } from 'react';
import { Check, LockKey, SignOut, UserCircle, WarningCircle } from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import HoldButton from '../HoldButton';
import { FoldSection } from '../FilterParts';
import { api, useApi } from '../../lib/useApi';

// The Account tab of Settings: who you are, a Sign Out button, and a way to change your own password. The name is the one you signed in with (it is also what is recorded
// as who made or changed each booking).
export default function AccountPanel() {
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

  const initial = (name ?? '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="space-y-4">
      {/* Who you are, and the way out: Sign Out is the big button, not a small icon in a corner. */}
      <section className="space-y-4 rounded-lg border border-line bg-surface p-4 sm:p-5" aria-label="Who is signed in">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-lg bg-accent-soft text-3xl font-semibold text-accent-text">{me.loading ? '' : initial}</span>
          <div className="min-w-0 flex-1">
            <p className="text-base text-ink/80">Signed in as</p>
            <p className="break-words text-2xl font-semibold leading-tight">{me.loading ? '…' : name ?? 'Nobody'}</p>
            {!me.loading && !name && <p className="text-base text-ink/80">Sign in is off on this computer.</p>}
          </div>
        </div>
        <p className="rounded-lg bg-surface-2 p-3 text-base leading-relaxed">
          <UserCircle size={18} aria-hidden="true" className="mr-1.5 inline align-text-bottom" />
          Your name is saved on every booking you make or change, so the history shows who did what.
        </p>
        {name && (
          <HoldButton className="btn btn-block btn-block-danger" title="Press and hold to sign out" reminder="Hold the button to sign out" onConfirm={signOut}>
            <SignOut size={22} weight="bold" aria-hidden="true" /> Hold to Sign Out
          </HoldButton>
        )}
      </section>

      {name ? (
        <FoldSection id="account-password" title="Change your password" icon={LockKey}>
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
              {busy ? 'Saving…' : <><LockKey size={18} aria-hidden="true" /> Change Password</>}
            </button>
          </form>
        </FoldSection>
      ) : (
        !me.loading && <p className="rounded-lg border border-line bg-surface p-4 text-base">Passwords are only used when sign in is on. It is off on this computer.</p>
      )}
    </div>
  );
}
