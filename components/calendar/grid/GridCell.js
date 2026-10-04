import { fmtShort, isWeekend } from '../../../lib/dates';
import { useSettings } from '../../SettingsProvider';
import { statusColor } from '../../../lib/colors';

// One room on one night. A free night is a button you can press or drag from; a taken night is just background
// (the booking bar is drawn over it). `chip` is the little size label on the corner of a selection.
export default function GridCell({ room, d, r, i, free, selected, draw, chip, style, onPointerDown, onClick }) {
  const { settings } = useSettings();
  // Reserving looks like the hold it will become (yellow, dashed). Drawing a New Booking is green: it is a booking, not a hold.
  const hold = draw ? { bg: 'var(--accent-soft)', border: 'var(--accent)' } : statusColor('on_hold', settings);
  const tint = isWeekend(d) ? 'bg-surface-2' : 'bg-surface';
  if (!free) return <div aria-hidden="true" className={`border-l border-t border-line ${tint}`} style={style} />;
  return (
    <button
      type="button"
      role="gridcell"
      data-cell
      data-r={r} // row and day position: the drag finds the cell under the pointer with these
      data-i={i}
      aria-label={`Room ${room.number}, ${fmtShort(d)}, free`}
      aria-pressed={selected || undefined}
      className={`cell relative flex touch-manipulation items-center justify-center border-l border-t border-line transition-colors ${
        selected ? 'animate-pop outline-dashed outline-2 -outline-offset-2' : `${tint} hover:bg-accent-soft/60`
      }`}
      style={selected ? { ...style, backgroundColor: hold.bg, outlineColor: hold.border } : style}
      onPointerDown={onPointerDown}
      onMouseDown={(e) => e.preventDefault()} // no focus on press, so the browser never scrolls the grid to the cell
      onClick={onClick}
    >
      {chip && (
        <span className="pointer-events-none rounded-lg bg-ink px-1.5 py-0.5 font-mono text-xs font-semibold text-canvas">
          {chip}
        </span>
      )}
    </button>
  );
}
