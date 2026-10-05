// A preview of a booking that is still being filled in: a see-through bar with a dashed outline in the colour it will
// have. It never takes clicks (so the real calendar underneath keeps working), except its X, which throws the draft away:
// the booking is not made until it is confirmed.
import { X } from '@phosphor-icons/react';

export default function GhostBar({ g, rows, style: placement, tone, name, onRemove }) {
  return (
    <div
      aria-hidden={onRemove ? undefined : 'true'}
      className={`animate-bar-in @container pointer-events-none relative z-[1] flex min-w-0 items-center overflow-hidden rounded-lg border-2 border-dashed px-2 text-xs font-medium text-ink ${
        g.cutStart ? (rows ? 'rounded-l-none border-l-0' : 'rounded-t-none border-t-0') : ''
      } ${g.cutEnd ? (rows ? 'rounded-r-none border-r-0' : 'rounded-b-none border-b-0') : ''}`}
      style={{
        ...placement,
        ...g.margin,
        backgroundColor: `color-mix(in srgb, ${tone.border} ${tone.fillPct ?? 18}%, transparent)`,
        borderColor: tone.border,
      }}
    >
      <span className={`min-w-0 truncate opacity-70 ${rows ? '' : '[writing-mode:vertical-rl] @min-[84px]:[writing-mode:horizontal-tb]'}`}>{name || 'New Booking'}</span>
      {onRemove && (
        <button
          type="button"
          aria-label="Remove this new booking (it is not saved yet)"
          title="Remove this new booking. It is not saved yet"
          onClick={onRemove}
          className="pointer-events-auto relative ml-auto grid size-6 shrink-0 place-items-center rounded-lg bg-transparent before:absolute before:-inset-x-2 before:-inset-y-1 before:content-[''] hover:bg-black/10 active:scale-90 [@media(pointer:coarse)]:before:-inset-x-3"
        >
          <X size={14} weight="bold" />
        </button>
      )}
    </div>
  );
}
