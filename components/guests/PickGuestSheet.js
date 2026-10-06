import { useState } from 'react';
import { Phone, UserCircle } from '@phosphor-icons/react';
import Sheet from '../Sheet';
import SearchBox from '../SearchBox';
import { useApi, useDebounced } from '../../lib/useApi';

// Step one of merging from a guest's own page: choose the other guest. Guests that look like the same person are listed
// first; anyone else can be found by searching. Choosing only opens the merge screen, which asks before anything changes.
function Option({ g, onPick }) {
  return (
    <li>
      <button type="button" onClick={() => onPick(g.id)} className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-150 hover:bg-surface-2">
        <UserCircle size={28} aria-hidden="true" className="shrink-0 text-muted" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{g.name}</span>
          <span className="flex items-center gap-1 text-sm text-muted">
            {g.phone && <><Phone size={14} aria-hidden="true" />{g.phone}</>}
            {!g.phone && (g.email || g.organization || 'No phone or email')}
          </span>
        </span>
        <span className="shrink-0 font-mono text-sm font-semibold">{g.stays} {Number(g.stays) === 1 ? 'stay' : 'stays'}</span>
      </button>
    </li>
  );
}

export default function PickGuestSheet({ id, onPick, onClose }) {
  const [q, setQ] = useState('');
  const search = useDebounced(q.trim());
  const dupes = useApi('/api/guests/duplicates');
  const found = useApi(search ? `/api/guests?q=${encodeURIComponent(search)}&sort=name` : null);
  const same = (dupes.data ?? []).find((group) => group.guests.some((g) => g.id === Number(id)))?.guests.filter((g) => g.id !== Number(id)) ?? [];
  const results = (found.data ?? []).filter((g) => g.id !== Number(id));

  return (
    <Sheet title="Merge with which guest?" onClose={onClose}>
      <div className="space-y-4 pb-4">
        <p className="text-base leading-relaxed">Choose the other guest. The next screen shows both side by side and asks before anything changes.</p>
        {same.length > 0 && (
          <section aria-label="Looks like the same person" className="overflow-hidden rounded-lg border-2 border-amber-400 bg-amber-50">
            <h3 className="px-3 pt-2 text-base font-semibold">Looks like the same person</h3>
            <ul className="divide-y divide-amber-200">{same.map((g) => <Option key={g.id} g={g} onPick={onPick} />)}</ul>
          </section>
        )}
        <SearchBox value={q} onChange={setQ} label="Search for the other guest" placeholder="Search by name or initials (ZB), phone, email…" />
        {search && (
          results.length === 0 && !found.loading ? (
            <p className="rounded-lg border border-line p-4 text-center text-muted">No other guest matches “{search}”.</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">{results.map((g) => <Option key={g.id} g={g} onPick={onPick} />)}</ul>
          )
        )}
      </div>
    </Sheet>
  );
}
