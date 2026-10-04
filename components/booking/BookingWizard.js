import { useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Baby, Plus, Suitcase, Bed, Buildings, CalendarBlank, Check, Envelope, Megaphone, Note, Phone, Receipt, SignIn, SignOut, Tag, User, Users, WarningCircle, X,
} from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import GuestPicker from '../GuestPicker';
import DateRangePicker from '../DateRangePicker';
import { formatTime } from '../TimeSelect';
import StatusBadge from '../StatusBadge';
import { useSettings } from '../SettingsProvider';
import RoomPicker from './RoomPicker';
import StatusPicker from './StatusPicker';
import { Card, Moment, MomentPair, Stepper } from './formParts';
import MoreOptions from './MoreOptions';
import { RATE_PLANS } from './bookingOptions';
import { useBookingForm } from './useBookingForm';
import { resolveColor, statusColor } from '../../lib/colors';
import { addDays, fmtShort, nightsLabel } from '../../lib/dates';

const STEPS = ['Guest', 'Room', 'Confirm'];

// What each step asks, as a plain question with one line of help.
const ASKS = [
  { title: 'Who is staying?', help: 'Search for a past guest, or add a new one.' },
  { title: 'Which room, and which days?', help: 'Tap a room, then the day they arrive and the day they leave.' },
  { title: 'Check and confirm', help: 'Look over everything. Then press the green button at the bottom.' },
];

// A line of the confirmation box.
function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-muted" />
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

