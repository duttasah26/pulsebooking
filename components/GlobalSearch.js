import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Bed, MagnifyingGlass, User } from '@phosphor-icons/react';
import { useApi, useDebounced } from '../lib/useApi';
import { addDays, fmtShort } from '../lib/dates';

// One search box in the header, on every page: type a guest, a company or a phone number and jump to their bookings or their
// guest record. "/" or Ctrl+K puts the cursor here from anywhere. Results are the first few bookings and guests; Enter takes the
// first one, or shows every match on the Bookings page.
const typing = (el) => el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);

export default function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const input = useRef(null);
  const term = useDebounced(q.trim(), 200);
  const enough = term.length >= 2;
  const bookings = useApi(enough ? `/api/bookings?when=all&q=${encodeURIComponent(term)}` : null).data;
  const guests = useApi(enough ? `/api/guests?q=${encodeURIComponent(term)}` : null).data;
  const stays = (Array.isArray(bookings) ? bookings : []).slice(0, 5);
  const people = (Array.isArray(guests) ? guests : []).slice(0, 4);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === '/' && !typing(document.activeElement) && !e.ctrlKey && !e.metaKey) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    const away = (e) => !box.current?.contains(e.target) && setOpen(false);
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', away);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', away);
    };
  }, []);

  const go = (path) => {
    setOpen(false);
    setQ('');
    input.current?.blur();
    router.push(path);
  };
  const toBookings = (text) => go(`/bookings?tab=all&q=${encodeURIComponent(text)}`);
  // A booking opens on the calendar: the timeline starts a few days before its check-in, and the booking opens in the side panel
  // (so its bar is lit on the grid).
  const toStay = (b) => go(`/?view=timeline&date=${addDays(b.check_in, -3)}&span=21&open=${b.id}`);
  const first = () => {
    if (stays[0]) return toStay(stays[0]);
    if (people[0]) return go(`/guests?q=${encodeURIComponent(people[0].name)}`);
    if (q.trim()) return toBookings(q.trim());
  };
  const row = 'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors duration-150 hover:bg-surface-2';

  return (
    <div ref={box} className="relative mx-auto w-full max-w-md">
      <MagnifyingGlass size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        ref={input}
        type="search"
        name="global-search"
        role="combobox"
        aria-expanded={open && enough}
        aria-controls="global-search-results"
        aria-label="Search guests and bookings"
        placeholder="Search guests and bookings"
        autoComplete="off"
        spellCheck={false}
        className="field min-h-9 pl-9 pr-9 text-[0.9375rem]"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); first(); }
          if (e.key === 'Escape') { setOpen(false); e.currentTarget.blur(); }
        }}
      />
      {!q && <kbd aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line px-1.5 font-mono text-sm leading-5 text-muted">/</kbd>}
      {open && enough && (
        <div id="global-search-results" role="listbox" aria-label="Search results" className="animate-pop absolute left-0 right-0 top-full z-40 mt-1 max-h-[70dvh] overflow-y-auto rounded-lg border border-line bg-surface p-2 shadow-lg">
          {stays.length === 0 && people.length === 0 && <p className="px-2 py-2 text-base text-muted">Nothing matches “{term}”.</p>}
          {stays.length > 0 && (
            <>
              <p className="t-group px-2 pt-1">Bookings</p>
              {stays.map((b) => (
                <button key={b.id} type="button" role="option" className={row} onClick={() => toStay(b)}>
                  <Bed size={18} aria-hidden="true" className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold">{b.name || 'On hold'}</span>
                    <span className="block text-[0.9375rem] text-muted">{fmtShort(b.check_in)} to {fmtShort(b.check_out)}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[0.9375rem] font-semibold">{b.room_number}</span>
                </button>
              ))}
            </>
          )}
          {people.length > 0 && (
            <>
              <p className="t-group px-2 pt-2">Guests</p>
              {people.map((g) => (
                <button key={g.id} type="button" role="option" className={row} onClick={() => go(`/guests?q=${encodeURIComponent(g.name)}`)}>
                  <User size={18} aria-hidden="true" className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate text-base font-semibold">{g.name}</span>
                  {g.organization && <span className="max-w-32 shrink-0 truncate text-[0.9375rem] text-muted">{g.organization}</span>}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
