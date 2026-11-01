import { useState } from 'react';
import { useRouter } from 'next/router';
import { Bell, CalendarBlank, DotsThreeVertical, X } from '@phosphor-icons/react';
import { addDays, daysInMonth, diffDays, fmtShort, monthStart, range, today } from '../../lib/dates';
import { useApi } from '../../lib/useApi';
import { useOverviewParts } from '../../lib/devicePrefs';
import { tabKeys } from '../../lib/tabKeys';
import BookingRow from '../bookings/BookingRow';

// The Overview page. Left: the day's four figures (they also choose the list), the week overview with its chart and occupancy tiles.
// Right: the list behind the chosen figure, with filter pills. It reads its own data (a week back to 60 days ahead, the holds, this
// month). A booking in several rooms is one row with its rooms. A row opens the booking on the calendar. Cancelled bookings are left out.
const live = (list) => (Array.isArray(list) ? list : []).filter((b) => b.status !== 'cancelled');

function groupRows(list) {
  const map = new Map();
  for (const b of list) {
    const key = b.group_id ?? `b${b.id}`;
    const row = map.get(key) ?? { key, first: b, rooms: [], list: [] };
    row.rooms.push(b.room_number);
    row.list.push(b);
    map.set(key, row);
  }
  return [...map.values()].map((r) => ({ ...r, rooms: [...new Set(r.rooms)].sort() }));
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function Card({ className = '', children, ...rest }) {
  return <section {...rest} className={`rounded-xl border border-line bg-surface ${className}`}>{children}</section>;
}

// One of the four figures: a title, a big centred number in its colour, its name under it, and two small counts. Choosing it fills the list.
function Figure({ title, value, name, tone, notes, active, onPick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onPick}
      className={`flex flex-col rounded-xl border bg-surface p-4 text-left transition-shadow duration-150 ${active ? 'border-accent shadow-[0_0_0_1px_var(--accent)]' : 'border-line hover:shadow-md'}`}
    >
      <span className="flex items-center justify-between">
        <span className="text-[0.9375rem] font-semibold">{title}</span>
        <DotsThreeVertical size={20} weight="bold" aria-hidden="true" className="text-muted" />
      </span>
      <span className={`mt-3 text-center font-mono text-6xl font-medium leading-none ${tone}`}>{value}</span>
      <span className={`mt-2 text-center text-base font-semibold ${tone}`}>{name}</span>
      <span className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3 text-[0.8125rem] text-muted">
        {notes.map(([label, n]) => (
          <span key={label} className="flex items-baseline gap-1.5">{label} <span className="font-mono text-base font-semibold text-ink">{n}</span></span>
        ))}
      </span>
    </button>
  );
}

function Tile({ label, value, tone = 'bg-surface-2', text = 'text-ink', big = false }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl px-2 text-center ${big ? 'min-h-32' : 'min-h-24'} ${tone}`}>
      <p className={`font-mono font-medium leading-none ${big ? 'text-4xl' : 'text-3xl'} ${text}`}>{value}</p>
      <p className={`mt-2 leading-tight ${big ? `text-base font-semibold ${text}` : 'text-[0.8125rem] text-muted'}`}>{label}</p>
    </div>
  );
}

// Arrivals as bars and departures as a line with its numbers boxed on the points, over a numbered axis, the days slanted underneath.
function WeekChart({ days }) {
  const W = 520, H = 250, L = 30, R = 12, T = 18, B = 70;
  const top = Math.max(2, ...days.flatMap((d) => [d.arriving, d.leaving]));
  const step = top <= 5 ? 1 : Math.ceil(top / 5);
  const max = Math.ceil(top / step) * step;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  const slot = (W - L - R) / days.length;
  const x = (i) => L + slot * i + slot / 2;
  const y = (n) => T + (H - T - B) * (1 - n / max);
  const summary = days.map((d) => `${fmtShort(d.day)}: ${plural(d.arriving, 'arrival')}, ${plural(d.leaving, 'departure')}`).join('. ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Arrivals and departures. ${summary}`} className="w-full overflow-visible text-[11px]">
      {ticks.map((n) => (
        <g key={n}>
          <line x1={L} x2={W - R} y1={y(n)} y2={y(n)} stroke="var(--grid-line)" strokeWidth="1" strokeDasharray={n ? '3 4' : undefined} />
          <text x={L - 8} y={y(n) + 4} textAnchor="end" fill="var(--muted)">{n}</text>
        </g>
      ))}
      {days.map((d, i) => (
        <rect key={d.day} x={x(i) - 14} y={y(d.arriving)} width="28" height={y(0) - y(d.arriving)} rx="2" fill="#b9b8ae" />
      ))}
      <polyline points={days.map((d, i) => `${x(i)},${y(d.leaving)}`).join(' ')} fill="none" stroke="var(--muted)" strokeWidth="2" />
      {days.map((d, i) => (
        <g key={d.day}>
          <rect x={x(i) - 9} y={y(d.leaving) - 9} width="18" height="18" rx="3" fill="var(--muted)" />
          <text x={x(i)} y={y(d.leaving) + 4} textAnchor="middle" fill="#fff" fontWeight="600">{d.leaving}</text>
          <text transform={`translate(${x(i) + 4} ${H - B + 14}) rotate(-45)`} textAnchor="end" fill="var(--muted)">{fmtShort(d.day)}</text>
        </g>
      ))}
    </svg>
  );
}

