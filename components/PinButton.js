import { PushPin } from '@phosphor-icons/react';
import { useToast } from './Toast';
import { MAX_PINS, usePinned } from '../lib/pinned';

// Pins a booking (to the side of the calendar and the top of the Bookings list), or lets it go. Sits beside Edit in a booking's details.
// Switched on, it is the solid "on" button with a filled pin.
export default function PinButton({ booking }) {
  const id = booking.id;
  const toast = useToast();
  const { isPinned, toggle } = usePinned();
  const on = isPinned(id);
  const label = on ? 'Unpin this booking' : 'Pin this booking to the side of the calendar and the top of the list';
  return (
    <button
      type="button"
      className={`btn btn-icon ${on ? 'btn-on' : ''}`}
      aria-pressed={on}
      aria-label={label}
      title={label}
      disabled={!(id > 0)}
      onClick={() => {
        if (toggle(booking) === 'full') toast({ message: `You can pin up to ${MAX_PINS} bookings. Unpin one first`, important: true });
      }}
    >
      <PushPin size={20} weight={on ? 'fill' : 'bold'} aria-hidden="true" />
    </button>
  );
}
