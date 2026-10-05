import { useState } from 'react';
import { Bed, Buildings, CalendarBlank, Hourglass, Phone, Plus, Stack, Tag } from '@phosphor-icons/react';
import Layout from '../components/Layout';
import BookingSheet from '../components/booking/BookingSheet';
import BookingRow, { BOOKING_COLUMNS } from '../components/bookings/BookingRow';
import ViewsBar from '../components/ViewsBar';
import ViewOptions from '../components/ViewOptions';
import { ChipGroup, FoldSection, NumberRange, Segmented } from '../components/FilterParts';
import FilterSortPanel from '../components/bookings/FilterSortPanel';
import FilterDock from '../components/FilterDock';
import FieldLabel from '../components/FieldLabel';
import SearchBox from '../components/SearchBox';
import { DOCK_GRID } from '../components/Dock';
import { SORTS, TABS } from '../components/bookings/bookingTabs';
import { useToast } from '../components/Toast';
import { STATUS_OPTIONS } from '../lib/status';
import { api, useApi } from '../lib/useApi';
import { NeedGuestError, confirmHolds } from '../lib/holds';
import { useMediaQuery } from '../lib/useMediaQuery';
import { useQueryParams } from '../lib/useQueryState';
import { useStoredState } from '../lib/useStoredState';
import { useUrlSearch } from '../lib/useUrlSearch';
import { changedParams, csvList, toggleCsv, useSavedViews } from '../lib/viewState';
import { useSettings } from '../components/SettingsProvider';
import { colorFor, roomShade, stayColor } from '../lib/colors';
import { addDays, today } from '../lib/dates';

// The whole state of the screen lives in the URL, so it survives a reload and can be saved as a named view.
//   holds '1' = show on-hold bookings too    dir '' = the filter's natural order    room, floor, status: several, separated by commas
//   sort2/dir2: the second sort    org: organization contains    contact: yes | no    nmin/nmax: nights    rby: stay | check_in | check_out with df, dt
//   cols: the columns switched OFF, separated by commas    dens: compact (empty = roomy)
const URL_DEFAULTS = {
  tab: 'upcoming', sort: 'check_in', dir: '', sort2: '', dir2: '', holds: '', room: '', floor: '', status: '',
  org: '', contact: '', nmin: '', nmax: '', rby: '', df: '', dt: '', cols: '', dens: '',
};
const CLEAR_FILTERS = { room: '', floor: '', status: '', org: '', contact: '', nmin: '', nmax: '', rby: '', df: '', dt: '', holds: '' };

