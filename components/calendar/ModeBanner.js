import { CheckSquare, Hand, PencilSimpleLine, Plus, X, Keyboard } from '@phosphor-icons/react';

// What the pointer does right now, said once, large, under the calendar, with a way out. Open (the plain mode) shows
// nothing. On Hold, Select and Hand change what a tap or drag does, so they announce themselves and Done returns to Open.
// New Booking uses the same banner while it waits for the stay to be drawn on the calendar.
// Each mode's box is the same colour as its tool button when it is on (see ToolButton): New green, On Hold amber,
// Select violet, Hand sky. Keep the two in step.
const MODES = {
  draw: {
    icon: Plus,
    name: 'New Booking',
    box: 'border-accent bg-accent-soft',
    iconTone: 'text-accent-text',
    touch: 'Tap the first night, then the last night',
    mouse: 'Drag across the nights. Click more room numbers to add rooms. The form fills in. You can also type them in the form',
  },
  reserve: {
    icon: PencilSimpleLine,
    name: 'On Hold',
    box: 'border-amber-400 bg-amber-100',
    iconTone: 'text-amber-600',
    touch: 'Tap the first night, then the last night',
    mouse: 'Drag across free nights, or drag a hold to change it',
  },
  select: {
    icon: CheckSquare,
    name: 'Select',
    box: 'border-violet-400 bg-violet-100',
    iconTone: 'text-violet-600',
    touch: 'Tap each booking to pick it, then drag its white tabs to change the days',
    mouse: 'Click bookings to pick them. Drag a picked booking to move it, or its white tabs to change the days',
  },
  hand: {
    icon: Hand,
    name: 'Hand',
    box: 'border-sky-400 bg-sky-100',
    iconTone: 'text-sky-600',
    touch: 'Drag the calendar to move around',
    mouse: 'Drag the calendar to move around',
  },
};

export default function ModeBanner({ mode, touch, onExit, onSkip, still = false }) {
  const m = MODES[mode];
  const Icon = m.icon;
  return (
    <div role="status" data-below-grid className={`${still ? '' : 'animate-fade '}flex h-14 items-center gap-3 overflow-hidden rounded-lg border-2 px-3 ${m.box}`}>
      <Icon size={22} weight="fill" aria-hidden="true" className={`shrink-0 ${m.iconTone}`} />
      <p className="line-clamp-2 min-w-0 flex-1 text-sm leading-snug sm:text-base">
        <strong className="font-semibold">{m.name} mode.</strong> {touch ? m.touch : m.mouse}
      </p>
      {onSkip && (
        <button type="button" className="btn shrink-0 px-3" onClick={onSkip}><Keyboard size={18} aria-hidden="true" /> Type dates<span className="max-sm:hidden"> instead</span></button>
      )}
      <button type="button" className="btn shrink-0 gap-1.5 px-3" onClick={onExit}>
        <X size={18} aria-hidden="true" /> {mode === 'draw' ? 'Cancel' : 'Done'}
      </button>
    </div>
  );
}
