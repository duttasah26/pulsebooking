import { Clock, FloppyDisk, Plus, Trash, X } from '@phosphor-icons/react';

// The buttons pinned to the bottom of the form: Delete (edit), Cancel, Hold (create) and the main action.
export default function FormFooter({ f, onCancel }) {
  const { edit, busy, unconfirmed, roomIds } = f;
  const saving = busy || unconfirmed;
  return (
    <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-line bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:pb-2 lg:pt-2">
      {edit && (
        <button type="button" className="btn btn-danger btn-icon" onClick={f.remove} disabled={saving} aria-label="Delete booking">
          <Trash size={18} aria-hidden="true" />
        </button>
      )}
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
      <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
        {saving ? (
          'Saving…'
        ) : edit ? (
          <><FloppyDisk size={18} aria-hidden="true" /> Save</>
        ) : (
          <><Plus size={18} aria-hidden="true" /> {roomIds.length > 1 ? `Book ${roomIds.length} Rooms` : 'Create Booking'}</>
        )}
      </button>
    </div>
  );
}
