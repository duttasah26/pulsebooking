import Dock from '../Dock';
import BookingForm from '../booking/BookingForm';
import BookingSheet from '../booking/BookingSheet';
import ExistingBooking from '../booking/ExistingBooking';
import SelectionPanel from './SelectionPanel';
import Sheet from '../Sheet';
import EditButton from '../booking/EditButton';

/*
  The booking panel of the calendar.
    wide screens:  a dock on the right that folds away. It shows the blank form for a new booking, or the open booking
                   (details with a pencil, or the form while editing, or straight to the form for a hold just placed).
    narrow screens: the open booking opens as a bottom sheet.
  panel = { booking, key?, editing } or null. setPanel changes it.
  selection: the bookings picked in select mode to look at together (2 or more); it takes the place of everything else.
*/
export default function BookingPanel({
  wide, formOpen, onToggle, panel, setPanel, panelBooking, group, rooms, isBusy, blank, onSaved, onRemove, onConfirm, onPutOnHold, closePanel, groupCount, onShowGroup,
  selection, onOpenFromSelection, onConfirmAll, onDeleteAll, onCloseSelection,
  pending, onSavePending, onCancelPending, editSelection, onEditSelection, onSaveNames, onUnpick, onEditMany, onHoldAll, onPreview,
}) {
  const setEditing = (editing) => setPanel((p) => (p ? { ...p, editing } : p));
  const title = panel ? panelBooking.name : 'New Booking';

  const selectionView = selection && (
    <SelectionPanel
      bookings={selection}
      rooms={rooms}
      onOpen={onOpenFromSelection}
      onUnpick={onUnpick}
      onConfirmAll={onConfirmAll}
      onDeleteAll={onDeleteAll}
      pending={pending}
      onSavePending={onSavePending}
      onCancelPending={onCancelPending}
      editing={editSelection}
      onCancelEdit={() => onEditSelection(false)}
      onSaveNames={onSaveNames}
      onEdit={onEditSelection}
      onPreview={onPreview}
      onEditMany={onEditMany}
      onHoldAll={onHoldAll}
    />
  );
  if (selection && !wide) {
    return (
      <Sheet
        title={`${selection.length} Selected`}
        onClose={onCloseSelection}
        actions={!editSelection && <EditButton onClick={() => onEditSelection(true)} label="Edit the selected bookings together: names, dates and details" />}
      >
        {selectionView}
      </Sheet>
    );
  }
  if (selection) {
    return (
      <Dock
        overlay
        open={formOpen}
        onToggle={onToggle}
        label="Selected bookings"
        title={`${selection.length} Selected`}
        actions={!editSelection && <EditButton onClick={() => onEditSelection(true)} label="Edit the selected bookings together: names, dates and details" />}
        tab={`${selection.length} selected`}
        tabMark
      >
        {selectionView}
      </Dock>
    );
  }

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
        onConfirm={onConfirm}
        onPutOnHold={onPutOnHold}
        groupCount={groupCount}
        onShowGroup={onShowGroup}
        pending={pending}
        onSavePending={onSavePending}
        onCancelPending={onCancelPending}
      />
    );
  }

  if (!panel && !blank) return null;
  const actions = (
    <>
      {panel && !panel.editing && <EditButton onClick={() => setEditing(true)} disabled={panelBooking.id < 0} />}
    </>
  );

  return (
    <Dock
      overlay
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
          onConfirm={onConfirm}
          onPutOnHold={onPutOnHold}
          groupCount={groupCount}
          onShowGroup={onShowGroup}
          pending={pending}
          onSavePending={onSavePending}
          onCancelPending={onCancelPending}
          onPreview={onPreview}
        />
      ) : (
        <BookingForm key={`blank-${blank.resetKey ?? 0}`} {...blank} rooms={rooms} isBusy={isBusy} onSaved={onSaved} onDone={blank.onDone ?? (() => {})} />
      )}
    </Dock>
  );
}
