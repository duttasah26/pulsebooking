import { useState } from 'react';
import { useRouter } from 'next/router';
import { roomShade } from '../../lib/colors';
import { addDays, daysInMonth, diffDays, fmtLong, fmtShort, fmtWeekday, monthStart, range, today } from '../../lib/dates';
import { useApi } from '../../lib/useApi';
import { useOverviewParts } from '../../lib/devicePrefs';
import { tabKeys } from '../../lib/tabKeys';
import { useSettings } from '../SettingsProvider';
import { formatTime } from '../TimeSelect';

// The Overview page: today's four figures, the week ahead, and the lists behind them. It reads its own data (the next 60 days, the holds,
// this month), so it is right whatever the calendar was last showing. A booking in several rooms is one row with its rooms. A row opens
// the booking on the calendar. Cancelled bookings are left out everywhere.
const live = (list) => (Array.isArray(list) ? list : []).filter((b) => b.status !== 'cancelled');
const atTime = (value) => (value ? formatTime(value) : '');

function groupRows(list) {
  const map = new Map();
  for (const b of list) {
    const key = b.group_id ?? `b${b.id}`;
    const row = map.get(key) ?? { key, first: b, rooms: [] };
    row.rooms.push(b.room_number);
    map.set(key, row);
  }
  return [...map.values()].map((r) => ({ ...r, rooms: [...new Set(r.rooms)].sort() }));
}

function Card({ className = '', children, ...rest }) {
  return <section {...rest} className={`rounded-lg border border-line bg-surface ${className}`}>{children}</section>;
}

function Stat({ label, value, tone }) {
  return (
    <Card className="p-4">
      <p className={`font-mono text-5xl font-semibold leading-none ${tone}`}>{value}</p>
      <p className="mt-2 text-[0.9375rem] font-semibold text-muted">{label}</p>
    </Card>
  );
}

function Tile({ label, value, tone = 'bg-surface-2' }) {
  return (
    <div className={`rounded-lg px-3 py-4 text-center ${tone}`}>
      <p className="font-mono text-3xl font-semibold leading-none">{value}</p>
      <p className="mt-2 text-[0.9375rem] text-muted">{label}</p>
    </div>
  );
}

// Arrivals and departures for each of the next seven days, as paired bars.
function WeekChart({ days }) {
  const top = Math.max(1, ...days.flatMap((d) => [d.arriving, d.leaving]));
  const bar = (n, fill) => <span className={`w-3 rounded-t-sm ${fill}`} style={{ height: `${(n / top) * 100}%`, minHeight: n ? 4 : 0 }} />;
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => (
        <div key={d.day} className="flex flex-col items-center gap-2" aria-label={`${fmtShort(d.day)}: ${d.arriving} arriving, ${d.leaving} leaving`}>
          <div className="flex h-32 items-end gap-1" aria-hidden="true">
            {bar(d.arriving, 'bg-accent')}
            {bar(d.leaving, 'bg-danger')}
          </div>
          <span aria-hidden="true" className="font-mono text-[0.9375rem] text-muted">{fmtWeekday(d.day)}</span>
        </div>
      ))}
    </div>
  );
}

