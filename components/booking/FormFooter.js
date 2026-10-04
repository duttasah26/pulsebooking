import { Check, Clock, FloppyDisk, Plus, X } from '@phosphor-icons/react';

// The buttons pinned to the bottom of the form: Cancel, Hold (create) and the main action. Deleting is done from the
// details (hold the button there), not from the form.
export default function FormFooter({ f, onCancel }) {
  const { edit, busy, unconfirmed, roomIds, isHoldEdit } = f;
  const saving = busy || unconfirmed;
  return (
    <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-line bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:pb-2 lg:pt-2">
      {onCancel && (
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          <X size={16} aria-hidden="true" /> Cancel
        </button>
      )}
      {!edit && (
        <button type="button" className="btn" onClick={() => f.submit(true)} disabled={busy}>
          <Clock size={18} aria-hidden="true" /> Hold
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
        {saving ? (
          'Saving…'
        ) : isHoldEdit ? (
          <><Check size={18} weight="bold" aria-hidden="true" /> Confirm Booking</>
        ) : edit ? (
          <><FloppyDisk size={18} aria-hidden="true" /> Save Changes</>
        ) : (
          <><Plus size={18} aria-hidden="true" /> {roomIds.length > 1 ? `Book ${roomIds.length} Rooms` : 'Create Booking'}</>
        )}
      </button>
    </div>
  );
}
