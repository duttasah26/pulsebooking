import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ExpandableTabs } from './ui/ExpandableTabs';
import IndiaClock from './IndiaClock';
import { OPEN_ASSISTANT } from './Assistant';
import { CalendarBlank, ChatCircleDots, GearSix, ListBullets, UserCircle, Users } from '@phosphor-icons/react';

const TABS = [
  { href: '/', label: 'Calendar', Icon: CalendarBlank },
  { href: '/bookings', label: 'Bookings', Icon: ListBullets },
  { href: '/guests', label: 'Guests', Icon: Users },
  { href: '/settings', label: 'Settings', Icon: GearSix },
  { href: '/settings?tab=account', label: 'Account', Icon: UserCircle }, // far right: who you are, Sign Out and your password
];

// wide: the calendar uses the full screen width; the other pages stay in a readable column.
export default function Layout({ title, wide = false, children }) {
  const max = wide ? 'max-w-none' : 'max-w-[1400px]';
  const { pathname, query } = useRouter();
  // Settings and Account are two tabs of one page, so the current tab says which of the two buttons is lit.
  const here = pathname === '/settings' ? (query.tab === 'account' ? '/settings?tab=account' : '/settings') : pathname;

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
          <ExpandableTabs
            label="Main"
            className="hidden md:flex short:flex"
            tabs={TABS.map(({ href, label, Icon }) => ({ href, title: label, icon: Icon }))}
            activeIndex={TABS.findIndex((t) => t.href === here)}
          />
          {/* Below the desktop width the assistant's button lives here, not floating over the page. */}
          <button type="button" className="btn btn-icon min-h-11 min-w-11 border-transparent lg:hidden" onClick={() => window.dispatchEvent(new Event(OPEN_ASSISTANT))} aria-label="Ask the assistant" title="Ask about rooms and bookings">
            <ChatCircleDots size={24} aria-hidden="true" />
          </button>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className={`mx-auto ${max} px-4 pb-24 pt-3 outline-none md:pb-6 short:pb-3 short:pt-2`}>{children}</main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden short:hidden"
      >
        {TABS.map(({ href, label, Icon }) => {
          const active = here === href;
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