// The three steps as tabs: tap any to jump there. A step you have moved past without filling it in shows a yellow
// exclamation mark in place of its number.
function StepList({ step, done, onGo }) {
  return (
    <ol className="grid grid-cols-3 gap-1.5" aria-label="Booking steps">
      {STEPS.map((name, i) => {
        const current = i === step;
        const missing = done[i] === false && step > i; // only once you have moved on without filling it in
        return (
          <li key={name}>
            <button
              type="button"
              onClick={() => onGo(i)}
              aria-current={current ? 'step' : undefined}
              className={`btn w-full min-h-11 gap-1.5 px-2 text-sm lg:min-h-10 ${
                current ? 'border-accent bg-accent-soft text-accent-text' : done[i] ? 'bg-surface-2' : 'text-muted'
              }`}
            >
              {/* The step number turns into an exclamation mark while the step is not filled in. */}
              {missing ? (
                <WarningCircle size={20} weight="fill" className="shrink-0 text-amber-500" />
              ) : (
                <span className={`grid size-6 place-items-center rounded-full text-xs ${current ? 'bg-accent text-accent-ink' : 'bg-surface-2'}`}>
                  {done[i] && !current ? <Check size={12} weight="bold" /> : i + 1}
                </span>
              )}
              {name}
              {missing && <span className="sr-only">(not filled in)</span>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/*
  A new booking in three steps: 1) the guest, 2) rooms and dates, 3) the rest of the options and a final box with every
  detail to check before confirming. Steps can be filled in any order (tap a step at the top, or use Back and Next);
  everything is checked on Confirm, and a step not filled in shows an exclamation mark instead of its number. All three steps stay mounted (hidden when not current), so nothing typed is lost
  when you go back. After a save the wizard starts over (a new key) unless the caller closes it.
  Props: see useBookingForm, plus rooms and onCancel.
*/
export default function BookingWizard({ onDone, ...props }) {
  const [round, setRound] = useState(0);
  const restart = () => setRound((n) => n + 1);
  return <Steps key={round} {...props} onClear={restart} onDone={() => { onDone?.(); restart(); }} />;
}

function Steps({ rooms, onCancel, onClear, onPreview, ...rest }) {
  const f = useBookingForm(rest);
  const { settings } = useSettings();
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0); // furthest step seen: the ghost stays on the calendar once the dates step was reached

  const guest = f.guestChoice?.guest ?? f.guestChoice?.newGuest ?? null;
  const takenRoom = f.roomIds.map((id) => rooms.find((r) => r.id === id)).find((r) => r && f.roomTaken(r.id));
  const guestProblem = !guest && !f.typedGuest.trim() && !(f.isHold && (f.label.trim() || f.organization.trim())) ? 'Please type the guest’s name first (step 1).' : '';
  const stayProblem =
    f.roomIds.length === 0 ? 'Please tap at least one room (step 2).'
    : f.nights < 1 ? 'The day they leave must come after the day they arrive (step 2).'
    : takenRoom ? `Room ${takenRoom.number} is already booked on those days. Please choose another room or other days (step 2).` : '';
  const done = [!guestProblem, !stayProblem, null]; // null: nothing is required on step 3
  const [hint, setHint] = useState('');
  const go = (i) => { setHint(''); setStep(i); setReached((r) => Math.max(r, i)); };

  // Confirm checks every step and jumps to the first one that is not filled in.
  const confirm = () => {
    if (guestProblem) { setHint(guestProblem); return setStep(0); }
    if (stayProblem) { setHint(stayProblem); return setStep(1); }
    setHint('');
    f.submit(false);
  };

  const tone = resolveColor(f.color) ?? resolveColor(guest?.color) ?? statusColor(f.status, settings);
  const roomNumbers = f.roomIds.map((id) => rooms.find((r) => r.id === id)?.number).filter(Boolean).sort();
  const times = [f.checkInTime && `in ${formatTime(f.checkInTime)}`, f.checkOutTime && `out ${formatTime(f.checkOutTime)}`].filter(Boolean);
  const guestName = guest?.name ?? (f.typedGuest.trim() || null);
  const ratePlan = RATE_PLANS.find(([v]) => v === f.ratePlan)?.[1] ?? f.ratePlan;
  // Ghost of this booking on the main calendar once the rooms and dates step has been reached.
  const previewKey = `${f.roomIds.join(',')}|${f.checkIn}|${f.checkOut}|${f.checkInTime}|${f.checkOutTime}|${tone.border}|${guestName ?? ''}`;
  useEffect(() => {
    if (!onPreview) return;
    onPreview(reached >= 1 && f.nights >= 1 ? { roomIds: f.roomIds, checkIn: f.checkIn, checkOut: f.checkOut, checkInTime: f.checkInTime, checkOutTime: f.checkOutTime, tone, name: guestName } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reached, previewKey]);
  useEffect(() => () => onPreview?.(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmLabel = f.isHold ? 'Place Hold' : f.roomIds.length > 1 ? `Confirm ${f.roomIds.length} Rooms` : 'Confirm Booking';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (step < 2) go(step + 1);
        else confirm();
      }}
      className="space-y-4 lg:space-y-3"
    >
      <StepList step={step} done={done} onGo={go} />

      <div>
        <h2 className="text-lg font-semibold leading-tight">{ASKS[step].title}</h2>
        <p className="text-sm leading-snug text-ink/70">{ASKS[step].help}</p>
      </div>

      {/* Step 1: the guest (and organization). */}
      <div className={`space-y-3 ${step === 0 ? '' : 'hidden'}`}>
        <Card icon={User} title="Guest">
          <GuestPicker initial={f.initialGuest} onChange={f.setGuestChoice} onQuery={f.setTypedGuest} />
        </Card>
        <Card icon={Buildings} title="Company or group (optional)">
          <input id="b-org" name="organization" aria-label="Company or group" className="field" placeholder="For example, Zee Bangla" value={f.organization} onChange={(e) => f.editOrganization(e.target.value)} autoComplete="off" />
        </Card>
        <Card icon={Users} title="How many people?">
          <div className="grid grid-cols-2 gap-3">
            <Stepper icon={Users} label="Adults" value={f.adults} min={1} onChange={f.setAdults} />
            <Stepper icon={Baby} label="Children" value={f.children} onChange={f.setChildren} />
          </div>
          {f.roomIds.length > 1 && <p className="text-xs text-muted">The total for all {f.roomIds.length} rooms, shared out between them.</p>}
        </Card>
      </div>

      {/* Step 2: rooms, dates and times. */}
      <div className={`space-y-3 ${step === 1 ? '' : 'hidden'}`}>
        <Card icon={Bed} title={f.roomIds.length > 1 ? `Rooms (${f.roomIds.length} chosen)` : 'Room'}>
          <RoomPicker rooms={rooms} roomIds={f.roomIds} roomTaken={f.roomTaken} onToggle={f.toggleRoom} />
        </Card>
        <Card icon={CalendarBlank} title="Days">
          <DateRangePicker checkIn={f.checkIn} checkOut={f.checkOut} onChange={f.setDates} isBusy={f.nightBusy} />
        </Card>
        <div>
          <MomentPair>
            <Moment icon={SignIn} label="Check-in time" id="b-in" time={f.checkInTime} onTime={f.setCheckInTime} />
            <Moment icon={SignOut} label="Check-out time" id="b-out" time={f.checkOutTime} onTime={f.setCheckOutTime} />
          </MomentPair>
        </div>
        {f.nights >= 3 && (
          <Card icon={Suitcase} title="Going away for a few days?">
            {f.away ? (
              <>
                <p className="text-sm leading-snug text-ink/70">The room is kept for them. It is saved as two stays for the same guest.</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="away-from" className="text-xs font-medium text-muted">They leave on</label>
                    <input id="away-from" type="date" className="field min-w-0 px-2 text-sm font-semibold" value={f.away.from} min={addDays(f.checkIn, 1)} max={addDays(f.checkOut, -2)} onChange={(e) => e.target.value && f.setAway({ from: e.target.value, to: f.away.to > e.target.value ? f.away.to : addDays(e.target.value, 1) })} />
                  </div>
                  <div>
                    <label htmlFor="away-to" className="text-xs font-medium text-muted">They come back on</label>
                    <input id="away-to" type="date" className="field min-w-0 px-2 text-sm font-semibold" value={f.away.to} min={addDays(f.away.from, 1)} max={addDays(f.checkOut, -1)} onChange={(e) => e.target.value && f.setAway({ ...f.away, to: e.target.value })} />
                  </div>
                </div>
                <button type="button" className="btn min-h-10 w-full lg:min-h-10" onClick={() => f.setAway(null)}>
                  <X size={16} aria-hidden="true" /> No break
                </button>
              </>
            ) : (
              <button type="button" className="btn min-h-11 w-full lg:min-h-11" onClick={() => f.setAway({ from: addDays(f.checkIn, 1), to: addDays(f.checkIn, 2) })}>
                <Plus size={16} aria-hidden="true" /> Add a break
              </button>
            )}
          </Card>
        )}
      </div>

      {/* Step 3: the box with everything to check, then the more options. */}
      <div className={`space-y-3 ${step === 2 ? '' : 'hidden'}`}>
        <Card icon={Tag} title="Is it confirmed?">
          <StatusPicker value={f.status} onChange={f.setStatus} hideLabel />
          <p className="text-sm leading-snug text-ink/70">
            <strong>Confirmed</strong> is a real booking. <strong>On hold</strong> keeps the room for them for now, without confirming.
          </p>
        </Card>
        {f.isHold && (
          <div>
            <FieldLabel icon={Tag} htmlFor="b-label">Hold Label (optional)</FieldLabel>
            <input id="b-label" name="label" className="field" placeholder="For example, Sharma wedding party…" value={f.label} onChange={(e) => f.setLabel(e.target.value)} autoComplete="off" />
          </div>
        )}
        <section aria-label="Booking summary" className="rounded-lg border-2 p-3" style={{ backgroundColor: tone.bg, borderColor: tone.border }}>
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="flex min-w-0 items-center gap-1.5 text-base font-semibold">
              <User size={18} aria-hidden="true" className="shrink-0" />
              <span className="truncate">{guestName ?? 'No guest yet'}</span>
            </h3>
            <StatusBadge status={f.status} />
          </div>
          <dl className="space-y-1.5 text-sm">
            {guest?.phone && <Row icon={Phone} label="Phone">{guest.phone}</Row>}
            {guest?.email && <Row icon={Envelope} label="Email">{guest.email}</Row>}
            {f.organization.trim() && <Row icon={Buildings} label="Organization">{f.organization.trim()}</Row>}
            <Row icon={Bed} label="Rooms">Room {roomNumbers.join(', ')}</Row>
            <Row icon={CalendarBlank} label="Dates">
              {fmtShort(f.checkIn)} to {fmtShort(f.checkOut)}
              <span className="text-muted">, {nightsLabel(f.nights)}</span>
              {times.length > 0 && <span className="text-muted">, {times.join(', ')}</span>}
            </Row>
            {f.away && <Row icon={Suitcase} label="Break">Away from {fmtShort(f.away.from)}, back on {fmtShort(f.away.to)} (two stays)</Row>}
            <Row icon={Users} label="Guests">
              {f.adults} {Number(f.adults) === 1 ? 'adult' : 'adults'}
              {Number(f.children) > 0 && (
                <>
                  , <Baby size={14} aria-hidden="true" className="inline align-text-bottom" /> {f.children} {Number(f.children) === 1 ? 'child' : 'children'}
                </>
              )}
            </Row>
            <Row icon={Megaphone} label="Booked via">{f.channel}</Row>
            <Row icon={Receipt} label="Rate plan">{ratePlan}</Row>
            {f.notes.trim() && <Row icon={Note} label="Notes">{f.notes.trim()}</Row>}
          </dl>
        </section>

        <MoreOptions f={f} hideParty hideStatus />
      </div>

      {hint ? <p className="flex items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm" role="alert"><WarningCircle size={18} weight="fill" className="shrink-0 text-amber-500" />{hint}</p> : null}
      {f.error && <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">{f.error}</p>}

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-line bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:pb-2 lg:pt-2">
        {step > 0 ? (
          <button type="button" className="btn min-h-12 px-4 text-base lg:min-h-12" onClick={() => go(step - 1)} disabled={f.busy}>
            <ArrowLeft size={18} aria-hidden="true" /> Back
          </button>
        ) : (
          <button type="button" className="btn min-h-12 px-4 text-base lg:min-h-12" onClick={() => (onCancel ? onCancel() : onClear())} disabled={f.busy}>
            <X size={18} aria-hidden="true" /> {onCancel ? 'Cancel' : 'Clear'}
          </button>
        )}
        {/* Different keys: with one shared button React would turn Next into a submit button mid-click and submit the form. */}
        {step < 2 ? (
          <button key="next" type="button" className="btn btn-primary min-h-12 flex-1 text-base lg:min-h-12" onClick={() => go(step + 1)}>
            Next: {STEPS[step + 1]} <ArrowRight size={18} aria-hidden="true" />
          </button>
        ) : (
          <button key="confirm" type="submit" className="btn btn-primary min-h-12 flex-1 text-base lg:min-h-12" disabled={f.busy}>
            {f.busy ? 'Saving…' : <><Check size={20} weight="bold" aria-hidden="true" /> {confirmLabel}</>}
          </button>
        )}
      </div>
    </form>
  );
}
