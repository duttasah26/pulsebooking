import { Buildings, SignIn, SignOut, Tag } from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import GuestPicker from '../GuestPicker';
import DateRangePicker from '../DateRangePicker';
import TimeSelect from '../TimeSelect';
import RoomPicker from './RoomPicker';
import EditRoomRow from './EditRoomRow';
import MoreOptions from './MoreOptions';
import FormFooter from './FormFooter';
import { useBookingForm } from './useBookingForm';
import { colorFor } from '../../lib/colors';

/*
  The booking form. The essentials are always visible (guest, organization, rooms, dates, times); everything else
  sits under "More Options" so the form fits on screen without scrolling. The state lives in useBookingForm.
  Props: see useBookingForm, plus rooms (all rooms) and onCancel.
*/
export default function BookingForm({ rooms, onCancel, ...rest }) {
  const f = useBookingForm(rest);

  return (
    <form onSubmit={(e) => { e.preventDefault(); f.submit(false); }} className="space-y-4 lg:space-y-2.5">
      {/* Once booked, the guest card wears the booking's colour (including a colour just picked below). */}
      <GuestPicker
        initial={f.initialGuest}
        onChange={f.setGuestChoice}
        onQuery={f.setTypedGuest}
        tone={f.edit ? colorFor({ ...f.booking, color: f.color }) : undefined}
      />

      {f.isHold && (
        <div>
          <FieldLabel icon={Tag} htmlFor="b-label">Hold Label (optional)</FieldLabel>
          <input id="b-label" name="label" className="field" placeholder="For example, Sharma wedding party…" value={f.label} onChange={(e) => f.setLabel(e.target.value)} autoComplete="off" />
        </div>
      )}

      <div>
        <FieldLabel icon={Buildings} htmlFor="b-org">Organization (optional)</FieldLabel>
        <input id="b-org" name="organization" className="field" value={f.organization} onChange={(e) => f.editOrganization(e.target.value)} autoComplete="off" />
      </div>

      {f.edit ? (
        <EditRoomRow f={f} rooms={rooms} />
      ) : (
        <RoomPicker rooms={rooms} roomIds={f.roomIds} roomTaken={f.roomTaken} onToggle={f.toggleRoom} />
      )}

      <div>
        <span className="sr-only">Dates</span>
        <DateRangePicker checkIn={f.checkIn} checkOut={f.checkOut} onChange={f.setDates} isBusy={f.nightBusy} />
        <div className="mt-2 grid grid-cols-2 gap-3">
          <TimeSelect id="b-in-time" name="check_in_time" icon={SignIn} label="Check-in time" value={f.checkInTime} onChange={f.setCheckInTime} />
          <TimeSelect id="b-out-time" name="check_out_time" icon={SignOut} label="Check-out time" value={f.checkOutTime} onChange={f.setCheckOutTime} />
        </div>
      </div>

      <MoreOptions f={f} />

      {f.error && <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">{f.error}</p>}

      <FormFooter f={f} onCancel={onCancel} />
    </form>
  );
}
