import { ArrowRight, Check, WarningCircle, X } from '@phosphor-icons/react';
import { fmtDayMonth, nightsLabel, diffDays } from '../../lib/dates';

// A change made with the pencil that is not saved yet, shown at the top of the booking details (or the selection), where
// Save and Cancel live. items: [{ original, checkIn, checkOut, roomId }].
// One end of a stay: check-in (green) or check-out (red), as on the Day tab. A changed end is drawn old over new, with a
// coloured edge; an unchanged end is plain and says so.
function End({ label, tone, was, now }) {
  const changed = was !== now;
  const t = tone === 'in' ? { box: 'border-accent bg-accent-soft', ink: 'text-accent-text' } : { box: 'border-danger bg-danger/10', ink: 'text-danger' };
  return (
    <div className={`min-w-0 rounded-lg px-2.5 py-2 ${changed ? `border-2 ${t.box}` : 'border border-line bg-surface'}`}>
      <p className={`text-sm font-semibold ${changed ? t.ink : 'text-muted'}`}>{label}</p>
      {changed ? (
        <>
          <p className="flex items-center gap-1.5 text-sm text-muted line-through decoration-1">{fmtDayMonth(was)}</p>
          <p className="flex items-center gap-1.5">
            <ArrowRight size={16} weight="bold" aria-hidden="true" className={`shrink-0 ${t.ink}`} />
            <span className={`font-mono text-base font-bold ${t.ink}`}>{fmtDayMonth(now)}</span>
          </p>
        </>
      ) : (
        <>
          <p className="font-mono text-base font-semibold">{fmtDayMonth(now)}</p>
          <p className="text-sm text-muted">No change</p>
        </>
      )}
    </div>
  );
}

// One booking's change, old to new: who and which room, the two ends, and what it does to the length of the stay.
function Change({ item: i, rooms, showName }) {
  const was = i.original;
  const nowRoom = rooms.find((r) => r.id === i.roomId)?.number ?? was.room_number;
  const roomChanged = String(nowRoom) !== String(was.room_number);
  const wasNights = diffDays(was.check_in, was.check_out);
  const nowNights = diffDays(i.checkIn, i.checkOut);
  const delta = nowNights - wasNights;
  return (
    <li className="space-y-2">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {showName && <span className="min-w-0 break-words font-semibold">{was.name}</span>}
        {roomChanged ? (
          <span className="flex items-center gap-1">
            <span className="rounded bg-surface-2 px-1.5 font-mono text-muted line-through">Room {was.room_number}</span>
            <ArrowRight size={14} weight="bold" aria-hidden="true" />
            <span className="rounded bg-amber-200 px-1.5 font-mono font-bold">Room {nowRoom}</span>
          </span>
        ) : (
          <span className="rounded bg-surface-2 px-1.5 font-mono font-semibold">Room {nowRoom}</span>
        )}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <End label="Check in" tone="in" was={was.check_in} now={i.checkIn} />
        <End label="Check out" tone="out" was={was.check_out} now={i.checkOut} />
      </div>
      <p className="flex flex-wrap items-center gap-x-2 text-sm">
        <span className="text-muted">Stay</span>
        {delta !== 0 && <span className="text-muted line-through decoration-1">{nightsLabel(wasNights)}</span>}
        {delta !== 0 && <ArrowRight size={14} weight="bold" aria-hidden="true" />}
        <span className="font-semibold">{nightsLabel(nowNights)}</span>
        {delta !== 0 && (
          <span className={`rounded px-1.5 font-mono font-bold ${delta > 0 ? 'bg-accent-soft text-accent-text' : 'bg-danger/15 text-danger'}`}>{delta > 0 ? '+' : ''}{delta}</span>
        )}
      </p>
    </li>
  );
}

export default function PendingBanner({ items, rooms, onSave, onCancel }) {
  const several = items.length > 1;
  return (
    <div role="group" aria-label="Unsaved change" className="space-y-2 rounded-lg border-2 border-amber-400 bg-amber-50 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <WarningCircle size={18} weight="fill" aria-hidden="true" className="shrink-0 text-amber-500" /> Unsaved change
      </p>
      <ul className="space-y-3">
        {items.map((i) => <Change key={i.original.id} item={i} rooms={rooms} showName={several} />)}
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
