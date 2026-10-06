import { useState } from 'react';
import { Bed, Buildings, CalendarBlank, Hash, Phone, Plus, Stack, ArrowClockwise } from '@phosphor-icons/react';
import Head from 'next/head';
import FieldLabel from '../components/FieldLabel';
import Layout from '../components/Layout';
import FilterDock from '../components/FilterDock';
import SearchBox from '../components/SearchBox';
import ViewsBar from '../components/ViewsBar';
import ViewOptions from '../components/ViewOptions';
import { ChipGroup, FoldSection, NumberRange, Segmented } from '../components/FilterParts';
import { DOCK_GRID } from '../components/Dock';
import FilterSortPanel from '../components/bookings/FilterSortPanel';
import GuestRow, { GUEST_COLUMNS } from '../components/guests/GuestRow';
import GuestSheet from '../components/guests/GuestSheet';
import DuplicatesPanel from '../components/guests/DuplicatesPanel';
import MergeSheet from '../components/guests/MergeSheet';
import { useApi } from '../lib/useApi';
import { useMediaQuery } from '../lib/useMediaQuery';
import { useQueryParams } from '../lib/useQueryState';
import { useStoredState } from '../lib/useStoredState';
import { useUrlSearch } from '../lib/useUrlSearch';
import { changedParams, csvList, toggleCsv, useSavedViews } from '../lib/viewState';
import { addDays, monthStart, today } from '../lib/dates';
import { useSettings } from '../components/SettingsProvider';
import { roomShade } from '../lib/colors';

const SORTS = [
  ['name', 'Name'],
  ['stays', 'Most stays'],
  ['recent', 'Latest stay'],
];
const NATURAL_DIR = { name: 'asc', stays: 'desc', recent: 'desc' };
// The whole state of the screen lives in the URL, so it survives a reload and can be saved as a named view.
//   dir '' = the natural order for that sort    sort2/dir2: the second sort    room, floor: several, separated by commas
//   from/to: stayed between these days    org: organization contains    contact: phone | email | both | any | none
//   smin/smax: how many stays    cols: the columns switched OFF, separated by commas    dens: compact (empty = roomy)
const URL_DEFAULTS = {
  sort: 'name', dir: '', sort2: '', dir2: '', room: '', floor: '', from: '', to: '', org: '', contact: '', smin: '', smax: '', cols: '', dens: '',
};
const CLEAR_FILTERS = { room: '', floor: '', from: '', to: '', org: '', contact: '', smin: '', smax: '' };

