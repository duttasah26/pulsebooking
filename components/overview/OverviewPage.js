import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import ShineCard from '../ShineCard';
import { Bell, CaretDown, X } from '@phosphor-icons/react';
import { addDays, daysInMonth, diffDays, fmtShort, monthStart, range, today } from '../../lib/dates';
import { useApi } from '../../lib/useApi';
import { useOverviewMeasures, useOverviewParts } from '../../lib/devicePrefs';
import { tabKeys } from '../../lib/tabKeys';
import BookingRow from '../bookings/BookingRow';
import BookingSheet from '../booking/BookingSheet';
import DateRangePicker from '../DateRangePicker';
import MeasureMenu from './MeasureMenu';
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

// A placeholder the size of a piece of text, drawn inline so the line keeps the height its text would have.
function Sk({ className = 'h-4 w-16' }) {
  return <span aria-hidden="true" className={`skeleton inline-block rounded-md align-middle ${className}`} />;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// What a figure counts: the bookings (one row each), the guests in them (adults and children), or the rooms they hold.
const guestsIn = (list) => list.reduce((n, b) => n + (b.adults ?? 0) + (b.children ?? 0), 0);
const count = (rows, measure) => (measure === 'guests' ? rows.reduce((n, r) => n + guestsIn(r.list), 0) : measure === 'rooms' ? rows.reduce((n, r) => n + r.rooms.length, 0) : rows.length);
const MEASURE_WORD = { guests: 'guest', bookings: 'booking', rooms: 'room' };
const MEASURE_NAME = { guests: 'Guests', bookings: 'Bookings', rooms: 'Rooms' };

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
// The three dots (their own button, beside the card) choose what the number counts.
function Figure({ title, value, name, pop, notes, active, onPick, measure, onMeasure, loading = false }) {
  const tone = POP[pop].text;
  return (
    <div className="relative">
      <ShineCard
        as={loading ? 'div' : 'button'}
        type={loading ? undefined : 'button'}
        aria-pressed={loading ? undefined : active}
        onClick={loading ? undefined : onPick}
        tilt={loading ? 0 : 4}
        className={`flex h-full w-full flex-col rounded-xl border p-4 text-left lg:p-3 ${active && !loading ? POP[pop].on : 'border-line bg-surface'}`}
      >
        <span className="flex items-center justify-between">
          <span className="text-[0.9375rem] font-semibold">{loading ? <Sk className="h-4 w-20" /> : title}</span>
          <span aria-hidden="true" className="size-5" />
        </span>
        <span className={`mt-3 text-center font-mono text-5xl font-medium leading-none lg:mt-2 lg:text-4xl ${tone}`}>{loading ? <span className="block h-12 lg:h-9"><Sk className="h-[0.8em] w-[1.6ch] align-top" /></span> : value}</span>
        <span className={`mt-2 text-center text-base font-semibold ${tone}`}>{loading ? <Sk className="h-4 w-24" /> : name}</span>
        <span className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5 text-[0.8125rem] text-muted lg:mt-2 lg:pt-2">
          {notes.map(([label, n]) => (
            <span key={label} className="flex items-baseline gap-1.5">{loading ? <Sk className="h-3 w-14" /> : label} <span className="font-mono text-base font-semibold text-ink">{loading ? <Sk className="h-3.5 w-4" /> : n}</span></span>
          ))}
        </span>
      </ShineCard>
      {!loading && <MeasureMenu label={title} value={measure} onPick={onMeasure} className="absolute right-2 top-2 lg:right-1.5 lg:top-1.5" />}
    </div>
  );
}

function Tile({ label, value, tone = 'bg-surface-2', text = 'text-ink', big = false, loading = false }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl px-2 text-center ${big ? 'min-h-28' : 'min-h-24'} lg:min-h-0 ${loading ? 'bg-surface-2' : tone}`}>
      <p className={`font-mono font-medium leading-none ${big ? 'text-4xl' : 'text-3xl'} ${text}`}>{loading ? <Sk className={big ? 'h-9 w-[3ch]' : 'h-7 w-[2ch]'} /> : value}</p>
      <p className={`mt-2 leading-tight ${big ? `text-[0.9375rem] font-semibold ${text}` : 'text-[0.8125rem] text-muted'}`}>{loading ? <Sk className={`h-3.5 ${big ? 'w-16' : 'w-20'}`} /> : label}</p>
    </div>
  );
}

// The chart before its data is in: the same frame, grid and bars' places as the real one, so nothing moves when the numbers arrive.
const SKELETON_BARS = [0.62, 0.3, 0.45, 0.8, 0.38, 0.55, 0.42];
function ChartSkeleton() {
  const W = 520, H = 220, L = 30, R = 12, T = 18, B = 70;
  const slot = (W - L - R) / SKELETON_BARS.length;
  const y = (f) => T + (H - T - B) * (1 - f);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="w-full max-w-xl overflow-visible lg:h-full lg:max-w-none">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={L} x2={W - R} y1={y(f)} y2={y(f)} stroke="var(--grid-line)" strokeWidth="1" strokeDasharray={f ? '3 4' : undefined} />)}
      <g className="skeleton-svg">
        {SKELETON_BARS.map((f, i) => <rect key={i} x={L + slot * i + slot / 2 - 14} y={y(f)} width="28" height={y(0) - y(f)} rx="2" style={{ fill: 'var(--surface-3)', animationDelay: `${i * 90}ms` }} />)}
      </g>
    </svg>
  );
}

// Arrivals as bars and departures as a line with its numbers boxed on the points, over a numbered axis, the days slanted underneath.
function WeekChart({ days, unit, picked, onPick }) {
  const W = 520, H = 220, L = 30, R = 12, T = 18, B = 70;
  const top = Math.max(2, ...days.flatMap((d) => [d.arriving, d.leaving]));
  const step = top <= 5 ? 1 : Math.ceil(top / 5);
  const max = Math.ceil(top / step) * step;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  const slot = (W - L - R) / days.length;
  const x = (i) => L + slot * i + slot / 2;
  const y = (n) => T + (H - T - B) * (1 - n / max);
  const summary = days.map((d) => `${fmtShort(d.day)}: ${plural(d.arriving, unit)} arriving, ${plural(d.leaving, unit)} leaving`).join('. ');
  return (
    <svg key={days[0].day + unit} viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`Arrivals and departures. ${summary}. Choose a day to show it.`} className="animate-settle w-full max-w-xl overflow-visible text-[11px] lg:h-full lg:max-w-none">
      {ticks.map((n) => (
        <g key={n}>
          <line x1={L} x2={W - R} y1={y(n)} y2={y(n)} stroke="var(--grid-line)" strokeWidth="1" strokeDasharray={n ? '3 4' : undefined} />
          <text x={L - 8} y={y(n) + 4} textAnchor="end" fill="var(--muted)">{n}</text>
        </g>
      ))}
      {days.map((d, i) => <rect key={`on-${d.day}`} x={x(i) - slot / 2 + 2} y={T - 6} width={slot - 4} height={H - T - 8} rx="6" style={{ fill: 'var(--slate-soft)', opacity: d.day === picked ? 1 : 0, transition: 'opacity 200ms var(--ease-out)' }} />)}
      {days.map((d, i) => (
        <rect key={d.day} x={x(i) - 14} y={y(d.arriving)} width="28" height={y(0) - y(d.arriving)} rx="2" style={{ fill: 'color-mix(in srgb, var(--slate) 70%, var(--surface))', y: y(d.arriving), height: y(0) - y(d.arriving), transition: 'y 320ms var(--ease-out), height 320ms var(--ease-out)' }} />
      ))}
      <polyline points={days.map((d, i) => `${x(i)},${y(d.leaving)}`).join(' ')} fill="none" stroke="var(--slate-strong)" strokeWidth="2" />
      {days.map((d, i) => (
        <g key={d.day}>
          <rect x={x(i) - 9} y={y(d.leaving) - 9} width="18" height="18" rx="3" fill="var(--slate-strong)" />
          <text x={x(i)} y={y(d.leaving) + 4} textAnchor="middle" fill="var(--surface)" fontWeight="600">{d.leaving}</text>
          <text transform={`translate(${x(i) + 4} ${H - B + 14}) rotate(-45)`} textAnchor="end" fill="var(--ink)" style={{ opacity: d.day === picked ? 1 : 0.65, transition: 'opacity 200ms var(--ease-out)' }}>{fmtShort(d.day)}</text>
        </g>
      ))}
      {days.map((d, i) => (
        <rect
          key={`hit-${d.day}`}
          role="button"
          tabIndex={0}
          aria-label={`Show ${fmtShort(d.day)}`}
          aria-pressed={d.day === picked}
          x={x(i) - slot / 2}
          y={T - 6}
          width={slot}
          height={H - T + 6}
          fill="var(--slate)"
          fillOpacity="0"
          className="cursor-pointer outline-none hover:[fill-opacity:0.1] focus-visible:[fill-opacity:0.14]"
          onClick={() => onPick(d.day)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(d.day); } }}
        />
      ))}
    </svg>
  );
}

// The day tab and the calendar under it: the same month picker as the calendar's Go to (with a line to type "next fri", "dec 1"), for one day.
function DayPicker({ day, today: t, onPick, loading = false }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => !box.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={loading}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-11 min-w-[11.5rem] items-center justify-between gap-2 rounded-t-xl bg-canvas px-4 text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:h-10"
      >
        <span className="sr-only">Day: </span>
        {loading ? <Sk className="h-4 w-32" /> : <span>{day === t ? `Today, ${fmtShort(day)}` : fmtShort(day)}</span>}
        {!loading && <CaretDown size={16} weight="bold" aria-hidden="true" className="text-muted" />}
      </button>
      {open && (
        <div role="dialog" aria-label="Choose the day" className="popover-in absolute left-0 top-full z-40 mt-1.5 w-[min(21rem,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-3 shadow-lg">
          <DateRangePicker single checkIn={day} checkOut={addDays(day, 1)} min={addDays(t, -7)} max={addDays(t, 59)} onChange={(a) => { onPick(a); setOpen(false); }} />
        </div>
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
  const adults = inHouseList.reduce((n, b) => n + (b.adults ?? 0), 0);
  const children = inHouseList.reduce((n, b) => n + (b.children ?? 0), 0);
  const nights = live(month).reduce((sum, b) => sum + Math.max(0, diffDays(b.check_in > monthFrom ? b.check_in : monthFrom, b.check_out < monthTo ? b.check_out : monthTo)), 0);
  const ready = Array.isArray(soon) && Array.isArray(month) && Array.isArray(holds) && meApi.data !== undefined && roomCount > 0;
  const pct = (n, of) => (of ? `${Math.round((n / of) * 100)}%` : '0%');
  // Until the data is in, every figure is a skeleton block the size of the number, so the page keeps its shape and nothing shows a placeholder dash.
  const dash = (v) => (ready ? v : <span aria-hidden="true" className="skeleton inline-block h-[0.8em] w-[1.6ch] rounded-md align-baseline" />);

  const [measures, setMeasure] = useOverviewMeasures();
  const [ahead, setAhead] = useState(true);
  const week = range(ahead ? t : addDays(t, -7), 7).map((x) => ({
    day: x,
    arriving: count(groupRows(pool.filter((b) => b.check_in === x)), measures.week),
    leaving: count(groupRows(pool.filter((b) => b.check_out === x)), measures.week),
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
  return (
    <div className={`-mt-4 grid gap-x-6 md:-mb-4 ${panel ? 'lg:grid-cols-[minmax(0,1fr)_30rem]' : ''}`} aria-busy={!ready}>
      <div className="flex min-w-0 flex-col gap-6 pt-0 md:pb-4 lg:h-[calc(100dvh-3.5rem-1px)] lg:gap-4">
        <div className="-ml-4 flex flex-col gap-3 bg-surface pl-4 pr-4 pt-3 md:-ml-6 md:pl-6 lg:-mr-6">
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden="true" className={`grid size-14 shrink-0 place-items-center rounded-full text-xl font-semibold text-accent-text ${ready ? 'bg-accent-soft' : 'skeleton'}`}>{ready ? first[0] ?? '·' : ''}</span>
          <div className="min-w-0">
            <h1 className="truncate text-[1.875rem] font-bold leading-tight">{ready ? (first ? `Hello again, ${first}` : 'Hello again') : <Sk className="h-8 w-72 max-w-full" />}</h1>
            <p className="mt-1 flex items-center gap-2 text-[0.9375rem] text-muted">
              {ready ? <Bell size={16} weight="fill" aria-hidden="true" /> : <Sk className="size-4 rounded-full" />}
              {ready ? <span className="min-w-0 truncate">{label}: {summary}</span> : <span aria-hidden="true"><span className="skeleton inline-block h-4 w-56 rounded-md align-middle" /></span>}
            </p>
          </div>
        </div>
          {/* The day, as a tab in the page's grey rising out of the white band and flowing into the grey below. It opens the same calendar as Go to on the Calendar, with a line to type the day in words. */}
          <div className="flex items-end gap-3">
            <DayPicker day={d} today={t} onPick={setDay} loading={!ready} />
            {/* Always there so the row never changes height or width; it only fades in once the day is not today. */}
            <button type="button" className={`btn btn-quiet transition-opacity ${d === t ? 'pointer-events-none opacity-0' : ''}`} tabIndex={d === t ? -1 : undefined} aria-hidden={d === t ? true : undefined} onClick={() => setDay(t)}>Today</button>
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-4 lg:flex-1">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Figure loading={!ready} title="Arrivals" name={MEASURE_NAME[measures.arrivals]} value={dash(count(arrivals, measures.arrivals))} pop="green" active={kind === 'arrivals'} onPick={() => pick('arrivals')}
              measure={measures.arrivals} onMeasure={(m) => setMeasure({ ...measures, arrivals: m })}
              notes={[['Checked in', dash(count(arrivals.filter((r) => isDone('arrivals', r.first.status)), measures.arrivals))]]} />
            <Figure loading={!ready} title="Departures" name={MEASURE_NAME[measures.departures]} value={dash(count(departures, measures.departures))} pop="red" active={kind === 'departures'} onPick={() => pick('departures')}
              measure={measures.departures} onMeasure={(m) => setMeasure({ ...measures, departures: m })}
              notes={[['Checked out', dash(count(departures.filter((r) => isDone('departures', r.first.status)), measures.departures))]]} />
            <Figure loading={!ready} title="In the house" name={measures.house === 'rooms' ? 'Rooms in use' : MEASURE_NAME[measures.house]} value={dash(count(inHouse, measures.house))} pop="blue" active={kind === 'house'} onPick={() => pick('house')}
              measure={measures.house} onMeasure={(m) => setMeasure({ ...measures, house: m })}
              notes={[['Adults', dash(adults)], ['Children', dash(children)]]} />
            <Figure loading={!ready} title="Upcoming" name={MEASURE_NAME[measures.upcoming]} value={dash(count(upcoming, measures.upcoming))} pop="violet" active={kind === 'upcoming'} onPick={() => pick('upcoming')}
              measure={measures.upcoming} onMeasure={(m) => setMeasure({ ...measures, upcoming: m })}
              notes={[['Next 7 days', dash(count(upcoming.filter((r) => r.first.check_in < addDays(d, 8)), measures.upcoming))]]} />
            <Figure loading={!ready} title="On hold" name={measures.holds === 'bookings' ? 'Holds' : MEASURE_NAME[measures.holds]} value={dash(count(holdRows, measures.holds))} pop="amber" active={kind === 'holds'} onPick={() => pick('holds')}
              measure={measures.holds} onMeasure={(m) => setMeasure({ ...measures, holds: m })}
              notes={[measures.holds === 'rooms' ? ['Holds', dash(holdRows.length)] : ['Rooms', dash(count(holdRows, 'rooms'))]]} />
          </div>

          {parts.week !== false && (
            <Card className="p-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col" aria-label="Week overview">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold">{ready ? 'Week overview' : <Sk className="h-4 w-32" />}</h2>
                {ready ? (
                  <div className="flex items-center gap-2">
                    <Pills label="Which week" value={ahead ? 'next' : 'past'} onPick={(k) => setAhead(k === 'next')} items={[['past', '-7 days'], ['next', '+7 days']]} />
                    <MeasureMenu label="Week overview" value={measures.week} onPick={(m) => setMeasure({ ...measures, week: m })} className="relative" />
                  </div>
                ) : (
                  <div aria-hidden="true" className="flex items-center gap-2"><span className="skeleton h-9 w-[4.75rem] rounded-full" /><span className="skeleton h-9 w-[4.75rem] rounded-full" /><span className="skeleton size-9 rounded-full" /></div>
                )}
              </div>
              <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] lg:min-h-0 lg:flex-1">
                <div className="flex min-h-0 min-w-0 flex-col">
                  {!ready ? (
                    <p className="mb-3 flex items-center text-[0.9375rem] font-semibold"><span><Sk className="h-4 w-72 max-w-full" /></span></p>
                  ) : (
                  <p className="mb-3 flex flex-wrap items-center gap-x-4 text-[0.9375rem] font-semibold text-muted">
                    Arrivals vs. Departures{measures.week !== 'bookings' && <span className="font-normal"> ({MEASURE_NAME[measures.week].toLowerCase()})</span>}
                    <span className="flex items-center gap-1.5 font-normal"><span className="size-2.5 rounded-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--slate) 70%, var(--surface))' }} />Arrivals</span>
                    <span className="flex items-center gap-1.5 font-normal"><span className="h-0.5 w-3 bg-[var(--slate-strong)]" />Departures</span>
                  </p>
                  )}
                  <div className="min-h-0 lg:flex-1">{ready ? <WeekChart days={week} unit={MEASURE_WORD[measures.week]} picked={d} onPick={setDay} /> : <ChartSkeleton />}</div>
                </div>
                <div className="flex min-h-0 flex-col">
                  <p className="mb-3 text-[0.9375rem] font-semibold text-muted">{ready ? 'Occupancy' : <Sk className="h-4 w-24" />}</p>
                  <div className="grid grid-cols-2 gap-3 lg:min-h-0 lg:flex-1 lg:grid-rows-3">
                    <Tile loading={!ready} big label="Today" value={dash(pct(inUse, roomCount))} tone="bg-pop-violet-soft" text="text-pop-violet" />
                    <Tile loading={!ready} big label="This month" value={dash(pct(nights, roomCount * monthDays))} tone="bg-pop-green-soft" text="text-pop-green" />
                    <Tile loading={!ready} label="Available rooms" tone="bg-[var(--slate-soft)]" value={dash(roomCount - inUse)} />
                    <Tile loading={!ready} label="Occupied rooms" tone="bg-[var(--slate-soft)]" value={dash(inUse)} />
                    <Tile loading={!ready} label="Adults" tone="bg-[var(--slate-soft)]" value={dash(adults)} />
                    <Tile loading={!ready} label="Children" tone="bg-[var(--slate-soft)]" value={dash(children)} />
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {panel && (
        <aside aria-label={list.title} className="-mx-4 border-t border-line bg-surface md:-mx-6 lg:ml-0 lg:-mr-6 lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:self-start lg:overflow-y-auto lg:border-l lg:border-t-0 lg:[scrollbar-gutter:stable]">
          <div className="flex min-h-14 items-center justify-between gap-2 px-4">
            <h2 className="text-base font-semibold">{ready ? list.title : <Sk className="h-4 w-24" />}</h2>
            {kind !== 'arrivals' && (
              <button type="button" className="btn btn-icon btn-quiet" aria-label="Back to arrivals" title="Back to arrivals" onClick={() => pick('arrivals')}>
                <X size={20} weight="bold" aria-hidden="true" />
              </button>
            )}
          </div>
          {pills && (ready
            ? <Pills label={`${list.title} filter`} items={pills} value={filter} onPick={setFilter} className="px-4 pb-3" />
            : <div aria-hidden="true" className="flex gap-2 px-4 pb-3"><span className="skeleton h-9 w-[3.25rem] rounded-full" /><span className="skeleton h-9 w-[8.25rem] rounded-full" /><span className="skeleton h-9 w-[6.75rem] rounded-full" /></div>)}
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
