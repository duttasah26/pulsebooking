import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import IndiaClock from './IndiaClock';
import { OPEN_ASSISTANT } from './Assistant';
import { CalendarBlank, ChatCircleDots, GearSix, ListBullets, UserCircle, Users } from '@phosphor-icons/react';

// The three places staff work in, named in words on every screen wide enough for them.
const PLACES = [
  { href: '/', label: 'Calendar', Icon: CalendarBlank },
  { href: '/bookings', label: 'Bookings', Icon: ListBullets },
  { href: '/guests', label: 'Guests', Icon: Users },
];
// Settings and the signed-in account sit apart, at the far right, as they are visited rarely.
const UTILITY = [
  { href: '/settings', label: 'Settings', Icon: GearSix },
  { href: '/settings?tab=account', label: 'Account', Icon: UserCircle },
];
// The phone's tab bar holds all five.
const TABS = [...PLACES, ...UTILITY];

// wide: the calendar uses the full screen width; the other pages stay in a readable column.
export default function Layout({ title, wide = false, children }) {
  const max = wide ? 'max-w-none' : 'max-w-[1280px]';
  const { pathname, query } = useRouter();
  // Settings and Account are two tabs of one page, so the current tab says which of the two is lit.
  const here = pathname === '/settings' ? (query.tab === 'account' ? '/settings?tab=account' : '/settings') : pathname;

  return (
    <>
      <Head>
        <title>{title ? `${title} | Pulse Rooms` : 'Pulse Rooms'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-base focus:font-semibold focus:shadow-lg"
      >
        Skip to Main Content
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-sm">
        <div className={`mx-auto flex h-14 short:h-12 ${max} items-center gap-4 px-4 md:px-6`}>
          <Link href="/" className="flex shrink-0 items-center rounded-md" aria-label="The Pulse Newtown, Rooms: go to the calendar">
            <Image src="/Pulse-Logo_Final.webp" alt="" width={744} height={380} priority className="h-7 w-auto" />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex short:flex">
            {PLACES.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={here === href ? 'page' : undefined}
                title={label}
                className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 lg:min-h-9 text-[0.9375rem] transition-colors duration-150 short:px-2.5 ${
                  here === href ? 'bg-tint font-semibold text-ink' : 'font-medium text-muted hover:bg-tint hover:text-ink'
                }`}
              >
                <Icon size={18} weight={here === href ? 'fill' : 'bold'} className="hidden lg:block" />
                <span className="short:sr-only">{label}</span>
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <IndiaClock />
            <span aria-hidden="true" className="mx-2 hidden h-6 w-px bg-line lg:block" />
            {UTILITY.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                aria-label={label}
                title={label}
                aria-current={here === href ? 'page' : undefined}
                className={`btn btn-quiet btn-icon hidden md:inline-flex short:inline-flex ${here === href ? 'text-accent-text' : 'text-muted'}`}
              >
                <Icon size={22} weight={here === href ? 'fill' : 'bold'} />
              </Link>
            ))}
            {/* Below the desktop width the assistant opens from here, not from a button floating over the page. */}
            <button type="button" className="btn btn-quiet btn-icon text-muted lg:hidden" onClick={() => window.dispatchEvent(new Event(OPEN_ASSISTANT))} aria-label="Ask the assistant" title="Ask about rooms and bookings">
              <ChatCircleDots size={22} />
            </button>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className={`mx-auto ${max} px-4 pb-28 pt-4 outline-none md:px-6 md:pb-8 md:pt-4 short:pb-3 short:pt-2`}>{children}</main>

      {/* Phone tab bar: five places, a filled symbol and an emerald label for the one you are on. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden short:hidden"
      >
        {TABS.map(({ href, label, Icon }) => {
          const active = here === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.8125rem] leading-4 ${active ? 'font-semibold text-accent-text' : 'font-medium text-muted'}`}
            >
              <Icon size={24} weight={active ? 'fill' : 'bold'} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
