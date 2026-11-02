import { useState } from 'react';
import { useRouter } from 'next/router';
import { Bell, CaretDown, DotsThreeVertical, X } from '@phosphor-icons/react';
import { addDays, daysInMonth, diffDays, fmtShort, monthStart, range, today } from '../../lib/dates';
import { useApi } from '../../lib/useApi';
import { useOverviewParts } from '../../lib/devicePrefs';
import { tabKeys } from '../../lib/tabKeys';
import BookingRow from '../bookings/BookingRow';
import BookingSheet from '../booking/BookingSheet';
import { useToast } from '../Toast';
import { NeedGuestError, confirmHolds } from '../../lib/holds';

// The Overview page. Left: the day's figures (they also choose the list), the week overview with its chart and occupancy tiles.
// Right: the list behind the chosen figure, with filter pills. It reads its own data (a week back to 60 days ahead, the holds, this
// month). A booking in several rooms is one row with its rooms. A row opens the booking in a panel on this page, with an arrow to show it on the calendar. Cancelled bookings are left out.
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

// Each figure has its own vivid colour (tokens --pop-*), written out in full so Tailwind sees them. Chosen, a card takes its colour's edge and soft fill.
const POP = {
  green: { text: 'text-pop-green', on: 'border-pop-green bg-pop-green-soft shadow-[0_0_0_1px_var(--pop-green)]' },
  red: { text: 'text-pop-red', on: 'border-pop-red bg-pop-red-soft shadow-[0_0_0_1px_var(--pop-red)]' },
  blue: { text: 'text-pop-blue', on: 'border-pop-blue bg-pop-blue-soft shadow-[0_0_0_1px_var(--pop-blue)]' },
  violet: { text: 'text-pop-violet', on: 'border-pop-violet bg-pop-violet-soft shadow-[0_0_0_1px_var(--pop-violet)]' },
  amber: { text: 'text-pop-amber', on: 'border-pop-amber bg-pop-amber-soft shadow-[0_0_0_1px_var(--pop-amber)]' },
};

// One of the figures: a title, a big centred number in its colour, its name under it, and a small count. Choosing it fills the list.
function Figure({ title, value, name, pop, notes, active, onPick }) {
  const tone = POP[pop].text;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onPick}
      className={`flex flex-col rounded-xl border p-4 text-left transition-[box-shadow,background-color] duration-150 lg:p-3 ${active ? POP[pop].on : 'border-line bg-surface hover:shadow-md'}`}
    >
      <span className="flex items-center justify-between">
        <span className="text-[0.9375rem] font-semibold">{title}</span>
        <DotsThreeVertical size={20} weight="bold" aria-hidden="true" className="text-muted" />
      </span>
      <span className={`mt-3 text-center font-mono text-5xl font-medium leading-none lg:mt-2 lg:text-4xl ${tone}`}>{value}</span>
      <span className={`mt-2 text-center text-base font-semibold ${tone}`}>{name}</span>
      <span className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5 text-[0.8125rem] text-muted lg:mt-2 lg:pt-2">
        {notes.map(([label, n]) => (
          <span key={label} className="flex items-baseline gap-1.5">{label} <span className="font-mono text-base font-semibold text-ink">{n}</span></span>
        ))}
      </span>
    </button>
  );
}

