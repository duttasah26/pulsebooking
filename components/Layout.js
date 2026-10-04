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
        <div className={`mx-auto grid h-14 short:h-12 ${max} grid-cols-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)] items-center px-4`}>
          <Link href="/" className="flex shrink-0 items-center gap-2 justify-self-start rounded-lg" aria-label="The Pulse Newtown, Rooms: go to the calendar">
            <Image src="/Pulse-Logo_Final.webp" alt="" width={744} height={380} priority className="h-8 w-auto" />
                      </Link>
          <IndiaClock />
          <div className="flex shrink-0 items-center gap-2 justify-self-end short:gap-1">
          <nav className="hidden gap-1 md:flex short:flex short:gap-0.5" aria-label="Main">
            {TABS.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  aria-label={label}
                  title={label}
                  className={`btn btn-icon min-h-11 min-w-11 lg:min-h-11 lg:min-w-11 ${active ? 'border-accent bg-accent-soft' : 'border-transparent'}`}
                >
                  <Icon size={24} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
                </Link>
              );
            })}
          </nav>
          {/* Below the desktop width the assistant's button lives here, not floating over the page. */}
          <button type="button" className="btn btn-icon min-h-11 min-w-11 border-transparent lg:hidden" onClick={() => window.dispatchEvent(new Event(OPEN_ASSISTANT))} aria-label="Ask the assistant" title="Ask about rooms and bookings">
            <ChatCircleDots size={24} aria-hidden="true" />
          </button>
          <AccountMenu />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className={`mx-auto ${max} px-4 pb-24 pt-3 outline-none md:pb-6 short:pb-3 short:pt-2`}>{children}</main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden short:hidden"
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
