import { useEffect, useState } from 'react';
import { MagnifyingGlass, Plus, UserCircle } from '@phosphor-icons/react';
import { useApi, useDebounced } from '../lib/useApi';
import { fmtDayMonthYear } from '../lib/dates';

const contact = (g) => [g.phone, g.email].filter(Boolean).join(', ');

/*
  Pick an existing guest or add a new one.
  Names are not unique, so matches show phone / email and the last stay.
  onChange receives { guestId, guest } for an existing guest, { newGuest: {name, phone, email, organization} } for a new one,
  or null while nothing valid is chosen.
*/
export default function GuestPicker({ initial, onChange }) {
  const [selected, setSelected] = useState(initial ?? null);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', phone: '', email: '', organization: '' });

  const debounced = useDebounced(query.trim());
  const search = useApi(!selected && !adding && debounced.length >= 2 ? `/api/guests?q=${encodeURIComponent(debounced)}` : null);
  const matches = (search.data ?? []).slice(0, 6);

  useEffect(() => {
    if (selected) onChange({ guestId: selected.id, guest: selected });
    else if (adding && draft.name.trim() && (draft.phone.trim() || draft.email.trim())) onChange({ newGuest: draft });
    else onChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, adding, draft]);

  if (selected) {
    return (
      <div>
        <span className="label">Guest</span>
        <div className="flex items-center gap-3 rounded-lg border border-line p-3">
          <UserCircle size={28} className="shrink-0 text-muted" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{selected.name}</p>
            <p className="truncate text-sm text-muted">
              {[contact(selected) || 'No contact saved', selected.organization].filter(Boolean).join(', ')}
            </p>
          </div>
          <button type="button" className="btn" onClick={() => { setSelected(null); setQuery(''); }}>
            Change
          </button>
        </div>
      </div>
    );
  }

  if (adding) {
    const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });
    return (
      <fieldset className="space-y-3">
        <legend className="label">New guest</legend>
        <div>
          <label className="label" htmlFor="ng-name">Name</label>
          <input id="ng-name" className="field" value={draft.name} onChange={set('name')} autoComplete="off" autoFocus />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ng-phone">Phone</label>
            <input id="ng-phone" type="tel" inputMode="tel" className="field" value={draft.phone} onChange={set('phone')} />
          </div>
          <div>
            <label className="label" htmlFor="ng-email">Email</label>
            <input id="ng-email" type="email" inputMode="email" className="field" value={draft.email} onChange={set('email')} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="ng-org">Organization (optional)</label>
          <input id="ng-org" className="field" value={draft.organization} onChange={set('organization')} autoComplete="off" />
        </div>
        <p className="text-sm text-muted">Phone or email is needed so guests with the same name can be told apart.</p>
        <button type="button" className="btn" onClick={() => { setAdding(false); setQuery(draft.name); }}>
          Back to search
        </button>
      </fieldset>
    );
  }

  return (
    <div>
      <label className="label" htmlFor="guest-search">Guest</label>
      <div className="relative">
        <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          id="guest-search"
          className="field pl-10"
          placeholder="Search by name, phone or email"
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
                  {contact(g) || 'No contact saved'}
                  {g.organization ? `, ${g.organization}` : ''}
                  {Number(g.stays) > 0 && `, ${g.stays} stay${Number(g.stays) === 1 ? '' : 's'}, last ${fmtDayMonthYear(g.last_check_in)}`}
                </span>
              </button>
            </li>
          ))}
          {search.loading && matches.length === 0 && <li className="px-3 py-3 text-sm text-muted">Searching...</li>}
          <li>
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left font-medium text-accent hover:bg-surface-2"
              onClick={() => { setAdding(true); setDraft({ name: query.trim(), phone: '', email: '', organization: '' }); }}
            >
              <Plus size={18} /> Add &ldquo;{query.trim()}&rdquo; as a new guest
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
