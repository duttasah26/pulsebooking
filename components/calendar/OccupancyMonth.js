import { useMemo } from 'react';
import { addDays, dayOfMonth, daysInMonth, diffDays, monthStart, range, today, weekdayIndex } from '../../lib/dates';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Classic month calendar. Each day shows how many rooms are occupied that night. Tap a day to open it.
export default function OccupancyMonth({ date, rooms, bookings, onPickDay }) {
  const first = monthStart(date);
  const days = range(first, daysInMonth(first));
  const todayStr = today();

  const occupied = useMemo(() => {
    const counts = days.map(() => new Set());
    for (const b of bookings) {
      if (b.status === 'cancelled') continue;
      const from = Math.max(0, diffDays(first, b.check_in));
      const to = Math.min(days.length, diffDays(first, b.check_out));
      for (let i = from; i < to; i++) counts[i].add(b.room_id);
    }
    return counts.map((s) => s.size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, first]);

  const lead = weekdayIndex(first);

  return (
    <div className="rounded-lg border border-line bg-surface p-2 sm:p-3">
      <div className="grid grid-cols-7 gap-1 pb-1 text-center text-xs font-medium text-muted">
        {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => <span key={`pad-${i}`} />)}
        {days.map((d, i) => {
          const ratio = rooms.length ? occupied[i] / rooms.length : 0;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onPickDay(d)}
              aria-label={`${d}, ${occupied[i]} of ${rooms.length} rooms occupied`}
              className={`cell flex min-h-16 flex-col items-start justify-between rounded-lg border p-1.5 text-left sm:min-h-20 sm:p-2 ${
                d === todayStr ? 'border-accent' : 'border-line'
              }`}
              style={{ backgroundColor: `color-mix(in srgb, var(--accent) ${Math.round(ratio * 38)}%, var(--surface))` }}
            >
              <span className={`font-mono text-sm ${d === todayStr ? 'font-semibold text-accent' : ''}`}>{dayOfMonth(d)}</span>
              <span className="font-mono text-xs text-muted">{occupied[i]}/{rooms.length}</span>
            </button>
          );
        })}
      </div>
      <p className="px-1 pt-3 text-sm text-muted">Rooms occupied each night. A darker day is a fuller day.</p>
    </div>
  );
}