function Tile({ label, value, tone = 'bg-surface-2', text = 'text-ink', big = false }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl px-2 text-center ${big ? 'min-h-28' : 'min-h-24'} lg:min-h-0 ${tone}`}>
      <p className={`font-mono font-medium leading-none ${big ? 'text-4xl' : 'text-3xl'} ${text}`}>{value}</p>
      <p className={`mt-2 leading-tight ${big ? `text-[0.9375rem] font-semibold ${text}` : 'text-[0.8125rem] text-muted'}`}>{label}</p>
    </div>
  );
}

// Arrivals as bars and departures as a line with its numbers boxed on the points, over a numbered axis, the days slanted underneath.
function WeekChart({ days }) {
  const W = 520, H = 220, L = 30, R = 12, T = 18, B = 70;
  const top = Math.max(2, ...days.flatMap((d) => [d.arriving, d.leaving]));
  const step = top <= 5 ? 1 : Math.ceil(top / 5);
  const max = Math.ceil(top / step) * step;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  const slot = (W - L - R) / days.length;
  const x = (i) => L + slot * i + slot / 2;
  const y = (n) => T + (H - T - B) * (1 - n / max);
  const summary = days.map((d) => `${fmtShort(d.day)}: ${plural(d.arriving, 'arrival')}, ${plural(d.leaving, 'departure')}`).join('. ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Arrivals and departures. ${summary}`} className="w-full max-w-xl overflow-visible text-[11px] lg:h-full lg:max-w-none">
      {ticks.map((n) => (
        <g key={n}>
          <line x1={L} x2={W - R} y1={y(n)} y2={y(n)} stroke="var(--grid-line)" strokeWidth="1" strokeDasharray={n ? '3 4' : undefined} />
          <text x={L - 8} y={y(n) + 4} textAnchor="end" fill="var(--muted)">{n}</text>
        </g>
      ))}
      {days.map((d, i) => (
        <rect key={d.day} x={x(i) - 14} y={y(d.arriving)} width="28" height={y(0) - y(d.arriving)} rx="2" style={{ fill: 'color-mix(in srgb, var(--slate) 70%, var(--surface))' }} />
      ))}
      <polyline points={days.map((d, i) => `${x(i)},${y(d.leaving)}`).join(' ')} fill="none" stroke="var(--slate-strong)" strokeWidth="2" />
      {days.map((d, i) => (
        <g key={d.day}>
          <rect x={x(i) - 9} y={y(d.leaving) - 9} width="18" height="18" rx="3" fill="var(--slate-strong)" />
          <text x={x(i)} y={y(d.leaving) + 4} textAnchor="middle" fill="var(--surface)" fontWeight="600">{d.leaving}</text>
          <text transform={`translate(${x(i) + 4} ${H - B + 14}) rotate(-45)`} textAnchor="end" fill="var(--muted)">{fmtShort(d.day)}</text>
        </g>
      ))}
    </svg>
  );
}

