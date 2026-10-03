import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AccountMenu from './AccountMenu';
import IndiaClock from './IndiaClock';
import { OPEN_ASSISTANT } from './Assistant';
import { CalendarBlank, ChatCircleDots, GearSix, ListBullets, Users } from '@phosphor-icons/react';

const TABS = [
  { href: '/', label: 'Calendar', Icon: CalendarBlank },
  { href: '/bookings', label: 'Bookings', Icon: ListBullets },
  { href: '/guests', label: 'Guests', Icon: Users },
  { href: '/settings', label: 'Settings', Icon: GearSix },
];

// wide: the calendar uses the full screen width; the other pages stay in a readable column.
export default function Layout({ title, wide = false, children }) {
  const max = wide ? 'max-w-none' : 'max-w-[1400px]';
  const { pathname } = useRouter();

  return (
    <>
      <Head>
        <title>{title ? `${title} | Pulse Rooms` : 'Pulse Rooms'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#f3f3ef" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to Main Content
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className={`relative mx-auto flex h-12 ${max} items-center justify-between px-4`}>
          <Link href="/" className="flex shrink-0 items-center gap-2 rounded-lg" aria-label="The Pulse Newtown, Rooms: go to the calendar">
            <Image src="/Pulse-Logo_Final.webp" alt="" width={744} height={380} priority className="h-8 w-auto" />
            <span className="hidden text-sm font-semibold text-muted sm:inline">Rooms</span>
          </Link>
          <IndiaClock />
          <div className="flex items-center gap-2">
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
          {/* Below the desktop width the assistant's button lives here, not floating over the page. */}
          <button type="button" className="btn btn-icon border-transparent lg:hidden" onClick={() => window.dispatchEvent(new Event(OPEN_ASSISTANT))} aria-label="Ask the assistant" title="Ask about rooms and bookings">
            <ChatCircleDots size={20} aria-hidden="true" />
          </button>
          <AccountMenu />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className={`mx-auto ${max} px-4 pb-24 pt-3 outline-none md:pb-6`}>{children}</main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
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
