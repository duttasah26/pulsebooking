import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import { MagnifyingGlass, User, X } from '@phosphor-icons/react';
import { useApi, useDebounced } from '../lib/useApi';
import { addDays, diffDays, fmtShort, nightsLabel, today } from '../lib/dates';
import { STATUS_LABEL } from '../lib/status';
import { roomShade } from '../lib/colors';
import { useSettings } from './SettingsProvider';

// One search box in the header, on the calendar page: type a guest, a company or a phone number and jump to their booking on the
// calendar or to their guest record. "/" or Ctrl+K puts the cursor here. The results are the first few bookings and guests; the
// arrow keys move through them, Enter opens the one marked (or the first), Escape clears the box and keeps the cursor in it.
// It follows the combobox pattern: focus stays in the box and aria-activedescendant names the marked result.
const typing = (el) => el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);

export default function GlobalSearch() {
  const router = useRouter();
  const { settings } = useSettings();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [mark, setMark] = useState(-1); // the result the arrow keys are on
  const box = useRef(null);
  const input = useRef(null);
  const term = useDebounced(q.trim(), 200);
  const enough = term.length >= 2;
  const fresh = q.trim() === term; // false for a moment while typing: the results on show belong to the last pause
  const bookingsReq = useApi(enough ? `/api/bookings?when=all&q=${encodeURIComponent(term)}` : null);
  const bookings = bookingsReq.data;
  const guestsReq = useApi(enough ? `/api/guests?q=${encodeURIComponent(term)}` : null);
  const guests = guestsReq.data;
  // A booking in several rooms is one result with all its rooms, not one row per room. Stays that are on now or still to come list
  // first (soonest first), then past stays (latest first), the way the desk asks: who is here, who is coming.
  const todayStr = today();
  const hits = [...(Array.isArray(bookings) ? bookings : []).reduce((map, b) => {
    const key = b.group_id ?? `b${b.id}`;
    const hit = map.get(key) ?? { ...b, rooms: [] };
    hit.rooms.push(b.room_number);
    return map.set(key, hit);
  }, new Map()).values()];
  const current = hits.filter((b) => b.check_out >= todayStr).sort((a, b) => (a.check_in < b.check_in ? -1 : 1)).slice(0, 6);
  const past = hits.filter((b) => b.check_out < todayStr).sort((a, b) => (a.check_in < b.check_in ? 1 : -1)).slice(0, 4);
  const stays = [...current, ...past];
  const people = (Array.isArray(guests) ? guests : []).slice(0, 4);
  const total = stays.length + people.length;
  const searching = enough && !bookingsReq.error && !guestsReq.error && (bookingsReq.loading || guestsReq.loading || bookings === null || guests === null); // the answer is still on its way: say nothing yet, not "Nothing matches"
  const showing = open && enough;

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === '/' && !typing(document.activeElement) && !e.ctrlKey && !e.metaKey) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    const away = (e) => !box.current?.contains(e.target) && !e.target.closest?.('[data-gs-panel]') && setOpen(false);
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
  const row = (on) => `row-in flex min-h-14 w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors duration-150 hover:bg-surface-2 ${on ? 'bg-surface-2' : ''}`;
  // The results are a panel of their own, as wide as a booking line needs, over a dimmed calendar; the box in the header stays put.
  const panel = 'animate-pop fixed inset-x-4 top-14 z-40 mx-auto flex max-h-[min(34rem,calc(100dvh-4.5rem))] max-w-[40rem] flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-lg';
  const heading = (text, first) => <p aria-hidden="true" className={`t-group px-2 pb-1 ${first ? 'pt-1' : 'pt-3'}`}>{text}</p>;
  const RoomTag = ({ n }) => {
    const shade = roomShade({ number: n }, settings);
    return (
      <span className="rounded-md px-2 py-0.5 font-mono text-[0.9375rem] font-semibold leading-5 text-ink" style={{ backgroundColor: shade.fill, boxShadow: `inset 0 0 0 1px ${shade.edge}` }}>
        {n}
      </span>
    );
  };
  const stayRow = (b, i) => {
    const hold = b.status === 'on_hold';
    const done = b.status === 'cancelled' || b.status === 'checked_out';
    const nights = diffDays(b.check_in, b.check_out);
    const rooms = [...new Set(b.rooms)].sort();
    return (
      <button key={b.group_id ?? b.id} style={{ '--i': i }} id={`gs-opt-${i}`} type="button" role="option" aria-selected={mark === i} tabIndex={-1} className={row(mark === i)} onClick={() => toStay(b)}>
        <span className="min-w-0 flex-1 px-1">
          <span className={`block truncate text-base font-semibold ${done ? 'text-muted' : ''}`}>
            {b.name || 'On hold'}{b.organization && b.organization !== b.name ? <span className="ml-2 font-normal text-muted">{b.organization}</span> : null}
          </span>
          <span className="block text-[0.9375rem] text-muted">
            {fmtShort(b.check_in)} to {fmtShort(b.check_out)}, {nightsLabel(nights)}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1">
            {rooms.slice(0, 6).map((n) => <RoomTag key={n} n={n} />)}
            {rooms.length > 6 && <span className="px-1 font-mono text-[0.9375rem] text-muted">+{rooms.length - 6}</span>}
          </span>
        </span>
        {b.status !== 'confirmed' && (
          <span className={`shrink-0 text-[0.9375rem] ${hold ? 'rounded-md border border-dashed border-hold-edge bg-hold px-2 py-0.5 font-semibold text-hold-ink' : 'text-muted'}`}>
            {STATUS_LABEL[b.status] ?? b.status}
          </span>
        )}
      </button>
    );
  };

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
        className="field pl-9 pr-10 text-[0.9375rem] [&::-webkit-search-cancel-button]:hidden"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {q && (
        <button type="button" aria-label="Clear search" className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-tint hover:text-ink" onClick={() => { setQ(''); input.current?.focus(); }}>
          <X size={16} aria-hidden="true" />
        </button>
      )}
      {!q && <kbd aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line px-1.5 font-mono text-sm leading-5 text-muted">/</kbd>}
      <p className="sr-only" role="status" aria-live="polite">{showing && fresh && !searching ? (total ? `${total} ${total === 1 ? 'result' : 'results'}` : 'No results') : ''}</p>
      {open && typeof document !== 'undefined' && createPortal(
        <>
      {open && (showing || q.trim().length === 1) && <div aria-hidden="true" className="fixed inset-x-0 bottom-0 top-13 z-30 bg-ink/20" />}
      {open && q.trim().length === 1 && (
        <div data-gs-panel className={`${panel} p-4 text-base text-muted`}>Type 2 or more letters.</div>
      )}
      {showing && !(searching && total === 0) && (
        <div data-gs-panel className={panel}>
          <div id="global-search-results" role="listbox" aria-label="Search results" className={`min-h-0 flex-1 overflow-y-auto p-2 transition-opacity duration-150 ${fresh ? '' : 'opacity-50'}`}>
            {total === 0 && fresh && !searching && <p className="px-2 py-2 text-base text-muted">Nothing matches “{term}”.</p>}
            {current.length > 0 && (
              <div role="group" aria-label="Staying and arriving">
                {heading('Staying and arriving', true)}
                {current.map((b, i) => stayRow(b, i))}
              </div>
            )}
            {past.length > 0 && (
              <div role="group" aria-label="Past stays">
                {heading('Past stays', current.length === 0)}
                {past.map((b, i) => stayRow(b, current.length + i))}
              </div>
            )}
            {people.length > 0 && (
              <div role="group" aria-label="Guests">
                {heading('Guests', stays.length === 0)}
                {people.map((g, j) => {
                  const i = stays.length + j;
                  return (
                    <button key={g.id} style={{ '--i': i }} id={`gs-opt-${i}`} type="button" role="option" aria-selected={mark === i} tabIndex={-1} className={row(mark === i)} onClick={() => toGuest(g)}>
                      <User size={18} aria-hidden="true" className="shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate text-base font-semibold">{g.name}</span>
                      {g.organization && <span className="max-w-48 shrink-0 truncate text-[0.9375rem] text-muted">{g.organization}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
        </>,
        document.body,
      )}
    </div>
  );
}