export default function Bookings() {
  const toast = useToast();
  const { settings } = useSettings();
  const wide = useMediaQuery('(min-width: 1024px)');

  // The filter, sort and search live in the URL, so they survive a reload and can be shared.
  const [values, setParams] = useQueryParams(URL_DEFAULTS);
  const { tab, sort, dir: dirParam, sort2, dir2, holds, room, floor, status, org, contact, nmin, nmax, rby, df, dt, cols, dens } = values;
  const { q, setQ, search, ready } = useUrlSearch();
  const [dockOpen, setDockOpen] = useStoredState('pulse.filtersOpen', true, { parse: (raw) => raw !== '0', serialize: (v) => (v ? '1' : '0') });
  const [sheet, setSheet] = useState(null);

  const active = TABS.find((t) => t.key === tab) ?? TABS[0];
  const direction = dirParam || active.dir; // empty = the filter's natural order
  // On-hold bookings are tentative, so the lists leave them out unless asked (the On Hold filter is all of them).
  const holdsFilterable = active.key !== 'hold' && active.key !== 'deleted';
  const showHolds = holds === '1';
  const statusFilterable = active.key !== 'hold';
  const [from, to] = active.range?.() ?? [];

  const rooms = useApi('/api/rooms');
  let url = `/api/bookings?${active.query}`;
  const add = (key, value) => { if (value) url += `&${key}=${encodeURIComponent(value)}`; };
  if (from) { add('from', from); add('to', to); }
  add('room_id', room);
  add('floor', floor);
  if (statusFilterable) add('status', status);
  add('org', org);
  add('contact', contact);
  add('nights_min', nmin);
  add('nights_max', nmax);
  if (df || dt) { add('range_by', rby || 'stay'); add('range_from', df); add('range_to', dt); }
  if (holdsFilterable && !showHolds) url += '&holds=hide';
  add('sort', sort);
  add('dir', direction);
  add('sort2', sort2);
  if (sort2) add('dir2', dir2 || 'asc');
  add('q', search);
  const list = useApi(ready ? url : null);
  const hidden = csvList(cols);
  const density = dens === 'compact' ? 'compact' : 'roomy';

  // Saved views: the params that differ from the screen's start (and the search text), kept in the database.
  const { views, loading: viewsLoading, save: saveView, remove: removeView } = useSavedViews('bookings');
  const current = { ...changedParams(values, URL_DEFAULTS), ...(search ? { q: search } : {}) };
  const applyView = (view) => {
    setParams({ ...URL_DEFAULTS, ...view.params });
    setQ(view.params.q ?? '');
  };
  const resetView = () => { setParams(URL_DEFAULTS); setQ(''); };
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
  // One-click hold actions. Confirming turns every room of the hold into a booking (the hold needs a guest, or a label
  // to name one after; otherwise its form opens). Cancelling removes the hold, and Undo puts it back.
  const confirmHold = async (b) => {
    try {
      await confirmHolds([b]);
      toast({ message: 'Hold confirmed', duration: 3000 });
      list.reload();
    } catch (err) {
      if (err instanceof NeedGuestError) {
        setSheet({ mode: 'edit', booking: b });
        toast({ message: err.message, important: true });
      } else {
        toast({ message: err.message });
      }
    }
  };
  const cancelHold = async (b) => {
    try {
      await api(`/api/bookings/${b.id}`, { method: 'DELETE' });
      list.reload();
      toast({
        message: 'Hold cancelled',
        actionLabel: 'Undo',
        onAction: async () => {
          await api('/api/bookings', {
            method: 'POST',
            body: {
              room_ids: [b.room_id], check_in: b.check_in, check_out: b.check_out, status: 'on_hold', group_id: b.group_id,
              color: b.color, label: b.label, organization: b.organization, check_in_time: b.check_in_time, check_out_time: b.check_out_time,
            },
          });
          list.reload();
        },
      });
    } catch (err) {
      toast({ message: err.message });
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

  const shadeOf = (number) => roomShade({ number }, settings);
  const roomOptions = (rooms.data ?? [])
    .filter((r) => !floor || csvList(floor).includes(String(r.number)[0]))
    .map((r) => [String(r.id), <span key={r.id} className="font-mono font-semibold">{r.number}</span>, shadeOf(r.number)]);
  const toneOf = (c) => ({ fill: c.bg, edge: c.border });
  const floorKeys = [...new Set((rooms.data ?? []).map((r) => String(r.number)[0]))].sort();
  const activeCount = [room, floor, statusFilterable && status, org, contact, nmin || nmax, df || dt, holdsFilterable && showHolds].filter(Boolean).length;
  // One-tap filters beside Standard. Each one switches a few of the filters below on or off.
  const todayStr = today();
  const toneBg = (c) => ({ fill: c.bg, edge: c.border });
  const quick = [
    { key: 'arrive', label: 'Arriving today', on: rby === 'check_in' && df === todayStr && dt === todayStr, tone: toneBg(stayColor('checkIn', settings)), onToggle: () => setParams(rby === 'check_in' && df === todayStr && dt === todayStr ? { rby: '', df: '', dt: '' } : { rby: 'check_in', df: todayStr, dt: todayStr }) },
    { key: 'leave', label: 'Leaving today', on: rby === 'check_out' && df === todayStr && dt === todayStr, tone: toneBg(stayColor('checkOut', settings)), onToggle: () => setParams(rby === 'check_out' && df === todayStr && dt === todayStr ? { rby: '', df: '', dt: '' } : { rby: 'check_out', df: todayStr, dt: todayStr }) },
    { key: 'house', label: 'In house', on: tab === 'current', onToggle: () => setParams({ tab: tab === 'current' ? 'upcoming' : 'current', dir: '' }) },
    { key: 'long', label: 'Long stays', on: nmin === '7' && !nmax, onToggle: () => setParams(nmin === '7' && !nmax ? { nmin: '' } : { nmin: '7', nmax: '' }) },
    { key: 'nocontact', label: 'No contact', on: contact === 'no', onToggle: () => setParams({ contact: contact === 'no' ? '' : 'no' }) },
  ].filter(Boolean);
  const panel = (
    <FilterSortPanel
      filters={TABS}
      filter={active.key}
      onFilter={(key) => setParams({ tab: key, dir: '' })}
      foldId="bookings"
      extra={
        <div className="space-y-2">
          <FoldSection id="bookings-rooms" title="Rooms" icon={Bed} badge={csvList(room).length + csvList(floor).length}>
            {floorKeys.length > 1 && (
              <ChipGroup legend="Floor" icon={Stack} options={floorKeys.map((f) => [f, `Floor ${f}`, shadeOf(`${f}01`)])} value={csvList(floor)} onToggle={(f) => setParams({ floor: toggleCsv(floor, f) })} />
            )}
            <ChipGroup legend="Rooms" icon={Bed} options={roomOptions} value={csvList(room)} onToggle={(id) => setParams({ room: toggleCsv(room, id) })} empty="No rooms yet." />
          </FoldSection>
          {(statusFilterable || holdsFilterable) && (
            <FoldSection id="bookings-status" title="Status" icon={Tag} badge={csvList(status).length + (holdsFilterable && showHolds ? 1 : 0)}>
              <ChipGroup
                legend="Status"
                legendHidden
                options={[
                  ...(statusFilterable ? STATUS_OPTIONS.filter(([v]) => v !== 'on_hold').map(([v, l]) => [v, l, toneOf(colorFor({ status: v }, settings))]) : []),
                  ...(holdsFilterable ? [['holds', 'On hold', toneOf(colorFor({ status: 'on_hold' }, settings))]] : []),
                ]}
                value={[...csvList(status), ...(showHolds ? ['holds'] : [])]}
                onToggle={(v) => (v === 'holds' ? setParams({ holds: showHolds ? '' : '1' }) : setParams({ status: toggleCsv(status, v) }))}
              />
              {holdsFilterable && <p className="text-sm text-muted">On hold bookings are tentative, so lists leave them out unless you switch On hold on.</p>}
            </FoldSection>
          )}
          <FoldSection id="bookings-guest" title="Guest" icon={Buildings} badge={(org ? 1 : 0) + (contact ? 1 : 0)}>
            <div>
              <FieldLabel icon={Buildings} htmlFor="f-org">Organization contains</FieldLabel>
              <input id="f-org" name="org" className="field" value={org} onChange={(e) => setParams({ org: e.target.value })} autoComplete="off" placeholder="For example Infosys" />
            </div>
            <Segmented
              legend="Contact"
              icon={Phone}
              options={[['', 'Any'], ['yes', 'Has contact'], ['no', 'None saved']]}
              value={contact}
              onChange={(v) => setParams({ contact: v })}
            />
          </FoldSection>
          <FoldSection id="bookings-dates" title="Dates and nights" icon={CalendarBlank} badge={(df || dt ? 1 : 0) + (nmin || nmax ? 1 : 0)}>
            <Segmented
              legend="Dates"
              icon={CalendarBlank}
              options={[['', 'Staying'], ['check_in', 'Arriving', toneOf(stayColor('checkIn', settings))], ['check_out', 'Leaving', toneOf(stayColor('checkOut', settings))]]}
              value={rby}
              onChange={(v) => setParams({ rby: v })}
            />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" name="df" aria-label="From date" className="field min-w-0 px-2 text-sm" value={df} max={dt || undefined} onChange={(e) => setParams({ df: e.target.value })} />
              <input type="date" name="dt" aria-label="Until date" className="field min-w-0 px-2 text-sm" value={dt} min={df || undefined} onChange={(e) => setParams({ dt: e.target.value })} />
            </div>
            <NumberRange legend="Nights" icon={Hourglass} from={nmin} to={nmax} onFrom={(v) => setParams({ nmin: v })} onTo={(v) => setParams({ nmax: v })} unit="How long the stay is" />
          </FoldSection>
        </div>
      }
      sorts={SORTS}
      sort={sort}
      onSort={(value) => setParams({ sort: value })}
      direction={direction}
      onDirection={(value) => setParams({ dir: value })}
      sort2={sort2}
      onSort2={(value) => setParams({ sort2: value, dir2: '' })}
      direction2={dir2 || 'asc'}
      onDirection2={(value) => setParams({ dir2: value })}
      look={
        <ViewOptions
          columns={BOOKING_COLUMNS}
          hidden={hidden}
          onToggleColumn={(key) => setParams({ cols: toggleCsv(cols, key) })}
          density={density}
          onDensity={(v) => setParams({ dens: v === 'compact' ? 'compact' : '' })}
        />
      }
      activeCount={activeCount}
      onClearAll={() => setParams(CLEAR_FILTERS)}
    />
  );
  const summary = `${active.label}${activeCount ? `, ${activeCount} ${activeCount === 1 ? 'filter' : 'filters'}` : ''}, ${SORTS.find(([v]) => v === sort)?.[1] ?? ''}`;

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
          <SearchBox value={q} onChange={setQ} label="Search guest, organization or label" placeholder="Search by name or initials (ZB)…" />
          <ViewsBar quick={quick} views={views} loading={viewsLoading} current={current} onApply={applyView} onReset={resetView} onSave={(name) => saveView(name, current)} onDelete={removeView} />

          {list.error && (
            <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">
              Could not load bookings: {list.error.message}. Check the connection and try again.
              <button type="button" className="btn ml-3" onClick={list.reload}>Retry</button>
            </p>
          )}

          {(!ready || list.loading) && !list.data ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading bookings…">
              {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-16 rounded-lg" style={{ animationDelay: `${i * 90}ms` }} />)}
            </div>
          ) : rows.length === 0 ? (
            <p className="rounded-lg border border-line bg-surface p-8 text-center text-muted">
              {search
                ? `Nothing matches “${search}” here.`
                : `${active.empty}${activeCount ? ' Some filters are on: clear them to see more.' : ''}${holdsFilterable && !showHolds ? ' On-hold bookings are hidden: turn on Show On Hold to see them.' : ''}`}
            </p>
          ) : (
            <>
            <p className="px-1 text-sm text-muted" role="status" aria-live="polite">{rows.length} {rows.length === 1 ? 'booking' : 'bookings'}</p>
            <ul className={`animate-settle divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface transition-opacity ${list.loading ? 'opacity-70' : ''}`}>
              {rows.map((b) => (
                <BookingRow key={b.id} b={b} hidden={hidden} density={density} onOpen={(row) => setSheet({ mode: 'edit', booking: row })} onRestore={restore} onConfirm={confirmHold} onCancelHold={cancelHold} />
              ))}
            </ul>
            </>
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
          onConfirm={(b) => { setSheet(null); confirmHold(b); }}
        />
      )}
    </Layout>
  );
}
