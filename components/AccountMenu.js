import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SignOut, UserCircle } from '@phosphor-icons/react';

// Shows who is signed in, with a sign-out button. Shows nothing when login is off (local development).
export default function AccountMenu() {
  const [me, setMe] = useState(null);
  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then(setMe).catch(() => {});
  }, []);
  const { pathname } = useRouter();
  if (!me?.loginRequired || !me.name) return null;

  const signOut = async () => {
    await fetch('/api/logout', { method: 'POST' }).catch(() => {});
    window.location.assign('/login');
  };
  return (
    <div className="flex items-center gap-1.5">
      {/* Who is signed in: an icon that opens your account (your name, and changing your password). */}
      <Link
        href="/account"
        aria-label={`Your account: signed in as ${me.name}`}
        aria-current={pathname === '/account' ? 'page' : undefined}
        title={`Signed in as ${me.name}. Open your account`}
        className={`btn btn-icon min-h-11 min-w-11 lg:min-h-11 lg:min-w-11 ${pathname === '/account' ? 'border-accent bg-accent-soft' : 'border-transparent'}`}
      >
        <UserCircle size={26} weight="fill" aria-hidden="true" />
      </Link>
      <button type="button" className="btn btn-icon min-h-11 min-w-11 border-transparent lg:min-h-11 lg:min-w-11" onClick={signOut} aria-label={`Sign out ${me.name}`} title={`Signed in as ${me.name}. Sign out`}>
        <SignOut size={22} aria-hidden="true" />
      </button>
    </div>
  );
}
