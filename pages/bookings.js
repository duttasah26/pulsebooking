import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import Layout from '../components/Layout';
import BookingSheet from '../components/booking/BookingSheet';
import BookingRow from '../components/bookings/BookingRow';
import FilterSortPanel from '../components/bookings/FilterSortPanel';
import FilterDock from '../components/FilterDock';
import SearchBox from '../components/SearchBox';
import { DOCK_GRID } from '../components/Dock';
import { SORTS, TABS } from '../components/bookings/bookingTabs';
import { useToast } from '../components/Toast';
import { api, useApi } from '../lib/useApi';
import { useMediaQuery } from '../lib/useMediaQuery';
import { useQueryParams } from '../lib/useQueryState';
import { useStoredState } from '../lib/useStoredState';
import { useUrlSearch } from '../lib/useUrlSearch';
import { addDays, today } from '../lib/dates';

const URL_DEFAULTS = { tab: 'upcoming', sort: 'check_in', dir: '' }; // dir '' = the filter's natural order

export default function Bookings() {
  const toast = useToast();
  const wide = useMediaQuery('(min-width: 1024px)');

  // The filter, sort and search live in the URL, so they survive a reload and can be shared.
  const [{ tab, sort, dir: dirParam }, setParams] = useQueryParams(URL_DEFAULTS);
  const { q, setQ, search, ready } = useUrlSearch();
  const [dockOpen, setDockOpen] = useStoredState('pulse.filtersOpen', true, { parse: (raw) => raw !== '0', serialize: (v) => (v ? '1' : '0') });
  const [sheet, setSheet] = useState(null);

  const active = TABS.find((t) => t.key === tab) ?? TABS[0];
  const direction = dirParam || active.dir; // empty = the filter's natural order

  const rooms = useApi('/api/rooms');
  const list = useApi(
    ready ? `/api/bookings?${active.query}&sort=${sort}&dir=${direction}${search ? `&q=${encodeURIComponent(search)}` : ''}` : null,
  );
  const rows = list.data ?? [];

  const restore = async (b) => {
    try {
      await api(`/api/bookings/${b.id}/restore`, { method: 'POST' });
      toast({ message: `Restored ${b.name}`, duration: 3000 });
      list.reload();
    } catch (err) {
      toast({ message: `Could not restore: ${err.message}` });
    }
  };
  const saved = (message) => {
    list.reload();
    if (message) toast({ message, duration: 3000 });
  };
  const newBooking = () => {
    const t = today();
    setSheet({ mode: 'create', defaults: { roomIds: [rooms.data[0].id], checkIn: t, checkOut: addDays(t, 1) } });
  };

  const panel = (
    <FilterSortPanel
      filters={TABS}
      filter={active.key}
      onFilter={(key) => setParams({ tab: key, dir: '' })}
      sorts={SORTS}
      sort={sort}
      onSort={(value) => setParams({ sort: value })}
      direction={direction}
      onDirection={(value) => setParams({ dir: value })}
    />
  );
  const summary = `${active.label}, ${SORTS.find(([v]) => v === sort)?.[1] ?? ''}`;

  return (
    <Layout title="Bookings">
      <div className={`lg:grid lg:items-start lg:gap-4 ${wide ? (dockOpen ? DOCK_GRID.narrow.open : DOCK_GRID.narrow.folded) : ''}`}>
        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-semibold">Bookings</h1>
            <button type="button" className="btn btn-primary" disabled={!rooms.data?.length} onClick={newBooking}>
              <Plus size={18} aria-hidden="true" /> New Booking
            </button>
          </div>

          {!wide && <FilterDock wide={false} summary={summary}>{panel}</FilterDock>}
          <SearchBox value={q} onChange={setQ} label="Search guest, organization or label" placeholder="Search guest, organization or label…" />

          {list.error && (
            <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">
              Could not load bookings: {list.error.message}. Check the connection and try again.
              <button type="button" className="btn ml-3" onClick={list.reload}>Retry</button>
            </p>
          )}

          {list.loading && !list.data ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading bookings…">
              {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-surface-2 motion-safe:animate-pulse" />)}
            </div>
          ) : rows.length === 0 ? (
            <p className="rounded-lg border border-line bg-surface p-8 text-center text-muted">
              {search
                ? `No ${active.label.toLowerCase()} bookings match “${search}”.`
                : active.key === 'deleted' ? 'Nothing has been deleted.' : `No ${active.label.toLowerCase()} bookings yet.`}
            </p>
          ) : (
            <ul className={`divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface ${list.loading ? 'opacity-70' : ''}`}>
              {rows.map((b) => (
                <BookingRow key={b.id} b={b} onOpen={(row) => setSheet({ mode: 'edit', booking: row })} onRestore={restore} />
              ))}
            </ul>
          )}
        </div>

        {wide && <FilterDock wide open={dockOpen} onToggle={setDockOpen}>{panel}</FilterDock>}
      </div>

      {sheet && (
        <BookingSheet
          key={sheet.mode + (sheet.booking?.id ?? 'new')}
          {...sheet}
          rooms={rooms.data ?? []}
          onClose={() => setSheet(null)}
          onSaved={saved}
        />
      )}
    </Layout>
  );
}
