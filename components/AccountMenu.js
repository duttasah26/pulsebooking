import { useEffect, useState } from 'react';
import { SignOut } from '@phosphor-icons/react';

// Shows who is signed in, with a sign-out button. Shows nothing when login is off (local development).
export default function AccountMenu() {
  const [me, setMe] = useState(null);
  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then(setMe).catch(() => {});
  }, []);
  if (!me?.loginRequired || !me.name) return null;

  const signOut = async () => {
    await fetch('/api/logout', { method: 'POST' }).catch(() => {});
    window.location.assign('/login');
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className="hidden max-w-32 truncate text-sm text-muted sm:inline">{me.name}</span>
      <button type="button" className="btn btn-icon border-transparent" onClick={signOut} aria-label={`Sign out ${me.name}`} title={`Signed in as ${me.name}. Sign out`}>
        <SignOut size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
