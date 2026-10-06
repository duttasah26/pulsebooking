import { useEffect, useState } from 'react';
import { Buildings, Envelope, MagnifyingGlass, Phone, Plus, User, UserCircle, ArrowLeft, UserSwitch } from '@phosphor-icons/react';
import FieldLabel from './FieldLabel';
import ColorPicker from './booking/ColorPicker';
import { useApi, useDebounced } from '../lib/useApi';
import { fmtDayMonthYear } from '../lib/dates';
import { resolveColor } from '../lib/colors';

const contact = (g) => [g.phone, g.email].filter(Boolean).join(', ');

/*
  Pick an existing guest or add a new one.
  Names are not unique, so matches show phone / email and the last stay.
  onChange receives { guestId, guest } for an existing guest, { newGuest: {name, phone, email, organization, color} } for a new one,
  or null while nothing valid is chosen.
*/
export default function GuestPicker({ initial, onChange, onQuery, tone }) {
  const [selected, setSelected] = useState(initial ?? null);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', phone: '', email: '', organization: '', color: null });

  const debounced = useDebounced(query.trim());
  const search = useApi(!selected && !adding && debounced.length >= 2 ? `/api/guests?q=${encodeURIComponent(debounced)}` : null);
  const matches = (search.data ?? []).slice(0, 6);

  // Lets a hold use whatever was typed here as its label, even if no guest was picked.
  useEffect(() => {
    onQuery?.(selected ? '' : adding ? draft.name : query.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selected, adding, draft.name]);

  useEffect(() => {
    if (selected) onChange({ guestId: selected.id, guest: selected });
    else if (adding && draft.name.trim()) onChange({ newGuest: draft });
    else onChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, adding, draft]);

  if (selected) {
    return (
      <div>
        <FieldLabel icon={User} as="span" hidden>Guest</FieldLabel>
        <div
          className="flex items-center gap-3 rounded-lg border border-line p-3"
          style={(tone ?? resolveColor(selected.color)) ? { backgroundColor: (tone ?? resolveColor(selected.color)).bg, borderColor: (tone ?? resolveColor(selected.color)).border } : undefined}
        >
          <UserCircle size={28} className="shrink-0 text-muted" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{selected.name}</p>
            <p className="truncate text-sm text-muted">
              {[contact(selected) || 'No phone or email', selected.organization].filter(Boolean).join(', ')}
            </p>
          </div>
          <button type="button" className="btn" onClick={() => { setSelected(null); setQuery(''); }}>
            <UserSwitch size={18} aria-hidden="true" /> Change
          </button>
        </div>
      </div>
    );
  }

  if (adding) {
    const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });
    return (
      <fieldset className="space-y-3">
        <FieldLabel icon={User} as="legend">New Guest</FieldLabel>
        <div>
          <FieldLabel icon={User} htmlFor="ng-name">Name</FieldLabel>
          <input id="ng-name" name="guest-name" className="field" value={draft.name} onChange={set('name')} autoComplete="off" autoFocus />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel icon={Phone} htmlFor="ng-phone">Phone (optional)</FieldLabel>
            <input id="ng-phone" name="guest-phone" type="tel" inputMode="tel" className="field" value={draft.phone} onChange={set('phone')} autoComplete="off" placeholder="+91 98450 12345" />
          </div>
          <div>
            <FieldLabel icon={Envelope} htmlFor="ng-email">Email (optional)</FieldLabel>
            <input id="ng-email" name="guest-email" type="email" inputMode="email" className="field" value={draft.email} onChange={set('email')} autoComplete="off" spellCheck={false} placeholder="name@example.com" />
          </div>
        </div>
        <div>
          <FieldLabel icon={Buildings} htmlFor="ng-org">Organization (optional)</FieldLabel>
          <input id="ng-org" name="guest-organization" className="field" value={draft.organization} onChange={set('organization')} autoComplete="off" />
        </div>
        <ColorPicker
          id="ng-color-label"
          label="Guest Colour (optional)"
          autoLabel="None"
          hint="Their bookings use this colour on the calendar. None uses the status colour."
          color={draft.color}
          onChange={(color) => setDraft({ ...draft, color })}
        />
        <p className="text-sm text-muted">Phone and email are optional. Add one if two guests share a name.</p>
        <button type="button" className="btn" onClick={() => { setAdding(false); setQuery(draft.name); }}>
          <ArrowLeft size={18} aria-hidden="true" /> Back to Search
        </button>
      </fieldset>
    );
  }

  return (
    <div>
      <FieldLabel icon={User} htmlFor="guest-search" hidden>Guest</FieldLabel>
      <div className="relative">
        <MagnifyingGlass size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          id="guest-search"
          name="guest-search"
          type="search"
          spellCheck={false}
          className="field pl-10"
          placeholder="Search by name, phone or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>
      {debounced.length >= 2 && (
        <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
          {matches.map((g) => (
            <li key={g.id}>
              <button type="button" className="flex min-h-14 w-full flex-col items-start justify-center px-3 py-2 text-left hover:bg-surface-2" onClick={() => setSelected(g)}>
                <span className="font-medium">{g.name}</span>
                <span className="text-sm text-muted">
                  {contact(g) || 'No phone or email'}
                  {g.organization ? `, ${g.organization}` : ''}
                  {Number(g.stays) > 0 && `, ${g.stays} stay${Number(g.stays) === 1 ? '' : 's'}, last ${fmtDayMonthYear(g.last_check_in)}`}
                </span>
              </button>
            </li>
          ))}
          {search.loading && matches.length === 0 && <li className="px-3 py-3 text-sm text-muted">Searching…</li>}
          <li>
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left font-medium text-accent-text hover:bg-surface-2"
              onClick={() => { setAdding(true); setDraft({ name: query.trim(), phone: '', email: '', organization: '', color: null }); }}
            >
              <Plus size={18} aria-hidden="true" /> Add &ldquo;{query.trim()}&rdquo; as a New Guest
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
