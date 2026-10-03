import { Plus } from '@phosphor-icons/react';
import Dock from '../Dock';
import BookingForm from '../booking/BookingForm';
import BookingSheet from '../booking/BookingSheet';
import ExistingBooking from '../booking/ExistingBooking';
import EditButton from '../booking/EditButton';

/*
  The booking panel of the calendar.
    wide screens:  a dock on the right that folds away. It shows the blank form for a new booking, or the open booking
                   (details with a pencil, or the form while editing, or straight to the form for a hold just placed).
    narrow screens: the open booking opens as a bottom sheet.
  panel = { booking, key?, editing } or null. setPanel changes it.
*/
export default function BookingPanel({
  wide, formOpen, onToggle, panel, setPanel, panelBooking, group, rooms, isBusy, blank, onSaved, onRemove, closePanel,
}) {
  const setEditing = (editing) => setPanel((p) => (p ? { ...p, editing } : p));
  const title = panel ? panelBooking.name : 'New Booking';

  if (!wide) {
    if (!panel) return null;
    return (
      <BookingSheet
        key={`open-${panel.key ?? panel.booking.id}`}
        mode="edit"
        booking={panelBooking}
        group={group}
        rooms={rooms}
        isBusy={isBusy}
        editing={panel.editing}
        onEditingChange={setEditing}
        onClose={closePanel}
        onSaved={onSaved}
        onRemove={onRemove}
      />
    );
  }

  if (!panel && !blank) return null;
  const actions = (
    <>
      {panel && !panel.editing && <EditButton onClick={() => setEditing(true)} disabled={panelBooking.id < 0} />}
      {panel && (
        <button type="button" className="btn" onClick={closePanel}>
          <Plus size={18} aria-hidden="true" /> New
        </button>
      )}
    </>
  );

  return (
    <Dock
      open={formOpen}
      onToggle={onToggle}
      label="Booking form"
      title={title}
      actions={actions}
      tab={panel ? (panelBooking.status === 'on_hold' ? 'Hold open' : panelBooking.name) : 'New Booking'}
      tabMark={Boolean(panel)}
    >
      {panel ? (
        <ExistingBooking
          key={`open-${panel.key ?? panel.booking.id}`}
          editing={panel.editing}
          onCancelEdit={() => setEditing(false)}
          onDone={() => setEditing(false)}
          onClose={closePanel}
          booking={panelBooking}
          group={group}
          rooms={rooms}
          isBusy={isBusy}
          onSaved={onSaved}
          onRemove={onRemove}
        />
      ) : (
        <BookingForm key="blank" {...blank} rooms={rooms} isBusy={isBusy} onSaved={onSaved} onDone={() => {}} />
      )}
    </Dock>
  );
}