// The whole page in outline, shown until every request is in, so the page appears once, complete, and never fills in piece by piece.
function OverviewSkeleton({ panel, week }) {
  const block = (cls, i = 0) => <div aria-hidden="true" className={`skeleton ${cls}`} style={{ animationDelay: `${i * 90}ms` }} />;
  return (
    <div className={`-mt-4 grid gap-x-6 md:-mb-4 ${panel ? 'lg:grid-cols-[minmax(0,1fr)_30rem]' : ''}`} aria-busy="true" aria-label="Loading the overview">
      <div className="flex min-w-0 flex-col gap-6 pt-4 md:pb-4 lg:h-[calc(100dvh-3.5rem-1px)] lg:gap-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex items-center gap-4">
            {block('size-16 shrink-0 rounded-full')}
            <div className="space-y-2">{block('h-8 w-64 rounded-md')}{block('h-4 w-40 rounded-md', 1)}</div>
          </div>
        </div>
        <div className="flex min-h-0 flex-col gap-4 lg:flex-1">
          <div className="-mb-1 border-b border-line">{block('h-11 w-44 rounded-t-xl')}</div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => block('h-44 rounded-xl lg:h-32', i))}
          </div>
          {week && block('h-96 w-full rounded-xl lg:h-auto lg:flex-1', 2)}
        </div>
      </div>
      {panel && (
        <aside className="-mx-4 border-t border-line bg-surface md:-mx-6 lg:ml-0 lg:-mr-6 lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:self-start lg:overflow-hidden lg:border-l lg:border-t-0">
          <div className="flex min-h-14 items-center px-4">{block('h-5 w-24 rounded-md')}</div>
          <div className="flex gap-2 px-4 pb-3">{[0, 1, 2].map((i) => block('h-9 w-28 rounded-full', i))}</div>
          <div className="space-y-px border-t border-line">{[0, 1, 2, 3, 4].map((i) => block('h-[4.5rem] w-full', i))}</div>
        </aside>
      )}
    </div>
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
  const toast = useToast();
  const [sheet, setSheet] = useState(null);
  const soonApi = useApi(`/api/bookings?from=${addDays(t, -7)}&to=${addDays(t, 60)}&sort=check_in&dir=asc`);
  const holdsApi = useApi('/api/bookings?when=upcoming&status=on_hold&sort=check_in&dir=asc');
  const monthApi = useApi(`/api/bookings?from=${monthFrom}&to=${monthTo}`);
  const soon = soonApi.data;
  const holds = holdsApi.data;
  const month = monthApi.data;
  const reload = () => { soonApi.reload(); holdsApi.reload(); monthApi.reload(); };
  const meApi = useApi('/api/me');
  const me = (meApi.data?.name ?? '').split('@')[0];
  const rooms = useApi('/api/rooms').data ?? [];
  const roomCount = rooms.length;

  const pool = live(soon);
  const arrivals = groupRows(pool.filter((b) => b.check_in === d));
  const departures = groupRows(pool.filter((b) => b.check_out === d));
  const inHouseList = pool.filter((b) => b.check_in <= d && b.check_out > d);
  const inHouse = groupRows(inHouseList);
  const inUse = new Set(inHouseList.map((b) => b.room_id)).size;
  const holdRows = groupRows(live(holds));
  const upcoming = groupRows(pool.filter((b) => b.check_in > d));
  const thisWeek = upcoming.filter((r) => r.first.check_in < addDays(d, 8)).length;
  const adults = inHouseList.reduce((n, b) => n + (b.adults ?? 0), 0);
  const children = inHouseList.reduce((n, b) => n + (b.children ?? 0), 0);
  const nights = live(month).reduce((sum, b) => sum + Math.max(0, diffDays(b.check_in > monthFrom ? b.check_in : monthFrom, b.check_out < monthTo ? b.check_out : monthTo)), 0);
  const ready = Array.isArray(soon) && Array.isArray(month) && Array.isArray(holds) && meApi.data !== undefined && roomCount > 0;
  const pct = (n, of) => (of ? `${Math.round((n / of) * 100)}%` : '0%');
  // Until the data is in, every figure is a skeleton block the size of the number, so the page keeps its shape and nothing shows a placeholder dash.
  const dash = (v) => (ready ? v : <span aria-hidden="true" className="skeleton inline-block h-[0.8em] w-[1.6ch] rounded-md align-baseline" />);

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
    upcoming: { title: 'Upcoming', rows: upcoming, empty: 'Nothing booked ahead.' },
    holds: { title: 'On hold', rows: holdRows, empty: 'No holds to confirm.' },
  };
  const list = lists[kind];
  const pills = FILTERS[kind];
  const shown = pills && filter !== 'all' ? list.rows.filter((r) => isDone(kind, r.first.status) === (filter === 'done')) : list.rows;
  const pick = (k) => { setKind(k); setFilter('all'); };

  const open = (b, members) => setSheet({ mode: 'edit', booking: b, group: members?.length > 1 ? members : undefined });
  // The same booking on the calendar: the address names the view, the days and the booking, and the calendar opens it.
  const showInCalendar = (b) => router.push({ pathname: '/', query: { view: 'timeline', date: addDays(b.check_in, -3), span: 21, open: b.id } });

  const label = d === t ? 'Today' : fmtShort(d);
  const summary = [
    arrivals.length ? plural(arrivals.length, 'arrival') : 'No arrivals',
    departures.length ? plural(departures.length, 'departure') : 'No departures',
  ].join(' · ');
  const first = me ? `${me[0].toUpperCase()}${me.slice(1)}` : '';

  // The list panel runs the full height of the page along its right edge; everything else sits in the column beside it.
  const panel = parts.cards !== false;
  if (!ready) return <OverviewSkeleton panel={panel} week={parts.week !== false} />;
  return (
    <div className={`-mt-4 grid gap-x-6 md:-mb-4 ${panel ? 'lg:grid-cols-[minmax(0,1fr)_30rem]' : ''}`} aria-busy={!ready}>
      <div className="flex min-w-0 flex-col gap-6 pt-4 md:pb-4 lg:h-[calc(100dvh-3.5rem-1px)] lg:gap-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-full bg-accent-soft text-2xl font-semibold text-accent-text">{first[0] ?? '·'}</span>
          <div className="min-w-0">
            <h1 className="truncate text-[1.875rem] font-bold leading-tight">{first ? `Hello again, ${first}` : 'Hello again'}</h1>
            <p className="mt-1 flex items-center gap-2 text-[0.9375rem] text-muted">
              <Bell size={16} weight="fill" aria-hidden="true" />
              {ready ? <span>{label}: {summary}</span> : <span aria-hidden="true" className="skeleton h-4 w-56 rounded-md" />}
            </p>
          </div>
        </div>
        </div>

        <div className="flex min-h-0 flex-col gap-4 lg:flex-1">
          {/* The day, as a tab above the figures (a dropdown: the page behind it is the native date picker, so it works with the keyboard and on phones). */}
          <div className="-mb-1 flex items-end gap-3 border-b border-line">
            <label className="relative -mb-px inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-t-xl border border-b-0 border-line bg-surface px-4 text-base font-semibold focus-within:outline focus-within:outline-2 focus-within:outline-offset-2">
              <span className="sr-only">Day</span>
              <span aria-hidden="true">{d === t ? `Today, ${fmtShort(d)}` : fmtShort(d)}</span>
              <CaretDown size={16} weight="bold" aria-hidden="true" className="text-muted" />
              <input type="date" value={d} min={addDays(t, -7)} max={addDays(t, 59)} onChange={(e) => setDay(e.target.value)} onClick={(e) => e.currentTarget.showPicker?.()} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </label>
            {d !== t && <button type="button" className="btn btn-quiet mb-1" onClick={() => setDay(t)}>Today</button>}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Figure title="Arrivals" name="Arrivals" value={dash(arrivals.length)} pop="green" active={kind === 'arrivals'} onPick={() => pick('arrivals')}
              notes={[['Checked in', dash(arrivals.filter((r) => isDone('arrivals', r.first.status)).length)]]} />
            <Figure title="Departures" name="Departures" value={dash(departures.length)} pop="red" active={kind === 'departures'} onPick={() => pick('departures')}
              notes={[['Checked out', dash(departures.filter((r) => isDone('departures', r.first.status)).length)]]} />
            <Figure title="In the house" name="Rooms in use" value={dash(inUse)} pop="blue" active={kind === 'house'} onPick={() => pick('house')}
              notes={[['Adults', dash(adults)], ['Children', dash(children)]]} />
            <Figure title="Upcoming" name="Bookings" value={dash(upcoming.length)} pop="violet" active={kind === 'upcoming'} onPick={() => pick('upcoming')}
              notes={[['Next 7 days', dash(thisWeek)]]} />
            <Figure title="On hold" name="Holds" value={dash(holdRows.length)} pop="amber" active={kind === 'holds'} onPick={() => pick('holds')}
              notes={[['Rooms', dash(holdRows.reduce((n, r) => n + r.rooms.length, 0))]]} />
          </div>

          {parts.week !== false && (
            <Card className="p-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col" aria-label="Week overview">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Week overview</h2>
                <Pills label="Which week" value={ahead ? 'next' : 'past'} onPick={(k) => setAhead(k === 'next')} items={[['past', '-7 days'], ['next', '+7 days']]} />
              </div>
              <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] lg:min-h-0 lg:flex-1">
                <div className="flex min-h-0 min-w-0 flex-col">
                  <p className="mb-3 flex flex-wrap items-center gap-x-4 text-[0.9375rem] font-semibold text-muted">
                    Arrivals vs. Departures
                    <span className="flex items-center gap-1.5 font-normal"><span className="size-2.5 rounded-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--slate) 70%, var(--surface))' }} />Arrivals</span>
                    <span className="flex items-center gap-1.5 font-normal"><span className="h-0.5 w-3 bg-[var(--slate-strong)]" />Departures</span>
                  </p>
                  <div className="min-h-0 lg:flex-1"><WeekChart days={week} /></div>
                </div>
                <div className="flex min-h-0 flex-col">
                  <p className="mb-3 text-[0.9375rem] font-semibold text-muted">Occupancy</p>
                  <div className="grid grid-cols-2 gap-3 lg:min-h-0 lg:flex-1 lg:grid-rows-3">
                    <Tile big label="Today" value={dash(pct(inUse, roomCount))} tone="bg-pop-violet-soft" text="text-pop-violet" />
                    <Tile big label="This month" value={dash(pct(nights, roomCount * monthDays))} tone="bg-pop-green-soft" text="text-pop-green" />
                    <Tile label="Available rooms" tone="bg-[var(--slate-soft)]" value={dash(roomCount - inUse)} />
                    <Tile label="Occupied rooms" tone="bg-[var(--slate-soft)]" value={dash(inUse)} />
                    <Tile label="Adults" tone="bg-[var(--slate-soft)]" value={dash(adults)} />
                    <Tile label="Children" tone="bg-[var(--slate-soft)]" value={dash(children)} />
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {panel && (
        <aside aria-label={list.title} className="-mx-4 border-t border-line bg-surface md:-mx-6 lg:ml-0 lg:-mr-6 lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:self-start lg:overflow-y-auto lg:border-l lg:border-t-0">
          <div className="flex min-h-14 items-center justify-between gap-2 px-4">
            <h2 className="text-base font-semibold">{list.title}</h2>
            {kind !== 'arrivals' && (
              <button type="button" className="btn btn-icon btn-quiet" aria-label="Back to arrivals" title="Back to arrivals" onClick={() => pick('arrivals')}>
                <X size={20} weight="bold" aria-hidden="true" />
              </button>
            )}
          </div>
          {pills && <Pills label={`${list.title} filter`} items={pills} value={filter} onPick={setFilter} className="px-4 pb-3" />}
          <div role="tabpanel" className="border-t border-line">
            {!ready ? (
              <div aria-hidden="true" className="space-y-px">
                {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[4.5rem] w-full" style={{ animationDelay: `${i * 90}ms` }} />)}
              </div>
            ) : shown.length ? (
              <ul className="divide-y divide-line">
                {shown.map((r, i) => (
                  <BookingRow key={r.key} index={i} b={{ ...r.first, rooms: r.rooms, members: r.list.length > 1 ? r.list : undefined }} hidden={['contact', 'organization', 'status']} minimal onOpen={open} />
                ))}
              </ul>
            ) : (
              <p className="t-footnote p-4">{list.empty}</p>
            )}
          </div>
        </aside>
      )}

      {sheet && (
        <BookingSheet
          key={sheet.booking.id}
          {...sheet}
          rooms={rooms}
          onClose={() => setSheet(null)}
          onSaved={(message) => { reload(); if (message) toast({ message, duration: 3000 }); }}
          onShowInCalendar={showInCalendar}
          onConfirm={async (b) => {
            setSheet(null);
            try {
              await confirmHolds([b]);
              toast({ message: 'Hold confirmed', duration: 3000 });
              reload();
            } catch (err) {
              if (err instanceof NeedGuestError) {
                setSheet({ mode: 'edit', booking: b });
                toast({ message: err.message, important: true });
              } else {
                toast({ message: err.message });
              }
            }
          }}
        />
      )}
    </div>
  );
}
