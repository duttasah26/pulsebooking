import { useState } from 'react';
import Sheet from '../Sheet';
import { useLeave } from '../useLeave';
import BookingForm from './BookingForm';
import ExistingBooking from './ExistingBooking';
import EditButton from './EditButton';
import { ArrowUpRight } from '@phosphor-icons/react';

// The booking in a pop-up: a bottom sheet on phones, and on the Bookings and Guests tabs.
//   mode="create": the form, to enter a new booking.
//   mode="edit":   an existing booking as details, with a pencil that switches to the form.
// onShowInCalendar(booking): adds an arrow button that takes the person to the booking on the calendar.
// The caller may control the pencil state (editing / onEditingChange); otherwise it is kept here.
export default function BookingSheet({ onClose: closeNow, editing: editingProp, onEditingChange, ...props }) {
  const [leaving, onClose] = useLeave(closeNow); // every way out (X, Cancel, Done, Escape) plays the exit
  const existing = props.mode === 'edit';
  const [localEditing, setLocalEditing] = useState(false);
  const editing = editingProp ?? localEditing;
  const setEditing = onEditingChange ?? setLocalEditing;

  return (
    <Sheet
      title={existing ? props.booking.name : 'New Booking'}
      onClose={onClose}
      leaving={leaving}
      locked={!existing}
      actions={existing && !editing ? (
        <>
          {props.onShowInCalendar && (
            <button type="button" className="btn btn-icon btn-quiet" aria-label="Show in calendar" title="Show in calendar" onClick={() => props.onShowInCalendar(props.booking)}>
              <ArrowUpRight size={20} weight="bold" aria-hidden="true" />
            </button>
          )}
          <EditButton onClick={() => setEditing(true)} disabled={props.booking.id < 0} />
        </>
      ) : null}
    >
      {existing ? (
        <ExistingBooking
          editing={editing}
          onCancelEdit={() => setEditing(false)}
          onDone={() => setEditing(false)}
          onClose={onClose}
          booking={props.booking}
          group={props.group}
          rooms={props.rooms}
          isBusy={props.isBusy}
          onSaved={props.onSaved}
          onRemove={props.onRemove}
          onConfirm={props.onConfirm}
          onPutOnHold={props.onPutOnHold}
          groupCount={props.groupCount}
          onShowGroup={props.onShowGroup}
          pending={props.pending}
          onSavePending={props.onSavePending}
          onCancelPending={props.onCancelPending}
        />
      ) : (
        <BookingForm {...props} onDone={onClose} onCancel={onClose} />
      )}
    </Sheet>
  );
}
