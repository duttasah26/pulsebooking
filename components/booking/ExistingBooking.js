import BookingForm from './BookingForm';
import BookingDetails from './BookingDetails';

// An existing booking, or a hold: plain details until the pencil is used, then the form.
//   onDone:       the form finished saving (go back to the details)
//   onCancelEdit: leave the form without saving
//   onClose:      the booking was deleted (close the panel or sheet)
export default function ExistingBooking({ editing, onCancelEdit, onDone, onClose, booking, group, rooms, isBusy, onSaved, onRemove, onConfirm, onPutOnHold, groupCount, onShowGroup, pending, onSavePending, onCancelPending }) {
  if (editing) {
    return (
      <BookingForm
        mode="edit"
        booking={booking}
        group={group}
        rooms={rooms}
        isBusy={isBusy}
        onSaved={onSaved}
        onDone={onDone}
        onRemoved={onClose}
        onCancel={onCancelEdit}
        onRemove={onRemove}
      />
    );
  }
  return <BookingDetails booking={booking} group={group} onSaved={onSaved} onDone={onDone} onRemoved={onClose} onRemove={onRemove} onConfirm={onConfirm} onPutOnHold={onPutOnHold} groupCount={groupCount} onShowGroup={onShowGroup} rooms={rooms} pending={pending} onSavePending={onSavePending} onCancelPending={onCancelPending} />;
}
