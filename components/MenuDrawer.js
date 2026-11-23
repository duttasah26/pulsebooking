import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Buildings, CalendarDots, GearSix, Rows, Sun, UserCircle, Users, X } from '@phosphor-icons/react';
import { TABS as BOOKING_LISTS } from './bookings/bookingTabs';
import { useLeave } from './useLeave';

// The menu behind the burger in an upright phone's header: a drawer from the left with the places a phone is used for most,
// one tap each: the booking lists (this week, in house, on hold), the calendar's views, the guests and companies, and the settings.
// It closes on a link, its X, a tap outside or Escape. Focus moves in, stays in, and goes back to the burger when it closes.
const LISTS = ['week', 'current', 'upcoming', 'hold', 'month'];
const GROUPS = [
  {
    title: 'Bookings',
    items: LISTS.map((key) => BOOKING_LISTS.find((t) => t.key === key)).map(({ key, label, Icon }) => ({ href: `/bookings?tab=${key}`, label, Icon })),
  },
  {
    title: 'Calendar',
    items: [
      { href: '/?view=timeline', label: 'Timeline', Icon: Rows },
      { href: '/?view=calendar', label: 'Occupancy', Icon: CalendarDots },
      { href: '/?view=day', label: 'Day', Icon: Sun },
    ],
  },
  {
    title: 'Guests',
    items: [
      { href: '/guests', label: 'Guests', Icon: Users },
      { href: '/guests?tab=companies', label: 'Companies', Icon: Buildings },
    ],
  },
  {
    title: 'You',
    items: [
      { href: '/settings', label: 'Settings', Icon: GearSix },
      { href: '/settings?tab=account', label: 'Account', Icon: UserCircle },
    ],
  },
];

export default function MenuDrawer({ onClose: closeNow }) {
  const [leaving, onClose] = useLeave(closeNow);
  const root = useRef(null);

  useEffect(() => {
    const before = document.activeElement;
    root.current?.focus({ preventScroll: true });
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      // A tap does not always focus the burger, so it gets the focus back when nothing else had it.
      const back = before && before !== document.body ? before : document.querySelector('header button[aria-label="Menu"]');
      back?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  const keepFocus = (e) => {
    if (e.key !== 'Tab' || !root.current) return;
    const items = [...root.current.querySelectorAll('a[href], button:not([tabindex="-1"])')];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === root.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Menu" onKeyDown={keepFocus}>
      <button type="button" aria-label="Close" tabIndex={-1} className={`absolute inset-0 bg-[rgb(var(--shadow-rgb)/0.35)] ${leaving ? 'animate-fade-out' : 'animate-fade'}`} onClick={onClose} />
      <nav
        ref={root}
        tabIndex={-1}
        aria-label="Menu"
        className={`${leaving ? 'animate-drawer-out' : 'animate-drawer'} absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-surface pb-[var(--app-bottom)] pl-[env(safe-area-inset-left)] pt-[var(--app-top)] shadow-lg outline-none`}
      >
        <div className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-4">
          <h2 className="t-title">Menu</h2>
          <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Close the menu">
            <X size={20} weight="bold" />
          </button>
        </div>
        <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto overscroll-contain px-2 py-4">
          {GROUPS.map(({ title, items }) => (
            <section key={title} aria-label={title}>
              <h3 className="t-group px-3 pb-1">{title}</h3>
              <ul>
                {items.map(({ href, label, Icon }) => (
                  <li key={href}>
                    <Link href={href} onClick={onClose} className="flex min-h-12 items-center gap-3 rounded-md px-3 text-base font-medium text-ink transition-colors duration-150 hover:bg-surface-2 active:bg-surface-2">
                      <Icon size={20} aria-hidden="true" className="shrink-0 text-muted" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </nav>
    </div>
  );
}