function Pills({ label, items, value, onPick, className = '' }) {
  return (
    <div role="tablist" aria-label={label} onKeyDown={tabKeys} className={`no-scrollbar flex gap-2 overflow-x-auto ${className}`}>
      {items.map(([key, text]) => (
        <button
          key={key}
          role="tab"
          type="button"
          aria-selected={value === key}
          tabIndex={value === key ? 0 : -1}
          onClick={() => onPick(key)}
          className={`min-h-9 shrink-0 rounded-full px-4 text-[0.9375rem] ${value === key ? 'bg-surface-2 font-semibold text-ink' : 'font-medium text-muted hover:bg-surface-2 hover:text-ink'}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

// Arrivals and departures can be narrowed by whether the guest has checked in (or out) yet.
const FILTERS = {
  arrivals: [['all', 'All'], ['waiting', 'Not checked in'], ['done', 'Checked in']],
  departures: [['all', 'All'], ['waiting', 'Still in'], ['done', 'Checked out']],
};
const isDone = (kind, status) => (kind === 'arrivals' ? status === 'checked_in' || status === 'checked_out' : status === 'checked_out');

export default function OverviewPage() {
  const router = useRouter();
  const t = today();
  const [day, setDay] = useState(t);
  const d = day || t;
  const monthFrom = monthStart(d);
  const monthDays = daysInMonth(monthFrom);
  const monthTo = addDays(monthFrom, monthDays);
  // From a week back: the week chart can look back, and a guest who arrived before the day and leaves on it is in the lists too.
  const soon = useApi(`/api/bookings?from=${addDays(t, -7)}&to=${addDays(t, 60)}&sort=check_in&dir=asc`).data;
  const holds = useApi('/api/bookings?when=upcoming&status=on_hold&sort=check_in&dir=asc').data;
  const month = useApi(`/api/bookings?from=${monthFrom}&to=${monthTo}`).data;
  const me = (useApi('/api/me').data?.name ?? '').split('@')[0];
  const roomCount = (useApi('/api/rooms').data ?? []).length;

  const pool = live(soon);
  const arrivals = groupRows(pool.filter((b) => b.check_in === d));
  const departures = groupRows(pool.filter((b) => b.check_out === d));
  const inHouseList = pool.filter((b) => b.check_in <= d && b.check_out > d);
  const inHouse = groupRows(inHouseList);
  const inUse = new Set(inHouseList.map((b) => b.room_id)).size;
  const holdRows = groupRows(live(holds));
  const adults = inHouseList.reduce((n, b) => n + (b.adults ?? 0), 0);
  const children = inHouseList.reduce((n, b) => n + (b.children ?? 0), 0);
  const nights = live(month).reduce((sum, b) => sum + Math.max(0, diffDays(b.check_in > monthFrom ? b.check_in : monthFrom, b.check_out < monthTo ? b.check_out : monthTo)), 0);
  const ready = Array.isArray(soon) && Array.isArray(month) && roomCount > 0;
  const pct = (n, of) => (of ? `${Math.round((n / of) * 100)}%` : '0%');
  const dash = (v) => (ready ? v : '…');

  const [ahead, setAhead] = useState(true);
  const week = range(ahead ? t : addDays(t, -7), 7).map((x) => ({
    day: x,
    arriving: groupRows(pool.filter((b) => b.check_in === x)).length,
    leaving: groupRows(pool.filter((b) => b.check_out === x)).length,
  }));

  const [parts] = useOverviewParts();
  const [kind, setKind] = useState('arrivals');
  const [filter, setFilter] = useState('all');
  const lists = {
    arrivals: { title: 'Arrivals', rows: arrivals, empty: 'Nobody arriving.' },
    departures: { title: 'Departures', rows: departures, empty: 'Nobody leaving.' },
    house: { title: 'In the house', rows: inHouse, empty: 'Nobody staying.' },
    holds: { title: 'On hold', rows: holdRows, empty: 'No holds to confirm.' },
  };
  const list = lists[kind];
  const pills = FILTERS[kind];
  const shown = pills && filter !== 'all' ? list.rows.filter((r) => isDone(kind, r.first.status) === (filter === 'done')) : list.rows;
  const pick = (k) => { setKind(k); setFilter('all'); };

  // A booking on the calendar: the address names the view, the days and the booking, and the calendar opens it.
  const open = (b) => router.push({ pathname: '/', query: { view: 'timeline', date: addDays(b.check_in, -3), span: 21, open: b.id } });

  const label = d === t ? 'Today' : fmtShort(d);
  const summary = [
    arrivals.length ? plural(arrivals.length, 'arrival') : 'No arrivals',
    departures.length ? plural(departures.length, 'departure') : 'No departures',
  ].join(' · ');
  const first = me ? `${me[0].toUpperCase()}${me.slice(1)}` : '';

  return (
    <div className="space-y-6" aria-busy={!ready}>
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-full bg-accent-soft text-2xl font-semibold text-accent-text">{first[0] ?? '·'}</span>
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-semibold leading-tight">{first ? `Hello again, ${first}` : 'Hello again'}</h1>
          <p className="mt-1 flex items-center gap-2 text-[0.9375rem] text-muted">
            <Bell size={16} aria-hidden="true" />
            <span>{label}: {ready ? summary : '…'}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-[0.9375rem] font-medium">
          <CalendarBlank size={18} aria-hidden="true" className="text-muted" />
          <span className="sr-only">Day</span>
          <input type="date" value={d} min={addDays(t, -7)} max={addDays(t, 59)} onChange={(e) => setDay(e.target.value)} className="bg-transparent font-medium outline-none" />
        </label>
        {d !== t && <button type="button" className="btn btn-quiet" onClick={() => setDay(t)}>Today</button>}
      </div>

      {parts.cards !== false && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
          <div className="min-w-0 space-y-4">
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <Figure title="Arrivals" name="Arrivals" value={dash(arrivals.length)} tone="text-accent-text" active={kind === 'arrivals'} onPick={() => pick('arrivals')}
                notes={[['Checked in', dash(arrivals.filter((r) => isDone('arrivals', r.first.status)).length)]]} />
              <Figure title="Departures" name="Departures" value={dash(departures.length)} tone="text-danger" active={kind === 'departures'} onPick={() => pick('departures')}
                notes={[['Checked out', dash(departures.filter((r) => isDone('departures', r.first.status)).length)]]} />
              <Figure title="In the house" name="Rooms in use" value={dash(inUse)} tone="text-ink" active={kind === 'house'} onPick={() => pick('house')}
                notes={[['Adults', dash(adults)], ['Children', dash(children)]]} />
              <Figure title="On hold" name="Holds" value={dash(holdRows.length)} tone="text-hold-ink" active={kind === 'holds'} onPick={() => pick('holds')}
                notes={[['Rooms', dash(holdRows.reduce((n, r) => n + r.rooms.length, 0))]]} />
            </div>

            {parts.week !== false && (
              <Card className="p-5" aria-label="Week overview">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">Week overview</h2>
                  <Pills label="Which week" value={ahead ? 'next' : 'past'} onPick={(k) => setAhead(k === 'next')} items={[['past', '-7 days'], ['next', '+7 days']]} />
                </div>
                <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,17rem)]">
                  <div className="min-w-0">
                    <p className="mb-3 flex flex-wrap items-center gap-x-4 text-[0.9375rem] font-semibold text-muted">
                      Arrivals vs. Departures
                      <span className="flex items-center gap-1.5 font-normal"><span className="size-2.5 rounded-sm bg-[#b9b8ae]" />Arrivals</span>
                      <span className="flex items-center gap-1.5 font-normal"><span className="h-0.5 w-3 bg-muted" />Departures</span>
                    </p>
                    <WeekChart days={week} />
                  </div>
                  <div>
                    <p className="mb-3 text-[0.9375rem] font-semibold text-muted">Occupancy</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Tile big label="Room occupancy" value={dash(pct(inUse, roomCount))} tone="bg-accent-soft" text="text-accent-text" />
                      <Tile big label="This month" value={dash(pct(nights, roomCount * monthDays))} tone="bg-tint" />
                      <Tile label="Available rooms" value={dash(roomCount - inUse)} />
                      <Tile label="Occupied rooms" value={dash(inUse)} />
                      <Tile label="Adults" value={dash(adults)} />
                      <Tile label="Children" value={dash(children)} />
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <Card className="overflow-hidden lg:sticky lg:top-20">
            <div className="flex items-center justify-between gap-2 px-5 pt-4">
              <h2 className="text-xl font-semibold">{list.title}</h2>
              {kind !== 'arrivals' && (
                <button type="button" className="btn btn-icon btn-quiet" aria-label="Back to arrivals" title="Back to arrivals" onClick={() => pick('arrivals')}>
                  <X size={20} weight="bold" aria-hidden="true" />
                </button>
              )}
            </div>
            {pills && <Pills label={`${list.title} filter`} items={pills} value={filter} onPick={setFilter} className="px-5 pb-3 pt-3" />}
            <div role="tabpanel" className={pills ? 'border-t border-line' : 'mt-3 border-t border-line'}>
              {shown.length ? (
                <ul className="divide-y divide-line">
                  {shown.map((r, i) => (
                    <BookingRow key={r.key} index={i} b={{ ...r.first, rooms: r.rooms, members: r.list.length > 1 ? r.list : undefined }} hidden={['contact', 'organization']} onOpen={(row) => open(row)} />
                  ))}
                </ul>
              ) : (
                <p className="t-footnote p-5">{list.empty}</p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
