import { Check, WarningCircle, X } from '@phosphor-icons/react';
import { fmtDayMonth, nightsLabel, diffDays } from '../../lib/dates';

// A change made with the pencil that is not saved yet, shown at the top of the booking details (or the selection), where
// Save and Cancel live. items: [{ original, checkIn, checkOut, roomId }].
export default function PendingBanner({ items, rooms, onSave, onCancel }) {
  const several = items.length > 1;
  return (
    <div role="group" aria-label="Unsaved change" className="space-y-2 rounded-lg border-2 border-amber-400 bg-amber-50 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <WarningCircle size={18} weight="fill" aria-hidden="true" className="shrink-0 text-amber-500" /> Unsaved change
      </p>
      <ul className="space-y-0.5 text-sm">
        {items.map((i) => (
          <li key={i.original.id}>
            {several && <span className="font-medium">{i.original.name}, </span>}
            Room {rooms.find((r) => r.id === i.roomId)?.number ?? i.original.room_number}:{' '}
            <strong className="font-semibold">{fmtDayMonth(i.checkIn)} to {fmtDayMonth(i.checkOut)}</strong>
            <span className="text-muted">, {nightsLabel(diffDays(i.checkIn, i.checkOut))}</span>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <button type="button" className="btn flex-1" onClick={onCancel}>
          <X size={16} aria-hidden="true" /> Cancel
        </button>
        <button type="button" className="btn btn-primary flex-1" onClick={onSave}>
          <Check size={16} weight="bold" aria-hidden="true" /> Save
        </button>
      </div>
    </div>
  );
}