function Rows({ rows, onOpen, detail, empty }) {
  const { settings } = useSettings();
  if (!rows.length) return <p className="t-footnote p-4">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => {
        const note = detail?.(r.first);
        return (
          <li key={r.key}>
            <button type="button" onClick={() => onOpen(r.first)} className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-2">
              <span className="min-w-32 flex-1">
                <span className="block truncate text-base font-semibold">{r.first.name || 'On hold'}</span>
                {note && <span className="block text-[0.9375rem] text-muted">{note}</span>}
              </span>
              <span className="flex flex-wrap gap-1">
                {r.rooms.map((n) => {
                  const shade = roomShade({ number: n }, settings);
                  return <span key={n} className="rounded-md px-2 font-mono text-[0.9375rem] font-semibold" style={{ backgroundColor: shade.fill, boxShadow: `inset 0 0 0 1px ${shade.edge}` }}>{n}</span>;
                })}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function OverviewPage() {
  const router = useRouter();
  const t = today();
  const monthFrom = monthStart(t);
  const monthDays = daysInMonth(monthFrom);
  const monthTo = addDays(monthFrom, monthDays);
  // From yesterday, so a guest who arrived before today and leaves today is in the lists too.
  const soon = useApi(`/api/bookings?from=${addDays(t, -1)}&to=${addDays(t, 60)}&sort=check_in&dir=asc`).data;
  const holds = useApi('/api/bookings?when=upcoming&status=on_hold&sort=check_in&dir=asc').data;
  const month = useApi(`/api/bookings?from=${monthFrom}&to=${monthTo}`).data;
  const roomCount = (useApi('/api/rooms').data ?? []).length;

  const pool = live(soon);
  const arriving = groupRows(pool.filter((b) => b.check_in === t));
  const leaving = groupRows(pool.filter((b) => b.check_out === t));
  const staying = groupRows(pool.filter((b) => b.check_in < t && b.check_out > t));
  const inUse = new Set(pool.filter((b) => b.check_in <= t && b.check_out > t).map((b) => b.room_id)).size;
  const holdRows = groupRows(live(holds));
  const coming = groupRows(pool.filter((b) => b.check_in > t));
  const week = range(t, 7).map((day) => ({
    day,
    arriving: groupRows(pool.filter((b) => b.check_in === day)).length,
    leaving: groupRows(pool.filter((b) => b.check_out === day)).length,
  }));
  const nights = live(month).reduce((sum, b) => sum + Math.max(0, diffDays(b.check_in > monthFrom ? b.check_in : monthFrom, b.check_out < monthTo ? b.check_out : monthTo)), 0);
  const ready = Array.isArray(soon) && Array.isArray(month) && roomCount > 0;
  const pct = (n, of) => (of ? `${Math.round((n / of) * 100)}%` : '0%');
  const dash = (v) => (ready ? v : '…');

  const [parts] = useOverviewParts();
  const show = (key) => parts[key] !== false;
  const tabs = [
    show('today') && { key: 'arriving', label: 'Arriving', rows: arriving, empty: 'Nobody arriving today.', detail: (b) => atTime(b.check_in_time) },
    show('today') && { key: 'leaving', label: 'Leaving', rows: leaving, empty: 'Nobody leaving today.', detail: (b) => atTime(b.check_out_time) },
    show('today') && { key: 'staying', label: 'Staying', rows: staying, empty: 'Nobody staying over.' },
    show('holds') && { key: 'holds', label: 'On hold', rows: holdRows, empty: 'No holds to confirm.', detail: (b) => `${fmtShort(b.check_in)} to ${fmtShort(b.check_out)}` },
    show('coming') && { key: 'coming', label: 'Coming up', rows: coming, empty: 'Nothing booked ahead.', detail: (b) => `${fmtShort(b.check_in)}${b.check_in_time ? `, ${atTime(b.check_in_time)}` : ''}` },
  ].filter(Boolean);
  const [picked, setPicked] = useState('arriving');
  const current = tabs.find((x) => x.key === picked) ?? tabs[0];

  // A booking on the calendar: the address names the view, the days and the booking, and the calendar opens it.
  const open = (b) => router.push({ pathname: '/', query: { view: 'timeline', date: addDays(b.check_in, -3), span: 21, open: b.id } });

  return (
    <div className="space-y-4">
      <h1 className="t-title">{fmtLong(t)}</h1>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        {show('figures') && (
          <div className="space-y-4" aria-busy={!ready}>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <Stat label="Arriving" value={dash(arriving.length)} tone="text-accent-text" />
              <Stat label="Leaving" value={dash(leaving.length)} tone="text-danger" />
              <Stat label="Rooms in use" value={dash(inUse)} />
              <Stat label="On hold" value={dash(holdRows.length)} tone="text-hold-ink" />
            </div>

            <Card className="p-4" aria-label="The week ahead">
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
                <div>
                  <h2 className="t-headline mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
                    Week ahead
                    <span className="inline-flex items-center gap-1.5 text-[0.9375rem] font-normal text-muted"><span className="size-2.5 rounded-sm bg-accent" />Arriving</span>
                    <span className="inline-flex items-center gap-1.5 text-[0.9375rem] font-normal text-muted"><span className="size-2.5 rounded-sm bg-danger" />Leaving</span>
                  </h2>
                  <WeekChart days={week} />
                </div>
                <div className="grid grid-cols-2 gap-3 self-start">
                  <Tile label="Tonight" value={dash(pct(inUse, roomCount))} tone="bg-accent-soft" />
                  <Tile label="This month" value={dash(pct(nights, roomCount * monthDays))} tone="bg-tint" />
                  <Tile label="Rooms free" value={dash(roomCount - inUse)} />
                  <Tile label="Nights booked" value={dash(nights)} />
                </div>
              </div>
            </Card>
          </div>
        )}

        {tabs.length > 0 && (
          <Card className="overflow-hidden lg:col-start-2 lg:row-start-1">
            <div role="tablist" aria-label="Lists" onKeyDown={tabKeys} className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line p-2">
              {tabs.map((x) => (
                <button
                  key={x.key}
                  role="tab"
                  type="button"
                  aria-selected={current.key === x.key}
                  tabIndex={current.key === x.key ? 0 : -1}
                  onClick={() => setPicked(x.key)}
                  className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-[0.9375rem] ${current.key === x.key ? 'bg-tint font-semibold text-ink' : 'font-medium text-muted hover:bg-tint hover:text-ink'}`}
                >
                  {x.label} <span className="font-mono">{x.rows.length}</span>
                </button>
              ))}
            </div>
            <div role="tabpanel">
              <Rows rows={current.rows} onOpen={open} detail={current.detail} empty={current.empty} />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
