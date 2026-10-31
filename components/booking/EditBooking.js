import { useEffect } from 'react';
import { Check, Baby, Bed, Buildings, CalendarBlank, Palette, SignIn, SignOut, Tag, User, Users } from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import GuestPicker from '../GuestPicker';
import DateRangePicker from '../DateRangePicker';
import RoomChips from '../RoomChips';
import { useSettings } from '../SettingsProvider';
import StatusPicker from './StatusPicker';
import ColorPicker from './ColorPicker';
import RoomPicker from './RoomPicker';
import MoreOptions from './MoreOptions';
import FormFooter from './FormFooter';
import { useBookingForm } from './useBookingForm';
import { Card, Moment, MomentPair, Stepper } from './formParts';
import { colorFor } from '../../lib/colors';
import { STATUS_LABEL } from '../../lib/status';

// Shown while a hold is open for editing: the two things that turn it into a real booking, in order, each ticked once done.
function ConfirmSteps({ hasGuest, onCancel, busy }) {
  const num = 'grid size-7 shrink-0 place-items-center rounded-md font-mono text-base font-semibold';
  return (
    <section aria-label="How to confirm this hold" className="animate-fade rounded-lg bg-accent-soft p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="t-title">To confirm this booking</h2>
        {onCancel && (
          <button type="button" className="btn btn-quiet -mr-2 -mt-1 shrink-0 px-3" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
      <ol className="mt-2 space-y-2 text-base">
        <li className="flex items-center gap-3">
          <span className={`${num} ${hasGuest ? 'bg-accent text-accent-ink' : 'bg-surface text-accent-strong ring-1 ring-accent'}`}>
            {hasGuest ? <Check size={16} weight="bold" aria-label="Done" /> : 1}
          </span>
          Type the guest’s name
        </li>
        <li className="flex items-center gap-3">
          <span className={`${num} bg-surface text-accent-strong ring-1 ring-accent`}>2</span>
          Press <strong>Confirm Booking</strong>
        </li>
      </ol>
    </section>
  );
}

/*
  Editing an existing booking or hold, built from the same parts and in the same order as a new booking (BookingWizard): Guest,
  Company, How many people, Colour, Room, Days (the same calendar picker), the two times, and a folded More options for what is rarely needed. Delete is not here: it is in the details
  (hold the button), so this form only has Cancel and Save Changes.
  Props: see useBookingForm, plus rooms and onCancel.
*/
export default function EditBooking({ rooms, onCancel, onPreview, ...rest }) {
  const f = useBookingForm(rest); // onPreview is left out on purpose: this form draws its own ghost, below
  const { settings } = useSettings();
  const several = f.targets.length > 1;

  // The change as a ghost on the calendar: while the form is open, a dashed bar shows where the booking would be with the new days,
  // times and room (the real bar fades), so the change can be seen before it is saved. Nothing is drawn while nothing differs.
  const original = f.booking;
  const roomIdsNow = several ? f.targets.map((t) => t.room_id) : f.roomIds;
  const statusChanged = f.status !== original.status;
  const colorChanged = (f.color || null) !== (original.color || null);
  const stayChanged =
    f.checkIn !== original.check_in || f.checkOut !== original.check_out ||
    (f.checkInTime || null) !== (original.check_in_time || null) || (f.checkOutTime || null) !== (original.check_out_time || null) ||
    (!several && f.roomIds[0] !== original.room_id);
  const changed = statusChanged || colorChanged || stayChanged;
  const tone = colorFor({ ...original, color: f.color, status: f.status }, settings);
  useEffect(() => {
    if (!onPreview) return undefined;
    if (changed && f.nights >= 1) {
      onPreview({
        roomIds: roomIdsNow, checkIn: f.checkIn, checkOut: f.checkOut, checkInTime: f.checkInTime || undefined, checkOutTime: f.checkOutTime || undefined,
        tone, status: f.status, locked: true, replaces: f.targets.map((t) => t.id),
        // Says what is different: the new status when it changed, otherwise that these are new days or a new room.
        name: `${original.name}, ${statusChanged ? STATUS_LABEL[f.status] : colorChanged && !stayChanged ? 'new colour' : 'new'}`,
      });
    } else onPreview(null);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changed, f.checkIn, f.checkOut, f.checkInTime, f.checkOutTime, f.nights, roomIdsNow.join(','), f.color, f.status]);
  useEffect(() => () => onPreview?.(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form onSubmit={(e) => { e.preventDefault(); f.submit(false); }} className="form-area flex flex-1 flex-col gap-5 pb-1">
      {f.isHoldEdit ? (
        <ConfirmSteps hasGuest={Boolean(f.guestChoice)} onCancel={onCancel} busy={f.busy} />
      ) : (
        <h2 className="t-title">Edit booking</h2>
      )}
      {!f.isHoldEdit && (
        <Card icon={Tag} title="Status">
          <StatusPicker value={f.status} onChange={f.setStatus} hideLabel />
        </Card>
      )}

      <Card icon={User} title="Guest">
        <GuestPicker
          initial={f.initialGuest}
          onChange={f.setGuestChoice}
          onQuery={f.setTypedGuest}
          tone={colorFor({ ...f.booking, color: f.color, status: f.status }, settings)}
        />
        {f.isHold && (
          <div>
            <FieldLabel icon={Tag} htmlFor="b-label">Hold label (optional)</FieldLabel>
            <input id="b-label" name="label" className="field" placeholder="For example, Sharma wedding party…" value={f.label} onChange={(e) => f.setLabel(e.target.value)} autoComplete="off" />
          </div>
        )}
      </Card>
      <Card icon={Buildings} title="Company or group (optional)">
        <input id="b-org" name="organization" aria-label="Company or group" className="field" list="b-org-list" placeholder="For example, Zee Bangla" value={f.organization} onChange={(e) => f.editOrganization(e.target.value)} autoComplete="off" />
        <datalist id="b-org-list">{(f.companies ?? []).map((c) => <option key={c.name} value={c.name} />)}</datalist>
      </Card>
      <Card icon={Users} title="How many people?">
        <div className="grid grid-cols-2 gap-3">
          <Stepper icon={Users} label="Adults" value={f.adults} min={1} onChange={f.setAdults} />
          <Stepper icon={Baby} label="Children" value={f.children} onChange={f.setChildren} />
        </div>
        {several && <p className="text-base text-muted">The total for all {f.targets.length} rooms, shared out between them.</p>}
      </Card>
      <Card icon={Palette} title="Colour on the calendar (optional)">
        <ColorPicker id="b-color-label" label="Colour" hideLabel color={f.color} onChange={f.setColor} />
      </Card>

      {several ? (
        <RoomChips numbers={f.targets.map((t) => t.room_number)} note={<p className="mt-2 text-base text-muted">Changes here apply to all of these rooms.</p>} />
      ) : (
        <Card icon={Bed} title="Room">
          <RoomPicker rooms={rooms} roomIds={f.roomIds} roomTaken={f.roomTaken} onToggle={(id) => f.setRoomIds([id])} />
        </Card>
      )}
      <Card icon={CalendarBlank} title="Days">
        <DateRangePicker checkIn={f.checkIn} checkOut={f.checkOut} onChange={f.setDates} isBusy={(d) => Boolean(f.nightBusy(d))} />
      </Card>
      <MomentPair>
        <Moment icon={SignIn} tone="text-accent-text" label="Check-in" id="b-in" time={f.checkInTime} onTime={f.setCheckInTime} />
        <Moment icon={SignOut} tone="text-danger" label="Check-out" id="b-out" time={f.checkOutTime} onTime={f.setCheckOutTime} />
      </MomentPair>

      <MoreOptions f={f} hideStatus hideParty hideColor />

      {f.error && <p role="alert" className="animate-shake rounded-lg bg-danger-soft px-4 py-3 text-base font-medium text-danger">{f.error}</p>}

      <FormFooter f={f} onCancel={f.isHoldEdit ? undefined : onCancel} />
    </form>
  );
}
