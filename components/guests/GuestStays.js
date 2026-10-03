import { Bed, CalendarBlank, Plus } from '@phosphor-icons/react';
import StatusBadge from '../StatusBadge';
import { addDays, fmtShort, nightsLabel, today } from '../../lib/dates';

// Every stay a guest has had (deleted ones are struck through), with a button to book them again.
export default function GuestStays({ guest, rooms, onBookAgain }) {
  const stays = guest.bookings ?? [];
  const bookAgain = () => {
    const t = today();
    onBookAgain({ roomIds: [rooms[0].id], checkIn: t, checkOut: addDays(t, 1), guest });
  };

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Stays ({stays.length})</h3>
        <button type="button" className="btn" disabled={rooms.length === 0} onClick={bookAgain}>
          <Plus size={18} aria-hidden="true" /> Book Again
        </button>
      </div>
      {stays.length === 0 ? (
        <p className="text-sm text-muted">No stays yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {stays.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className={`min-w-0 ${b.deleted_at ? 'line-through' : ''}`}>
                <span className="flex items-center gap-1.5 font-medium">
                  <CalendarBlank size={14} aria-hidden="true" className="shrink-0 text-muted" />
                  {fmtShort(b.check_in)} to {fmtShort(b.check_out)}
                </span>
                <span className="flex items-center gap-1.5 text-muted">
                  <Bed size={14} aria-hidden="true" className="shrink-0" />
                  Room {b.room_number}, {nightsLabel(b.nights)}
                </span>
              </span>
              <span className="shrink-0">
                {b.deleted_at ? <StatusBadge deleted>Deleted</StatusBadge> : <StatusBadge status={b.status} />}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
