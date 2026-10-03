import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { CalendarBlank, ListBullets, Users } from '@phosphor-icons/react';

const TABS = [
  { href: '/', label: 'Calendar', Icon: CalendarBlank },
  { href: '/bookings', label: 'Bookings', Icon: ListBullets },
  { href: '/guests', label: 'Guests', Icon: Users },
];

export default function Layout({ title, children }) {
  const { pathname } = useRouter();

  return (
    <>
      <Head>
        <title>{title ? `${title} | Pulse Rooms` : 'Pulse Rooms'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>

      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4">
          <span className="text-base font-semibold tracking-tight">Pulse Rooms</span>
          <nav className="hidden gap-1 md:flex" aria-label="Main">
            {TABS.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`btn border-transparent ${active ? 'bg-accent-soft' : ''}`}
                >
                  <Icon size={18} weight={active ? 'fill' : 'regular'} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-4 md:pb-8">{children}</main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                active ? 'text-accent-text' : 'text-muted'
              }`}
            >
              <Icon size={22} weight={active ? 'fill' : 'regular'} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
