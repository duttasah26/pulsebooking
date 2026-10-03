import { useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUUpLeft, MagnifyingGlass, Plus } from '@phosphor-icons/react';
import Layout from '../components/Layout';
import BookingSheet from '../components/BookingSheet';
import { useToast } from '../components/Toast';
import { colorFor } from '../lib/colors';
import { api, useApi, useDebounced } from '../lib/useApi';
import { STATUS_LABEL } from '../lib/status';
import { addDays, fmtDateTime, fmtShort, nightsLabel, today } from '../lib/dates';

const TABS = [
  { key: 'upcoming', label: 'Upcoming', query: 'when=upcoming', dir: 'asc' },
  { key: 'current', label: 'In house', query: 'when=current', dir: 'asc' },
  { key: 'hold', label: 'On hold', query: 'status=on_hold&when=all', dir: 'asc' },
  { key: 'past', label: 'Past', query: 'when=past', dir: 'desc' },
  { key: 'deleted', label: 'Deleted', query: 'deleted=only&when=all', dir: 'desc' },
  { key: 'all', label: 'All', query: 'when=all', dir: 'desc' },
];
const SORTS = [
  ['check_in', 'Check-in date'],
  ['guest', 'Guest name'],
  ['room', 'Room'],
  ['created', 'Date added'],
];

export default function Bookings() {
  const toast = useToast();
  const [tab, setTab] = useState('upcoming');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('check_in');
  const [dir, setDir] = useState(null); // null = the tab's natural order
  const [sheet, setSheet] = useState(null);

  const active = TABS.find((t) => t.key === tab);
  const search = useDebounced(q.trim());
  const direction = dir ?? active.dir;

  const rooms = useApi('/api/rooms');
  const list = useApi(
    `/api/bookings?${active.query}&sort=${sort}&dir=${direction}${search ? `&q=${encodeURIComponent(search)}` : ''}`,
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

  return (
    <Layout title="Bookings">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Bookings</h1>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!rooms.data?.length}
            onClick={() => {
              const t = today();
              setSheet({ mode: 'create', defaults: { roomIds: [rooms.data[0].id], checkIn: t, checkOut: addDays(t, 1) } });
            }}
          >
            <Plus size={18} /> New booking
          </button>
        </div>

        <div role="tablist" aria-label="Booking filter" className="flex gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={tab === t.key}
              onClick={() => { setTab(t.key); setDir(null); }}
              className={`btn min-h-9 flex-1 border-transparent px-3 ${tab === t.key ? 'bg-accent text-accent-ink hover:bg-accent' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="field pl-10" placeholder="Search guest, organization or label" aria-label="Search guest, organization or label" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="field !w-auto" aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button
            type="button"
            className="btn btn-icon"
            aria-label={direction === 'asc' ? 'Ascending, switch to descending' : 'Descending, switch to ascending'}
            onClick={() => setDir(direction === 'asc' ? 'desc' : 'asc')}
          >
            {direction === 'asc' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
          </button>
        </div>

        {list.error && (
          <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">
            Could not load bookings: {list.error.message}
            <button type="button" className="btn ml-3" onClick={list.reload}>Retry</button>
          </p>
        )}

        {list.loading && !list.data ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-lg bg-surface-2 motion-safe:animate-pulse" />)}
          </div>
        ) : rows.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface p-8 text-center text-muted">
            {search ? `No ${active.label.toLowerCase()} bookings for "${search}".` : tab === 'deleted' ? 'Nothing has been deleted.' : `No ${active.label.toLowerCase()} bookings yet.`}
          </p>
        ) : (
          <ul className={`divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface ${list.loading ? 'opacity-70' : ''}`}>
            {rows.map((b) => {
              const c = colorFor(b);
              const isDeleted = Boolean(b.deleted_at);
              return (
                <li key={b.id} className="flex items-stretch">
                  <span className="w-1.5 shrink-0" style={{ backgroundColor: c.border }} aria-hidden="true" />
                  <button
                    type="button"
                    disabled={isDeleted}
                    onClick={() => setSheet({ mode: 'edit', booking: b })}
                    className="grid min-h-16 flex-1 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 px-3 py-2 text-left enabled:hover:bg-surface-2 md:grid-cols-[1.4fr_0.6fr_1.4fr_0.7fr]"
                  >
                    <span className="min-w-0">
                      <span className={`block truncate font-medium ${isDeleted ? 'line-through' : ''}`}>{b.name}</span>
                      <span className="block truncate text-sm text-muted">
                        {[b.organization, b.guest_id ? b.phone || b.email || 'No contact saved' : 'No guest yet'].filter(Boolean).join(', ')}
                      </span>
                    </span>
                    <span className="font-mono text-sm font-semibold md:order-none">Room {b.room_number}</span>
                    <span className="col-span-2 text-sm md:col-span-1">
                      {fmtShort(b.check_in)} to {fmtShort(b.check_out)}
                      <span className="text-muted">, {nightsLabel(b.nights)}</span>
                    </span>
                    <span className="col-span-2 md:col-span-1">
                      <span className="badge">
                        {isDeleted ? `Deleted ${fmtDateTime(b.deleted_at)}${b.deleted_by ? ` by ${b.deleted_by}` : ''}` : STATUS_LABEL[b.status]}
                      </span>
                    </span>
                  </button>
                  {isDeleted && (
                    <button type="button" className="btn m-2 self-center" onClick={() => restore(b)}>
                      <ArrowUUpLeft size={18} /> Restore
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
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
