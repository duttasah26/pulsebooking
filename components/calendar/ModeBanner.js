import { CheckSquare, Clock, Hand, Plus } from '@phosphor-icons/react';

// What the pointer does right now, said once, large, under the calendar, with a way out. Open (the plain mode) shows
// nothing. On Hold, Select and Hand change what a tap or drag does, so they announce themselves and Done returns to Open.
// New Booking uses the same banner while it waits for the stay to be drawn on the calendar.
// Every mode wears the same solid ink bar, like the tool button while it is on (see ToolButton). On Hold is the one
// exception, straw yellow, because that is the colour of the hold it makes. New Booking is green for the same reason.
const MODES = {
  draw: {
    icon: Plus,
    name: 'New Booking',
    box: 'bg-accent text-accent-ink',
    iconTone: '',
    touch: 'Tap the first night, then the last night',
    mouse: 'Drag across the nights. Click more room numbers to add rooms. The form fills in. You can also type them in the form',
  },
  reserve: {
    icon: Clock,
    name: 'On Hold',
    box: 'border-2 border-dashed border-hold-edge bg-hold text-hold-ink',
    iconTone: '',
    touch: 'Tap the first night, then the last night',
    mouse: 'Tap a free night to hold it, or drag across several. Drag a hold to change it',
  },
  select: {
    icon: CheckSquare,
    name: 'Select',
    box: 'bg-ink text-white',
    iconTone: '',
    touch: 'Tap each booking to pick it, then drag its white tabs to change the days',
    mouse: 'Click bookings to pick them. Drag a picked booking to move it, or its white tabs to change the days',
  },
  hand: {
    icon: Hand,
    name: 'Hand',
    box: 'bg-ink text-white',
    iconTone: '',
    touch: 'Drag the calendar to move around',
    mouse: 'Drag the calendar to move around',
  },
};

export default function ModeBanner({ mode, touch, onExit, onSkip, still = false }) {
  const m = MODES[mode];
  const Icon = m.icon;
  return (
    <div role="status" data-below-grid className={`${still ? '' : 'animate-fade '}flex h-14 items-center gap-3 overflow-hidden rounded-lg pl-4 pr-2 ${m.box}`}>
      <Icon size={22} weight="fill" aria-hidden="true" className={`shrink-0 ${m.iconTone}`} />
      <p className="line-clamp-2 min-w-0 flex-1 text-[0.9375rem] leading-snug sm:text-base">
        <strong className="font-bold max-sm:hidden">{m.name}</strong> <span className="sm:opacity-85">{touch ? m.touch : m.mouse}</span>
      </p>
      {onSkip && (
        <button type="button" className="btn btn-inverse shrink-0 px-3" onClick={onSkip}><span>Type Dates<span className="max-sm:hidden"> Instead</span></span></button>
      )}
      <button type="button" className={`btn shrink-0 px-4 font-semibold ${mode === 'reserve' ? 'bg-hold-ink text-white hover:bg-hold-ink/90 active:bg-hold-ink' : 'bg-white text-ink hover:bg-white/90 active:bg-white/80'}`} onClick={onExit}>
        {mode === 'draw' ? 'Cancel' : 'Done'}
      </button>
    </div>
  );
}
