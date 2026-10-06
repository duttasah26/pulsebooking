import { useSettings } from '../../SettingsProvider';
import { roomShade } from '../../../lib/colors';
import { dayOfMonth, fmtDayMonth, fmtMonthShort, fmtWeekday, isWeekend } from '../../../lib/dates';
import { todayCached } from './gridLayout';

// Day headers and room numbers are one tab stop each; the arrow keys (and Home and End) move along them, as in a toolbar.
function arrowNav(group, prev, next) {
  return (e) => {
    const k = e.key;
    if (k !== prev && k !== next && k !== 'Home' && k !== 'End') return;
    const list = [...document.querySelectorAll(`[data-hdr="${group}"]`)];
    const at = list.indexOf(e.currentTarget);
    const to = k === 'Home' ? 0 : k === 'End' ? list.length - 1 : k === next ? at + 1 : at - 1;
    const el = list[Math.max(0, Math.min(list.length - 1, to))];
    if (!el) return;
    e.preventDefault();
    el.focus();
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
}

const tint = (d) => (d === todayCached() ? 'bg-accent-soft' : isWeekend(d) ? 'bg-surface-2' : 'bg-surface');
const todayTone = (isToday) => (isToday ? 'font-semibold text-accent-text' : 'text-muted');

// The empty top-left square. It stays put while the grid scrolls in both directions.
export function GridCorner() {
  return <div className="sticky left-0 top-0 z-[3] border-b border-r border-line bg-surface" style={{ gridRow: 1, gridColumn: 1 }} />;
}

// Column header in the timeline: weekday (or month name) over the day number.
export function DayHeader({ d, i, isToday, spot = false, onPick, narrow = false }) {
  const Tag = onPick ? 'button' : 'div';
  return (
    <Tag
      type={onPick ? 'button' : undefined}
      onClick={onPick}
      title={onPick ? 'Highlight this day' : undefined}
      data-hdr={onPick ? 'day' : undefined}
      tabIndex={onPick ? (i === 0 ? 0 : -1) : undefined}
      onKeyDown={onPick ? arrowNav('day', 'ArrowLeft', 'ArrowRight') : undefined}
      className={`${onPick ? 'cursor-pointer hover:brightness-95 ' : ''}sticky top-0 z-[2] flex flex-col items-center justify-center border-b border-grid-line text-sm ${spot ? 'bg-accent-soft font-semibold text-accent-text' : `${tint(d)} ${todayTone(isToday)}`}`}
      style={{ gridRow: 1, gridColumn: i + 2 }}
    >
      <span className={narrow ? 'text-xs' : undefined}>{i === 0 || dayOfMonth(d) === 1 ? fmtMonthShort(d) : narrow ? fmtWeekday(d).slice(0, 2) : fmtWeekday(d)}</span>
      <span className="font-mono text-base font-medium text-ink">{dayOfMonth(d)}</span>
    </Tag>
  );
}

// Row label in the month sheet, on one line: "Thu 1 Oct".
export function DayLabel({ d, i, isToday, spot = false, onPick }) {
  const Tag = onPick ? 'button' : 'div';
  return (
    <Tag
      type={onPick ? 'button' : undefined}
      onClick={onPick}
      title={onPick ? 'Highlight this day' : undefined}
      data-hdr={onPick ? 'day' : undefined}
      tabIndex={onPick ? (i === 0 ? 0 : -1) : undefined}
      onKeyDown={onPick ? arrowNav('day', 'ArrowUp', 'ArrowDown') : undefined}
      className={`${onPick ? 'cursor-pointer text-left hover:brightness-95 ' : ''}sticky left-0 z-[2] flex items-center gap-1.5 border-r border-t border-grid-line px-2 text-sm ${spot ? 'bg-accent-soft font-semibold text-accent-text' : `${tint(d)} ${todayTone(isToday)}`}`}
      style={{ gridRow: i + 2, gridColumn: 1 }}
    >
      <span className="w-9 shrink-0">{fmtWeekday(d)}</span>
      <span className="whitespace-nowrap font-mono text-sm font-medium text-ink">{fmtDayMonth(d)}</span>
    </Tag>
  );
}

// Room header (month sheet) or room label (timeline): a box in its floor's colour (set in Settings). While a hold is
// open it is also a button that puts the room on the hold or takes it off: that is how rooms that are not next to each
// other are picked; a room on the hold shows a dark outline.
export function RoomHead({ room, r, rows, active, onToggle, onPick, spot = false, compact = false }) {
  const { settings } = useSettings();
  const tone = roomShade(room, settings);
  const cls = rows
    ? `sticky left-0 z-[2] flex items-center gap-2 border-r border-t px-3 font-mono ${compact ? 'text-sm' : 'text-base'} font-medium`
    : 'sticky top-0 z-[2] flex items-center justify-center gap-1.5 border-b border-l font-mono text-base font-medium';
  const style = {
    ...(rows ? { gridRow: r + 2, gridColumn: 1 } : { gridRow: 1, gridColumn: r + 2 }),
    backgroundColor: tone.fill,
    borderColor: tone.edge,
    ...(active ? { boxShadow: 'inset 0 0 0 2px var(--ink)' } : {}),
    ...(spot ? { filter: 'brightness(0.9) saturate(1.2)' } : {}), // the clicked cell's room, a touch deeper: a highlight, not a border
  };
  if (!onToggle && onPick) {
    return (
      <button type="button" title={`Highlight Room ${room.number}`} onClick={onPick} data-hdr="room" tabIndex={r === 0 ? 0 : -1} onKeyDown={rows ? arrowNav('room', 'ArrowUp', 'ArrowDown') : arrowNav('room', 'ArrowLeft', 'ArrowRight')} className={`${cls} cursor-pointer hover:brightness-95`} style={style}>
        {room.number}
      </button>
    );
  }
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
