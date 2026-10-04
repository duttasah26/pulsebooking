import { Buildings, Check, Minus, Plus, SignIn, SignOut, Tag, Users, Baby, Bed } from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import GuestPicker from '../GuestPicker';
import TimeSelect from '../TimeSelect';
import RoomChips from '../RoomChips';
import { useSettings } from '../SettingsProvider';
import StatusPicker from './StatusPicker';
import MoreOptions from './MoreOptions';
import FormFooter from './FormFooter';
import { useBookingForm } from './useBookingForm';
import { Card, Moment, MomentPair, Stepper } from './formParts';
import { colorFor, roomShade } from '../../lib/colors';
import { addDays, nightsLabel } from '../../lib/dates';

// Pick the room by its coloured number, a row for each floor, in the floor's colour (as on the calendar). A room taken
// on these dates is hatched and cannot be chosen.
function RoomChoice({ rooms, roomId, taken, onPick }) {
  const { settings } = useSettings();
  const floors = new Map();
  for (const r of rooms) floors.set(String(r.number)[0], [...(floors.get(String(r.number)[0]) ?? []), r]);
  return (
    <div className="space-y-1.5" role="radiogroup" aria-label="Room">
      {[...floors.entries()].map(([floor, list]) => (
        <div key={floor} className="flex flex-wrap gap-1.5">
          {list.map((r) => {
            const on = r.id === roomId;
            const busy = taken(r.id) && !on;
            const shade = roomShade(r, settings);
            return (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={busy}
                title={busy ? `Room ${r.number} is booked on these dates` : `Room ${r.number}`}
                onClick={() => onPick(r.id)}
                className={`inline-flex min-h-11 min-w-14 items-center justify-center gap-1 rounded-md border px-2 font-mono text-sm font-semibold transition-transform active:scale-95 disabled:cursor-not-allowed ${busy ? 'hatch text-muted opacity-60' : ''} ${on ? 'ring-2 ring-ink ring-offset-1' : ''}`}
                style={busy ? undefined : { backgroundColor: shade.fill, borderColor: shade.edge }}
              >
                {on && <Check size={14} weight="bold" aria-hidden="true" />}
                {r.number}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/*
  Editing an existing booking or hold, laid out like its details so the two feel like one thing: Status, Guest, the stay
  (Check-in and Check-out side by side, then the room as coloured chips), Guests with plus and minus buttons, and a
  folded More for what is rarely needed (booked via, rate plan, colour, notes). Delete is not here: it is in the details
  (hold the button), so this form only has Cancel and Save Changes.
  Props: see useBookingForm, plus rooms and onCancel.
*/
export default function EditBooking({ rooms, onCancel, ...rest }) {
  const f = useBookingForm(rest);
  const { settings } = useSettings();
  const several = f.targets.length > 1;

  return (
    <form onSubmit={(e) => { e.preventDefault(); f.submit(false); }} className="space-y-3 pb-1">
      <Card icon={Tag} title="Status">
        <StatusPicker value={f.status} onChange={f.setStatus} hideLabel />
      </Card>

      <Card icon={Bed} title="Guest">
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
      </Card>

      <div>
        <MomentPair>
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
        </MomentPair>
        <p className="mt-1 text-center text-sm text-muted lg:text-xs">{f.nights >= 1 ? nightsLabel(f.nights) : 'Check-out must be after check-in'}</p>
      </div>

      {several ? (
        <RoomChips numbers={f.targets.map((t) => t.room_number)} note={<p className="mt-2 text-sm text-muted lg:text-xs">Changes here apply to all of these rooms.</p>} />
      ) : (
        <Card icon={Bed} title="Room">
          <RoomChoice rooms={rooms} roomId={f.roomIds[0]} taken={f.roomTaken} onPick={(id) => f.setRoomIds([id])} />
        </Card>
      )}

      <Card icon={Users} title="Guests">
        <div className="grid grid-cols-2 gap-3">
          <Stepper icon={Users} label="Adults" value={f.adults} min={1} onChange={f.setAdults} />
          <Stepper icon={Baby} label="Children" value={f.children} onChange={f.setChildren} />
        </div>
        {several && <p className="text-xs text-muted">The total for all {f.targets.length} rooms, shared out between them.</p>}
      </Card>

      <MoreOptions f={f} hideStatus hideParty />

      {f.error && <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">{f.error}</p>}

      <FormFooter f={f} onCancel={onCancel} />
    </form>
  );
}