export default function Guests() {
  const { settings } = useSettings();
  const wide = useMediaQuery('(min-width: 1024px)');
  const [values, setParams] = useQueryParams(URL_DEFAULTS);
  const { sort, dir: dirParam, sort2, dir2, room, floor, from, to, org, contact, smin, smax, cols, dens } = values;
  const { q, setQ, search, ready } = useUrlSearch();
  const [dockOpen, setDockOpen] = useStoredState('pulse.guestFiltersOpen', true, { parse: (raw) => raw !== '0', serialize: (v) => (v ? '1' : '0') });
  const [open, setOpen] = useState(null); // guest id, or 'new'
  const [merge, setMerge] = useState(null); // { a, b } while the merge screen is open

  const direction = dirParam || NATURAL_DIR[sort] || 'asc';
  const params = new URLSearchParams({ sort, dir: direction });
  const add = (key, value) => { if (value) params.set(key, value); };
  add('q', search);
  add('room_id', room);
  add('floor', floor);
  add('from', from);
  if (to) params.set('to', addDays(to, 1)); // the last day they were here, inclusive
  add('org', org);
  add('contact', contact);
  add('stays_min', smin);
  add('stays_max', smax);
  add('sort2', sort2);
  if (sort2) add('dir2', dir2 || NATURAL_DIR[sort2] || 'asc');
  const rooms = useApi('/api/rooms');
  const list = useApi(ready ? `/api/guests?${params}` : null);
  const guests = list.data ?? [];
  const hidden = csvList(cols);
  const density = dens === 'compact' ? 'compact' : 'roomy';

  // Guests that may be the same person (Z B and ZB), looked for across the whole list. Only pointed out, never merged alone.
  const dupes = useApi('/api/guests/duplicates');
  const groups = dupes.data ?? [];
  const partnerOf = (g) => groups.find((grp) => grp.guests.some((x) => x.id === g.id))?.guests.find((x) => x.id !== g.id);
  const merged = () => { setMerge(null); list.reload(); dupes.reload(); };

  const { views, loading: viewsLoading, save: saveView, remove: removeView } = useSavedViews('guests');
  const current = { ...changedParams(values, URL_DEFAULTS), ...(search ? { q: search } : {}) };
  const applyView = (view) => {
    setParams({ ...URL_DEFAULTS, ...view.params });
    setQ(view.params.q ?? '');
  };
  const resetView = () => { setParams(URL_DEFAULTS); setQ(''); };

  const roomOptions = (rooms.data ?? [])
    .filter((r) => !floor || csvList(floor).includes(String(r.number)[0]))
    .map((r) => [String(r.id), <span key={r.id} className="font-mono font-semibold">{r.number}</span>, roomShade({ number: r.number }, settings)]);
  const floorKeys = [...new Set((rooms.data ?? []).map((r) => String(r.number)[0]))].sort();
  const activeCount = [room, floor, from || to, org, contact, smin || smax].filter(Boolean).length;

  // One-tap filters beside Standard.
  const quick = [
    { key: 'regulars', label: 'Regulars', on: smin === '3' && !smax, onToggle: () => setParams(smin === '3' && !smax ? { smin: '' } : { smin: '3', smax: '' }) },
    { key: 'month', label: 'Stayed this month', on: from === monthStart(today()) && to === today(), onToggle: () => setParams(from === monthStart(today()) && to === today() ? { from: '', to: '' } : { from: monthStart(today()), to: today() }) },
    { key: 'phone', label: 'Has a phone', on: contact === 'phone', onToggle: () => setParams({ contact: contact === 'phone' ? '' : 'phone' }) },
    { key: 'nocontact', label: 'No phone or email', on: contact === 'none', onToggle: () => setParams({ contact: contact === 'none' ? '' : 'none' }) },
  ];
  const panel = (
    <FilterSortPanel
      foldId="guests"
      extra={
        <div className="space-y-2">
          <FoldSection id="guests-rooms" title="Stayed in" icon={Bed} badge={csvList(room).length + csvList(floor).length}>
            {floorKeys.length > 1 && (
              <ChipGroup legend="Floor" icon={Stack} options={floorKeys.map((f) => [f, `Floor ${f}`, roomShade({ number: `${f}01` }, settings)])} value={csvList(floor)} onToggle={(f) => setParams({ floor: toggleCsv(floor, f) })} />
            )}
            <ChipGroup legend="Rooms" icon={Bed} options={roomOptions} value={csvList(room)} onToggle={(id) => setParams({ room: toggleCsv(room, id) })} empty="No rooms yet." />
          </FoldSection>
          <FoldSection id="guests-dates" title="Stayed between" icon={CalendarBlank} badge={from || to ? 1 : 0}>
            <div>
              <FieldLabel icon={CalendarBlank} as="span">Any stay overlapping these days</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" name="from" aria-label="Stayed from" className="field min-w-0 px-2 text-sm" value={from} max={to || undefined} onChange={(e) => setParams({ from: e.target.value })} />
                <input type="date" name="to" aria-label="Stayed until" className="field min-w-0 px-2 text-sm" value={to} min={from || undefined} onChange={(e) => setParams({ to: e.target.value })} />
              </div>
            </div>
          </FoldSection>
          <FoldSection id="guests-contact" title="Contact and organization" icon={Phone} badge={(org ? 1 : 0) + (contact ? 1 : 0)}>
            <Segmented
              legend="Contact saved"
              icon={Phone}
              options={[['', 'Any'], ['phone', 'Phone'], ['email', 'Email'], ['both', 'Both'], ['none', 'None']]}
              value={contact}
              onChange={(v) => setParams({ contact: v })}
            />
            <div>
              <FieldLabel icon={Buildings} htmlFor="g-org">Organization contains</FieldLabel>
              <input id="g-org" name="org" className="field" value={org} onChange={(e) => setParams({ org: e.target.value })} autoComplete="off" placeholder="For example Infosys" />
            </div>
          </FoldSection>
          <FoldSection id="guests-stays" title="Number of stays" icon={Hash} badge={smin || smax ? 1 : 0}>
            <NumberRange legend="Stays" icon={Hash} from={smin} to={smax} onFrom={(v) => setParams({ smin: v })} onTo={(v) => setParams({ smax: v })} unit="For example at least 3 to find regulars" />
          </FoldSection>
        </div>
      }
      sorts={SORTS}
      sort={sort}
      onSort={(value) => setParams({ sort: value, dir: '' })}
      direction={direction}
      onDirection={(value) => setParams({ dir: value })}
      sort2={sort2}
      onSort2={(value) => setParams({ sort2: value, dir2: '' })}
      direction2={dir2 || NATURAL_DIR[sort2] || 'asc'}
      onDirection2={(value) => setParams({ dir2: value })}
      look={
        <ViewOptions
          columns={GUEST_COLUMNS}
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
  const summary = `${SORTS.find(([v]) => v === sort)?.[1] ?? ''}${activeCount ? `, ${activeCount} ${activeCount === 1 ? 'filter' : 'filters'}` : ''}`;

  return (
    <Layout title="Guests">
      <Head><title>{`Guests${search ? `: ${search}` : ''} | Pulse Rooms`}</title></Head>
      <div className={`lg:grid lg:items-start lg:gap-4 ${wide ? (dockOpen ? DOCK_GRID.narrow.open : DOCK_GRID.narrow.folded) : ''}`}>
        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-semibold">Guests</h1>
            <button type="button" className="btn btn-primary" onClick={() => setOpen('new')}>
              <Plus size={18} aria-hidden="true" /> New Guest
            </button>
          </div>

          {!wide && <FilterDock wide={false} summary={summary}>{panel}</FilterDock>}
          <SearchBox value={q} onChange={setQ} label="Search guests" placeholder="Search by name or initials (ZB), phone, email…" />
          <ViewsBar quick={quick} views={views} loading={viewsLoading} current={current} onApply={applyView} onReset={resetView} onSave={(name) => saveView(name, current)} onDelete={removeView} />
          <DuplicatesPanel groups={groups} onMerge={(a, b) => setMerge({ a, b })} />

          {list.error && (
            <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">
              Could not load guests: {list.error.message}. Check the connection and try again.
              <button type="button" className="btn ml-3" onClick={list.reload}><ArrowClockwise size={16} aria-hidden="true" /> Retry</button>
            </p>
          )}

          {(!ready || list.loading) && !list.data ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading guests…">
              {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-16 rounded-lg" style={{ animationDelay: `${i * 90}ms` }} />)}
            </div>
          ) : guests.length === 0 ? (
            <p className="rounded-lg border border-line bg-surface p-8 text-center text-muted">
              {search || activeCount ? 'No guests match this search. Some filters may be on: clear them to see more.' : 'No guests yet. They are added when you create a booking.'}
            </p>
          ) : (
            <>
              <p className="px-1 text-sm text-muted" role="status" aria-live="polite">{guests.length} {guests.length === 1 ? 'guest' : 'guests'}{guests.length === 100 ? ' (the first 100: narrow the search to see others)' : ''}</p>
              <ul className={`animate-settle divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface transition-opacity ${list.loading ? 'opacity-70' : ''}`}>
                {guests.map((g) => {
                  const partner = partnerOf(g);
                  return <GuestRow key={g.id} g={g} onOpen={setOpen} hidden={hidden} density={density} duplicate={Boolean(partner)} onMerge={partner ? () => setMerge({ a: g.id, b: partner.id }) : undefined} />;
                })}
              </ul>
            </>
          )}
        </div>

        {wide && <FilterDock wide open={dockOpen} onToggle={setDockOpen}>{panel}</FilterDock>}
      </div>

      {open && <GuestSheet id={open} onClose={() => setOpen(null)} onChanged={() => { list.reload(); dupes.reload(); }} />}
      {merge && <MergeSheet a={merge.a} b={merge.b} onClose={() => setMerge(null)} onDone={merged} />}
    </Layout>
  );
}
