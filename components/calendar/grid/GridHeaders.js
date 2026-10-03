import { useSettings } from '../../SettingsProvider';
import { roomShade } from '../../../lib/colors';
import { dayOfMonth, fmtDayMonth, fmtMonthShort, fmtWeekday, isWeekend } from '../../../lib/dates';

const tint = (d) => (isWeekend(d) ? 'bg-surface-2' : 'bg-surface');
const todayTone = (isToday) => (isToday ? 'font-semibold text-accent-text' : 'text-muted');

// The empty top-left square. It stays put while the grid scrolls in both directions.
export function GridCorner() {
  return <div className="sticky left-0 top-0 z-[3] border-b border-r border-line bg-surface" style={{ gridRow: 1, gridColumn: 1 }} />;
}

// Column header in the timeline: weekday (or month name) over the day number.
export function DayHeader({ d, i, isToday }) {
  return (
    <div
      className={`sticky top-0 z-[2] flex flex-col items-center justify-center border-b border-line text-xs ${tint(d)} ${todayTone(isToday)}`}
      style={{ gridRow: 1, gridColumn: i + 2 }}
    >
      <span>{i === 0 || dayOfMonth(d) === 1 ? fmtMonthShort(d) : fmtWeekday(d)}</span>
      <span className="font-mono text-sm text-ink">{dayOfMonth(d)}</span>
    </div>
  );
}

// Row label in the month sheet, on one line: "Thu 1 Oct".
export function DayLabel({ d, i, isToday }) {
  return (
    <div
      className={`sticky left-0 z-[2] flex items-center gap-1.5 border-r border-t border-line px-2 text-xs ${tint(d)} ${todayTone(isToday)}`}
      style={{ gridRow: i + 2, gridColumn: 1 }}
    >
      <span className="w-7 shrink-0">{fmtWeekday(d)}</span>
      <span className="whitespace-nowrap font-mono text-xs text-ink">{fmtDayMonth(d)}</span>
    </div>
  );
}

// Room header (month sheet) or room label (timeline): a box in its floor's colour (set in Settings). While a hold is
// open it is also a button that puts the room on the hold or takes it off: that is how rooms that are not next to each
// other are picked; a room on the hold shows a dark outline.
export function RoomHead({ room, r, rows, active, onToggle }) {
  const { settings } = useSettings();
  const tone = roomShade(room, settings);
  const cls = rows
    ? 'sticky left-0 z-[2] flex items-center gap-2 border-r border-t px-3 font-mono text-xs font-semibold'
    : 'sticky top-0 z-[2] flex items-center justify-center gap-1.5 border-b border-l font-mono text-xs font-semibold';
  const style = {
    ...(rows ? { gridRow: r + 2, gridColumn: 1 } : { gridRow: 1, gridColumn: r + 2 }),
    backgroundColor: tone.fill,
    borderColor: tone.edge,
    ...(active ? { boxShadow: 'inset 0 0 0 2px var(--ink)' } : {}),
  };
  if (!onToggle) return <div className={cls} style={style}>{room.number}</div>;
  return (
    <button
      type="button"
      aria-pressed={active}
      title={active ? `Take Room ${room.number} off this hold` : `Hold Room ${room.number} too`}
      onClick={() => onToggle(room.id)}
      className={`${cls} cursor-pointer hover:brightness-95`}
      style={style}
    >
      {room.number}
    </button>
  );
}
