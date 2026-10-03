import { Baby, Bed, Buildings, SignIn, SignOut, Tag, Users } from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import GuestPicker from '../GuestPicker';
import TimeSelect from '../TimeSelect';
import { useSettings } from '../SettingsProvider';
import StatusPicker from './StatusPicker';
import MoreOptions from './MoreOptions';
import FormFooter from './FormFooter';
import { useBookingForm } from './useBookingForm';
import { colorFor } from '../../lib/colors';
import { addDays, nightsLabel } from '../../lib/dates';

// A titled group of fields, so the form reads as four short parts instead of one long list.
function Section({ title, children }) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

// One end of the stay: its date and its time side by side, matching the Check-in and Check-out blocks in the details.
function Moment({ icon: Icon, label, id, date, onDate, min, time, onTime }) {
  return (
    <div className="space-y-2 rounded-lg border border-line p-2.5">
      <FieldLabel icon={Icon} htmlFor={`${id}-date`}>{label}</FieldLabel>
      <input id={`${id}-date`} name={`${id}-date`} type="date" className="field" value={date} min={min} onChange={(e) => e.target.value && onDate(e.target.value)} />
      <TimeSelect id={`${id}-time`} name={`${id}-time`} label="Time" value={time} onChange={onTime} />
    </div>
  );
}

/*
  Editing an existing booking or hold. Four parts, top to bottom: Guest, Stay (room, check-in, check-out), Status, and
  Guests; everything rarely needed (booked via, rate plan, colour, notes) is folded under More. Delete is not here: it
  is in the details view (hold the button), so this form only has Cancel and Save.
  Props: see useBookingForm, plus rooms and onCancel.
*/
export default function EditBooking({ rooms, onCancel, ...rest }) {
  const f = useBookingForm(rest);
  const { settings } = useSettings();
  const several = f.targets.length > 1;

  return (
    <form onSubmit={(e) => { e.preventDefault(); f.submit(false); }} className="space-y-5">
      <Section title="Guest">
        <GuestPicker
          initial={f.initialGuest}
          onChange={f.setGuestChoice}
          onQuery={f.setTypedGuest}
          tone={colorFor({ ...f.booking, color: f.color, status: f.status }, settings)}
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
      </Section>

      <Section title="Stay">
        {several ? (
          <p className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
            <Bed size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-muted" />
            <span>Rooms {f.targets.map((t) => t.room_number).sort().join(', ')}. Changes apply to all of them.</span>
          </p>
        ) : (
          <div>
            <FieldLabel icon={Bed} htmlFor="b-room">Room</FieldLabel>
            <select id="b-room" name="room" className="field" value={f.roomIds[0]} onChange={(e) => f.setRoomIds([Number(e.target.value)])}>
              {rooms.map((r) => <option key={r.id} value={r.id}>Room {r.number}</option>)}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <Moment
            icon={SignIn}
            label="Check-in"
            id="b-in"
            date={f.checkIn}
            onDate={(d) => f.setDates(d, d >= f.checkOut ? addDays(d, 1) : f.checkOut)}
            time={f.checkInTime}
            onTime={f.setCheckInTime}
          />
          <Moment
            icon={SignOut}
            label="Check-out"
            id="b-out"
            date={f.checkOut}
            min={addDays(f.checkIn, 1)}
            onDate={(d) => f.setDates(f.checkIn, d)}
            time={f.checkOutTime}
            onTime={f.setCheckOutTime}
          />
        </div>
        <p className="text-center text-xs text-muted">{f.nights >= 1 ? nightsLabel(f.nights) : 'Check-out must be after check-in'}</p>
      </Section>

      <Section title="Status">
        <StatusPicker value={f.status} onChange={f.setStatus} hideLabel />
      </Section>

      <Section title="Guests">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel icon={Users} htmlFor="b-adults">Adults</FieldLabel>
            <input id="b-adults" name="adults" autoComplete="off" type="number" inputMode="numeric" min="1" className="field" value={f.adults} onChange={(e) => f.setAdults(e.target.value)} />
          </div>
          <div>
            <FieldLabel icon={Baby} htmlFor="b-children">Children</FieldLabel>
            <input id="b-children" name="children" autoComplete="off" type="number" inputMode="numeric" min="0" className="field" value={f.children} onChange={(e) => f.setChildren(e.target.value)} />
          </div>
        </div>
      </Section>

      <MoreOptions f={f} hideStatus hideParty />

      {f.error && <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">{f.error}</p>}

      <FormFooter f={f} onCancel={onCancel} />
    </form>
  );
}
