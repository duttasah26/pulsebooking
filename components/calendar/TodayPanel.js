import { Bed, SignIn, SignOut, X } from '@phosphor-icons/react';
import { roomShade } from '../../lib/colors';
import { fmtShort, today } from '../../lib/dates';
import { useSettings } from '../SettingsProvider';
import { formatTime } from '../TimeSelect';

// The Today panel, which lies over the calendar's right edge (like the booking panel, so the calendar never changes size): who arrives,
// who leaves and who is staying on one day (today, or the day clicked on the calendar). A booking in several rooms is one row with its rooms. A row opens the booking.
// Counted from the bookings already loaded (cancelled ones left out); a stay that checks in and out the same day counts only once.
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

function Section({ icon: Icon, tone, title, rows, onOpen, time }) {
  const { settings } = useSettings();
  if (!rows.length) return null;
  return (
    <section aria-label={title} className="space-y-1">
      <h3 className="t-group flex items-center gap-2">
        <Icon size={18} aria-hidden="true" className={tone} />
        {title} <span className="font-mono text-ink">{rows.length}</span>
      </h3>
      <ul className="-mx-2">
        {rows.map((r) => {
          const t = time?.(r.first);
          return (
            <li key={r.key}>
              <button type="button" onClick={() => onOpen(r.first)} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors duration-150 hover:bg-surface-2 lg:py-1.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold">{r.first.name || 'On hold'}</span>
                  {(t || r.first.status === 'on_hold') && (
                    <span className="block text-[0.9375rem] text-muted">{r.first.status === 'on_hold' ? 'On hold' : ''}{r.first.status === 'on_hold' && t ? ', ' : ''}{t ? formatTime(t) : ''}</span>
                  )}
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

export default function TodayPanel({ bookings, day, onOpen, onClose }) {
  const d = day ?? today();
  const isToday = d === today();
  const live = bookings.filter((b) => b.status !== 'cancelled');
  const arriving = groupRows(live.filter((b) => b.check_in === d));
  const leaving = groupRows(live.filter((b) => b.check_out === d));
  const staying = groupRows(live.filter((b) => b.check_in < d && b.check_out > d));
  const quiet = !arriving.length && !leaving.length && !staying.length;
  return (
    <aside aria-label={isToday ? 'Today' : fmtShort(d)} className="no-scrollbar h-full animate-dock-in space-y-4 overflow-y-auto overscroll-contain rounded-lg border border-line bg-surface p-4 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <h2 className="t-title min-w-0 truncate">{isToday ? 'Today' : fmtShort(d)}</h2>
        <button type="button" className="btn btn-icon shrink-0" aria-label="Hide today" title="Hide today" onClick={onClose}>
          <X size={20} weight="bold" aria-hidden="true" />
        </button>
      </div>
      {quiet && <p className="t-footnote">Nobody arriving, leaving or staying.</p>}
      <Section icon={SignIn} tone="text-accent-text" title="Arriving" rows={arriving} onOpen={onOpen} time={(b) => b.check_in_time} />
      <Section icon={SignOut} tone="text-danger" title="Leaving" rows={leaving} onOpen={onOpen} time={(b) => b.check_out_time} />
      <Section icon={Bed} tone="text-muted" title="Staying" rows={staying} onOpen={onOpen} />
    </aside>
  );
}
