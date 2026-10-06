import { fmtShort, isWeekend } from '../../../lib/dates';
import { todayCached } from './gridLayout';
import { useSettings } from '../../SettingsProvider';
import { statusColor } from '../../../lib/colors';

// One room on one night. A free night is a button you can press or drag from; a taken night is just background
// (the booking bar is drawn over it). `chip` is the little size label on the corner of a selection.
export default function GridCell({ room, d, r, i, free, selected, draw, chip, style, onPointerDown, onClick, onBlank, spot }) {
  const { settings } = useSettings();
  // Today's column is washed in the accent so the eye finds "now" at once; weekends are the quiet grey.
  const tint = d === todayCached() ? 'bg-accent-soft/40' : isWeekend(d) ? 'bg-surface-2' : 'bg-surface';
  // Not a cell you can hold or draw on right now (Open, Select or Hand): a click on it is a click on empty calendar, which clears
  // whatever is open, picked or waiting for Save (onBlank). The last one clicked (spot) is marked like a selected cell in a
  // spreadsheet, by a light green fill alone (no border).
  if (!free) return <div aria-hidden="true" className={`border-l border-t border-grid-line ${spot ? 'bg-accent-soft' : tint}`} style={style} onClick={onBlank ? () => onBlank({ roomId: room.id, d }) : undefined} />;
  // Reserving looks like the hold it will become (yellow, dashed). Drawing a New Booking is green: it is a booking, not a hold.
  // Worked out only for a cell you can press: a booked or blocked night (most of the grid) never needs it.
  const hold = draw ? { bg: 'var(--accent-soft)', border: 'var(--accent)' } : statusColor('on_hold', settings);
  return (
    <button
      type="button"
      role="gridcell"
      data-cell
      data-r={r} // row and day position: the drag finds the cell under the pointer with these
      data-i={i}
      aria-label={`Room ${room.number}, ${fmtShort(d)}, free`}
      aria-pressed={selected || undefined}
      className={`cell relative flex touch-manipulation items-center justify-center border-l border-t border-grid-line transition-colors ${
        selected ? 'animate-pop outline-dashed outline-2 -outline-offset-2' : `${tint} hover:bg-accent-soft/60`
      }`}
      style={selected ? { ...style, backgroundColor: hold.bg, outlineColor: hold.border } : style}
      onPointerDown={onPointerDown}
      onMouseDown={(e) => e.preventDefault()} // no focus on press, so the browser never scrolls the grid to the cell
      onClick={onClick}
    >
      {chip && (
        <span className="pointer-events-none rounded-lg bg-ink px-1.5 py-0.5 font-mono text-sm font-semibold text-canvas">
          {chip}
        </span>
      )}
    </button>
  );
}
