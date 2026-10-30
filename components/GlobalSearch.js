import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Bed, MagnifyingGlass, User } from '@phosphor-icons/react';
import { useApi, useDebounced } from '../lib/useApi';
import { addDays, fmtShort } from '../lib/dates';

// One search box in the header, on the calendar page: type a guest, a company or a phone number and jump to their booking on the
// calendar or to their guest record. "/" or Ctrl+K puts the cursor here. The results are the first few bookings and guests; the
// arrow keys move through them, Enter opens the one marked (or the first), Escape clears the box and keeps the cursor in it.
// It follows the combobox pattern: focus stays in the box and aria-activedescendant names the marked result.
const typing = (el) => el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);

export default function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [mark, setMark] = useState(-1); // the result the arrow keys are on
  const box = useRef(null);
  const input = useRef(null);
  const term = useDebounced(q.trim(), 200);
  const enough = term.length >= 2;
  const fresh = q.trim() === term; // false for a moment while typing: the results on show belong to the last pause
  const bookings = useApi(enough ? `/api/bookings?when=all&q=${encodeURIComponent(term)}` : null).data;
  const guests = useApi(enough ? `/api/guests?q=${encodeURIComponent(term)}` : null).data;
  // A booking in several rooms is one result with all its rooms, not one row per room.
  const stays = [...(Array.isArray(bookings) ? bookings : []).reduce((map, b) => {
    const key = b.group_id ?? `b${b.id}`;
    const hit = map.get(key) ?? { ...b, rooms: [] };
    hit.rooms.push(b.room_number);
    return map.set(key, hit);
  }, new Map()).values()].slice(0, 5);
  const people = (Array.isArray(guests) ? guests : []).slice(0, 4);
  const total = stays.length + people.length;
  const showing = open && enough;

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
  useEffect(() => setMark(-1), [term]);

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
  const toGuest = (g) => go(`/guests?q=${encodeURIComponent(g.name)}`);
  const choose = (i) => {
    if (i < stays.length) return toStay(stays[i]);
    return toGuest(people[i - stays.length]);
  };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!total) return;
      e.preventDefault();
      setOpen(true);
      setMark((m) => (e.key === 'ArrowDown' ? (m + 1) % total : (m - 1 + total) % total));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (total) choose(mark >= 0 ? mark : 0);
      else if (q.trim()) toBookings(q.trim());
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQ('');
    }
  };
  const row = (on) => `flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors duration-150 hover:bg-surface-2 ${on ? 'bg-surface-2' : ''}`;

  return (
    <div ref={box} className="relative mx-auto w-full max-w-md">
      <MagnifyingGlass size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        ref={input}
        type="search"
        name="global-search"
        role="combobox"
        aria-expanded={showing}
        aria-controls={showing ? 'global-search-results' : undefined}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-activedescendant={showing && mark >= 0 ? `gs-opt-${mark}` : undefined}
        aria-label="Search guests and bookings"
        placeholder="Search guests and bookings"
        autoComplete="off"
        spellCheck={false}
        className="field min-h-9 pl-9 pr-9 text-[0.9375rem]"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {!q && <kbd aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line px-1.5 font-mono text-sm leading-5 text-muted">/</kbd>}
      <p className="sr-only" role="status" aria-live="polite">{showing && fresh ? (total ? `${total} ${total === 1 ? 'result' : 'results'}` : 'No results') : ''}</p>
      {open && q.trim().length === 1 && (
        <div className="animate-pop absolute left-0 right-0 top-full z-40 mt-1 rounded-lg border border-line bg-surface p-3 text-base text-muted shadow-lg">Type 2 or more letters.</div>
      )}
      {showing && (
        <div id="global-search-results" role="listbox" aria-label="Search results" className={`animate-pop absolute left-0 right-0 top-full z-40 mt-1 max-h-[70dvh] overflow-y-auto rounded-lg border border-line bg-surface p-2 shadow-lg transition-opacity duration-150 ${fresh ? '' : 'opacity-50'}`}>
          {total === 0 && fresh && <p className="px-2 py-2 text-base text-muted">Nothing matches “{term}”.</p>}
          {stays.length > 0 && (
            <div role="group" aria-label="Bookings">
              <p aria-hidden="true" className="t-group px-2 pt-1">Bookings</p>
              {stays.map((b, i) => (
                <button key={b.group_id ?? b.id} id={`gs-opt-${i}`} type="button" role="option" aria-selected={mark === i} tabIndex={-1} className={row(mark === i)} onClick={() => toStay(b)}>
                  <Bed size={18} aria-hidden="true" className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold">{b.name || 'On hold'}</span>
                    <span className="block text-[0.9375rem] text-muted">{fmtShort(b.check_in)} to {fmtShort(b.check_out)}</span>
                  </span>
                  <span className="max-w-40 shrink-0 break-words text-right font-mono text-[0.9375rem] font-semibold">{[...new Set(b.rooms)].sort().join(', ')}</span>
                </button>
              ))}
            </div>
          )}
          {people.length > 0 && (
            <div role="group" aria-label="Guests">
              <p aria-hidden="true" className="t-group px-2 pt-2">Guests</p>
              {people.map((g, j) => {
                const i = stays.length + j;
                return (
                  <button key={g.id} id={`gs-opt-${i}`} type="button" role="option" aria-selected={mark === i} tabIndex={-1} className={row(mark === i)} onClick={() => toGuest(g)}>
                    <User size={18} aria-hidden="true" className="shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate text-base font-semibold">{g.name}</span>
                    {g.organization && <span className="max-w-32 shrink-0 truncate text-[0.9375rem] text-muted">{g.organization}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
