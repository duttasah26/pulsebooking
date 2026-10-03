import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import Layout from '../components/Layout';
import FilterDock from '../components/FilterDock';
import SearchBox from '../components/SearchBox';
import { DOCK_GRID } from '../components/Dock';
import FilterSortPanel from '../components/bookings/FilterSortPanel';
import GuestRow from '../components/guests/GuestRow';
import GuestSheet from '../components/guests/GuestSheet';
import { useApi } from '../lib/useApi';
import { useMediaQuery } from '../lib/useMediaQuery';
import { useQueryParams } from '../lib/useQueryState';
import { useStoredState } from '../lib/useStoredState';
import { useUrlSearch } from '../lib/useUrlSearch';

const SORTS = [
  ['name', 'Name'],
  ['stays', 'Most stays'],
  ['recent', 'Latest stay'],
];
const NATURAL_DIR = { name: 'asc', stays: 'desc', recent: 'desc' };
const URL_DEFAULTS = { sort: 'name', dir: '' }; // dir '' = the natural order for that sort

export default function Guests() {
  const wide = useMediaQuery('(min-width: 1024px)');
  const [{ sort, dir: dirParam }, setParams] = useQueryParams(URL_DEFAULTS);
  const { q, setQ, search, ready } = useUrlSearch();
  const [dockOpen, setDockOpen] = useStoredState('pulse.guestFiltersOpen', true, { parse: (raw) => raw !== '0', serialize: (v) => (v ? '1' : '0') });
  const [open, setOpen] = useState(null); // guest id, or 'new'

  const direction = dirParam || NATURAL_DIR[sort] || 'asc';
  const params = new URLSearchParams({ sort, dir: direction });
  if (search) params.set('q', search);
  const list = useApi(ready ? `/api/guests?${params}` : null);
  const guests = list.data ?? [];

  const panel = (
    <FilterSortPanel
      sorts={SORTS}
      sort={sort}
      onSort={(value) => setParams({ sort: value, dir: '' })}
      direction={direction}
      onDirection={(value) => setParams({ dir: value })}
    />
  );
  const summary = SORTS.find(([v]) => v === sort)?.[1] ?? '';

  return (
    <Layout title="Guests">
      <div className={`lg:grid lg:items-start lg:gap-4 ${wide ? (dockOpen ? DOCK_GRID.narrow.open : DOCK_GRID.narrow.folded) : ''}`}>
        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-semibold">Guests</h1>
            <button type="button" className="btn btn-primary" onClick={() => setOpen('new')}>
              <Plus size={18} aria-hidden="true" /> New Guest
            </button>
          </div>

          {!wide && <FilterDock wide={false} summary={summary}>{panel}</FilterDock>}
          <SearchBox value={q} onChange={setQ} label="Search guests" placeholder="Search by name, phone, email or organization…" />

          {list.error && (
            <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">
              Could not load guests: {list.error.message}. Check the connection and try again.
              <button type="button" className="btn ml-3" onClick={list.reload}>Retry</button>
            </p>
          )}

          {list.loading && !list.data ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading guests…">
              {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-surface-2 motion-safe:animate-pulse" />)}
            </div>
          ) : guests.length === 0 ? (
            <p className="rounded-lg border border-line bg-surface p-8 text-center text-muted">
              {search ? `No guests match “${search}”.` : 'No guests yet. They are added when you create a booking.'}
            </p>
          ) : (
            <ul className={`divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface ${list.loading ? 'opacity-70' : ''}`}>
              {guests.map((g) => <GuestRow key={g.id} g={g} onOpen={setOpen} />)}
            </ul>
          )}
        </div>

        {wide && <FilterDock wide open={dockOpen} onToggle={setDockOpen}>{panel}</FilterDock>}
      </div>

      {open && <GuestSheet id={open} onClose={() => setOpen(null)} onChanged={list.reload} />}
    </Layout>
  );
}
