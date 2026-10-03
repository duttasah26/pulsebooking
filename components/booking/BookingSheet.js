import { useState } from 'react';
import Sheet from '../Sheet';
import BookingForm from './BookingForm';
import ExistingBooking from './ExistingBooking';
import EditButton from './EditButton';

// The booking in a pop-up: a bottom sheet on phones, and on the Bookings and Guests tabs.
//   mode="create": the form, to enter a new booking.
//   mode="edit":   an existing booking as details, with a pencil that switches to the form.
// The caller may control the pencil state (editing / onEditingChange); otherwise it is kept here.
export default function BookingSheet({ onClose, editing: editingProp, onEditingChange, ...props }) {
  const existing = props.mode === 'edit';
  const [localEditing, setLocalEditing] = useState(false);
  const editing = editingProp ?? localEditing;
  const setEditing = onEditingChange ?? setLocalEditing;

  return (
    <Sheet
      title={existing ? props.booking.name : 'New Booking'}
      onClose={onClose}
      actions={existing && !editing ? <EditButton onClick={() => setEditing(true)} disabled={props.booking.id < 0} /> : null}
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
        />
      ) : (
        <BookingForm {...props} onDone={onClose} onCancel={onClose} />
      )}
    </Sheet>
  );
}
