import { Check, Clock, FloppyDisk, X } from '@phosphor-icons/react';

// The buttons pinned to the bottom of the form. One filled green button says what happens next; leaving is a quiet word.
// Deleting is done from the details (hold the button there), not from the form.
export default function FormFooter({ f, onCancel }) {
  const { edit, busy, unconfirmed, roomIds, isHoldEdit } = f;
  const saving = busy || unconfirmed;
  return (
    <div className="sticky bottom-0 -mx-4 mt-auto flex gap-2 border-t border-line bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:pb-3">
      {onCancel && (
        <button type="button" className="btn btn-quiet" onClick={onCancel} disabled={busy}>
          <X size={18} aria-hidden="true" /> Cancel
        </button>
      )}
      {/* A hold has two clear endings: keep holding it, or turn it into a real booking. */}
      {isHoldEdit && (
        <button type="button" className="btn" onClick={() => f.submit(true)} disabled={saving}>
          <Clock size={18} aria-hidden="true" /> Keep On Hold
        </button>
      )}
      <button
        type={isHoldEdit ? 'button' : 'submit'}
        onClick={isHoldEdit ? () => f.submit(false, 'confirmed') : undefined}
        className="btn btn-primary flex-1"
        disabled={saving}
      >
        {saving ? 'Saving…' : isHoldEdit ? <><Check size={18} weight="bold" aria-hidden="true" /> Confirm Booking</> : edit ? <><FloppyDisk size={18} aria-hidden="true" /> Save Changes</> : <><Check size={18} weight="bold" aria-hidden="true" /> {roomIds.length > 1 ? `Confirm ${roomIds.length} Rooms` : 'Confirm Booking'}</>}
      </button>
    </div>
  );
}
