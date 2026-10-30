import { Bed, SignIn, SignOut, X } from '@phosphor-icons/react';
import { roomShade } from '../../lib/colors';
import { addDays, daysInMonth, diffDays, fmtMonth, fmtShort, monthStart, today } from '../../lib/dates';
import { useApi } from '../../lib/useApi';
import { useSettings } from '../SettingsProvider';
import { formatTime } from '../TimeSelect';

// The panel behind the Overview tab, lying over the calendar's right edge (like the booking panel, so the calendar never changes
// size). It reads its own data, so it is right whichever month the calendar is showing:
//   three figures      rooms in use tonight, arrivals in the next 7 days, nights booked this month
//   coming up, holds   the next few parties to check in, and holds still to confirm
//   the day's lists    who arrives, leaves and stays on one day (today, or the day clicked on the calendar)
// A booking in several rooms is one row with its rooms. A row opens the booking. Cancelled bookings are left out everywhere.
const live = (list) => (Array.isArray(list) ? list : []).filter((b) => b.status !== 'cancelled');

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

function Figure({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[0.9375rem] text-muted">{label}</dt>
      <dd className="font-mono text-base font-semibold">{children}</dd>
    </div>
  );
}

function Section({ icon: Icon, tone, title, count, rows, onOpen, detail }) {
  const { settings } = useSettings();
  if (!rows.length) return null;
  return (
    <section aria-label={title} className="space-y-1">
      <h3 className="t-group flex items-center gap-2">
        {Icon && <Icon size={18} aria-hidden="true" className={tone} />}
        {title} <span className="font-mono text-ink">{count ?? rows.length}</span>
      </h3>
      <ul className="-mx-2">
        {rows.map((r) => {
          const note = detail?.(r.first);
          return (
            <li key={r.key}>
              <button type="button" onClick={() => onOpen(r.first)} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors duration-150 hover:bg-surface-2 lg:py-1.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold">{r.first.name || 'On hold'}</span>
                  {note && <span className="block text-[0.9375rem] text-muted">{note}</span>}
                </span>
                <span className="flex shrink-0 flex-wrap justify-end gap-1">
                  {r.rooms.map((n) => {
                    const shade = roomShade({ number: n }, settings);
                    return <span key={n} className="rounded-md px-1.5 font-mono text-[0.9375rem] font-semibold" style={{ backgroundColor: shade.fill, boxShadow: `inset 0 0 0 1px ${shade.edge}` }}>{n}</span>;
                  })}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const atTime = (value) => (value ? formatTime(value) : '');

export default function OverviewPanel({ bookings, roomCount, day, onOpen, onClose }) {
  const t = today();
  const d = day ?? t;
  const isToday = d === t;
  const monthFrom = monthStart(t);
  const monthDays = daysInMonth(monthFrom);
  const monthTo = addDays(monthFrom, monthDays);
  const soon = useApi(`/api/bookings?from=${t}&to=${addDays(t, 60)}&sort=check_in&dir=asc`).data;
  const holds = useApi('/api/bookings?when=upcoming&status=on_hold&sort=check_in&dir=asc').data;
  const month = useApi(`/api/bookings?from=${monthFrom}&to=${monthTo}`).data;

  // The day's lists come from the next 60 days (always ready); a clicked day outside that comes from what the calendar loaded.
  const pool = live(!isToday && (d < t || d >= addDays(t, 60)) ? bookings : soon ?? bookings);
  const arriving = groupRows(pool.filter((b) => b.check_in === d));
  const leaving = groupRows(pool.filter((b) => b.check_out === d));
  const staying = groupRows(pool.filter((b) => b.check_in < d && b.check_out > d));
  const inUse = new Set(pool.filter((b) => b.check_in <= d && b.check_out > d).map((b) => b.room_id)).size;

  const coming = groupRows(live(soon).filter((b) => b.check_in > t));
  const arrivals7 = groupRows(live(soon).filter((b) => b.check_in >= t && b.check_in < addDays(t, 7))).length;
  const nights = live(month).reduce((sum, b) => sum + Math.max(0, diffDays(b.check_in > monthFrom ? b.check_in : monthFrom, b.check_out < monthTo ? b.check_out : monthTo)), 0);
  const holdRows = groupRows(live(holds));
  const ready = Array.isArray(soon) && Array.isArray(month);
  const quiet = !arriving.length && !leaving.length && !staying.length;

  return (
    <aside aria-label="Overview" className="no-scrollbar h-full animate-dock-in space-y-5 overflow-y-auto overscroll-contain rounded-lg border border-line bg-surface p-4 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <h2 className="t-title min-w-0 truncate">Overview</h2>
        <button type="button" className="btn btn-icon shrink-0" aria-label="Hide overview" title="Hide overview" onClick={onClose}>
          <X size={20} weight="bold" aria-hidden="true" />
        </button>
      </div>

      <dl className="space-y-1.5" aria-busy={!ready}>
        <Figure label={isToday ? 'Rooms in use tonight' : `Rooms in use, ${fmtShort(d)}`}>{ready || !isToday ? `${inUse} of ${roomCount}` : '…'}</Figure>
        <Figure label="Arriving, next 7 days">{ready ? arrivals7 : '…'}</Figure>
        <Figure label={`Nights booked, ${fmtMonth(monthFrom).split(' ')[0]}`}>{ready ? `${nights} of ${roomCount * monthDays}` : '…'}</Figure>
      </dl>

      <Section icon={SignIn} tone="text-accent-text" title="Coming up" rows={coming.slice(0, 5)} count={coming.length} onOpen={onOpen} detail={(b) => `${fmtShort(b.check_in)}${b.check_in_time ? `, ${atTime(b.check_in_time)}` : ''}`} />
      <Section title="On hold" rows={holdRows.slice(0, 4)} count={holdRows.length} onOpen={onOpen} detail={(b) => `${fmtShort(b.check_in)} to ${fmtShort(b.check_out)}`} />

      <div className="space-y-3 border-t border-line pt-4">
        <h3 className="t-group">{isToday ? 'Today' : fmtShort(d)}</h3>
        {quiet && ready && <p className="t-footnote">Nobody arriving, leaving or staying.</p>}
        <Section icon={SignIn} tone="text-accent-text" title="Arriving" rows={arriving} onOpen={onOpen} detail={(b) => atTime(b.check_in_time)} />
        <Section icon={SignOut} tone="text-danger" title="Leaving" rows={leaving} onOpen={onOpen} detail={(b) => atTime(b.check_out_time)} />
        <Section icon={Bed} tone="text-muted" title="Staying" rows={staying} onOpen={onOpen} />
      </div>
    </aside>
  );
}
