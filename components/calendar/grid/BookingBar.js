import { CheckCircle, Clock, X } from '@phosphor-icons/react';
import { colorFor } from '../../../lib/colors';
import { fmtShort } from '../../../lib/dates';

// One booking drawn over the grid. Colour comes from the booking (or its room). A hold is hatched with a dashed border
// and carries its own remove button, so it is a group of two buttons; any other booking is a single button.
// Bars adapt to the width they get (container queries): icons appear from 70px, and in the month sheet a narrow
// bar runs the name down its tall side instead of cutting it to three letters.
export default function BookingBar({ b, g, rows, style: placement, active, onOpen, onDelete }) {
  const c = colorFor(b);
  const hold = b.status === 'on_hold';
  const times = [b.check_in_time && `in ${b.check_in_time}`, b.check_out_time && `out ${b.check_out_time}`].filter(Boolean).join(', ');
  const label = `${b.name}, Room ${b.room_number}, ${fmtShort(b.check_in)} to ${fmtShort(b.check_out)}${times ? `, ${times}` : ''}`;

  const shape = `animate-bar-in @container relative z-[1] flex min-w-0 items-center gap-1 overflow-hidden rounded-lg border text-left text-xs font-medium text-ink ${
    hold ? 'border-dashed' : ''
  } ${b.status === 'checked_out' ? 'opacity-60' : ''} ${
    g.cutStart ? (rows ? 'rounded-l-none border-l-0' : 'rounded-t-none border-t-0') : ''
  } ${g.cutEnd ? (rows ? 'rounded-r-none border-r-0' : 'rounded-b-none border-b-0') : ''}`;

  const style = {
    ...placement,
    ...g.margin,
    backgroundColor: c.bg,
    borderColor: c.border,
    boxShadow: '0 0 0 1.5px var(--surface)',
    ...(active ? { outline: '2px solid var(--ink)', outlineOffset: '1px' } : {}),
    ...(hold ? { backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 5px, rgb(255 255 255 / 0.55) 5px 7px)' } : {}),
  };

  const content = (
    <>
      {b.status === 'checked_in' && <CheckCircle size={14} weight="fill" className="hidden shrink-0 @min-[70px]:block" />}
      {hold && <Clock size={14} className="hidden shrink-0 @min-[70px]:block" />}
      <span className={`truncate ${rows ? '' : 'max-h-full min-h-0 [writing-mode:vertical-rl] @min-[84px]:[writing-mode:horizontal-tb]'}`}>
        {b.name}
      </span>
    </>
  );

  if (!hold) {
    return (
      <button
        type="button"
        onClick={() => onOpen(b)}
        title={label}
        aria-label={`${label}, ${b.status.replace('_', ' ')}`}
        className={`${shape} px-1.5 transition-transform active:scale-[0.98] @min-[70px]:px-2`}
        style={style}
      >
        {content}
      </button>
    );
  }

  return (
    <div role="group" aria-label={`${label}, on hold`} className={`${shape} pl-1.5 pr-0.5 @min-[70px]:pl-2`} style={style}>
      <button type="button" onClick={() => onOpen(b)} title={label} className="flex min-w-0 flex-1 items-center gap-1 self-stretch text-left">
        {content}
      </button>
      <button
        type="button"
        aria-label={`Remove hold, ${label}`}
        title="Remove hold"
        onClick={() => onDelete?.(b)}
        className="grid size-5 shrink-0 place-items-center rounded-lg hover:bg-white/70 active:scale-90 @min-[70px]:size-6"
      >
        <X size={14} weight="bold" />
      </button>
    </div>
  );
}
