import { useState } from 'react';
import {
  ArrowLeft, ArrowRight, Baby, Bed, Buildings, CalendarBlank, Check, Envelope, Megaphone, Note, Phone, Receipt, SignIn, SignOut, Tag, User, Users, WarningCircle, X,
} from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import GuestPicker from '../GuestPicker';
import DateRangePicker from '../DateRangePicker';
import TimeSelect, { formatTime } from '../TimeSelect';
import StatusBadge from '../StatusBadge';
import { useSettings } from '../SettingsProvider';
import RoomPicker from './RoomPicker';
import MoreOptions from './MoreOptions';
import { RATE_PLANS } from './bookingOptions';
import { useBookingForm } from './useBookingForm';
import { resolveColor, statusColor } from '../../lib/colors';
import { fmtShort, nightsLabel } from '../../lib/dates';

const STEPS = ['Guest', 'Dates', 'Confirm'];

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

// The three steps as tabs: tap any to jump there. A step that is not filled in yet shows an exclamation mark in place of its number.
function StepList({ step, done, onGo }) {
  return (
    <ol className="grid grid-cols-3 gap-1.5" aria-label="Booking steps">
      {STEPS.map((name, i) => {
        const current = i === step;
        const missing = done[i] === false;
        return (
          <li key={name}>
            <button
              type="button"
              onClick={() => onGo(i)}
              aria-current={current ? 'step' : undefined}
              className={`btn w-full min-h-8 gap-1.5 px-2 text-xs ${
                current ? 'border-accent bg-accent-soft text-accent-text' : done[i] ? 'bg-surface-2' : 'text-muted'
              }`}
            >
              {/* The step number turns into an exclamation mark while the step is not filled in. */}
              {missing ? (
                <WarningCircle size={20} weight="fill" className="shrink-0 text-danger" />
              ) : (
                <span className={`grid size-5 place-items-center rounded-full text-[11px] ${current ? 'bg-accent text-accent-ink' : 'bg-surface-2'}`}>
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
  return <Steps key={round} {...props} onDone={() => { onDone?.(); setRound((n) => n + 1); }} />;
}

function Steps({ rooms, onCancel, ...rest }) {
  const f = useBookingForm(rest);
  const { settings } = useSettings();
  const [step, setStep] = useState(0);

  const guest = f.guestChoice?.guest ?? f.guestChoice?.newGuest ?? null;
  const takenRoom = f.roomIds.map((id) => rooms.find((r) => r.id === id)).find((r) => r && f.roomTaken(r.id));
  const guestProblem = !guest && !f.typedGuest.trim() && !(f.isHold && (f.label.trim() || f.organization.trim())) ? 'Enter the guest’s name (step 1).' : '';
  const stayProblem =
    f.roomIds.length === 0 ? 'Choose at least one room (step 2).'
    : f.nights < 1 ? 'Check-out must be after check-in (step 2).'
    : takenRoom ? `Room ${takenRoom.number} is booked on those dates (step 2).` : '';
  const done = [!guestProblem, !stayProblem, null]; // null: nothing is required on step 3
  const [hint, setHint] = useState('');
  const go = (i) => { setHint(''); setStep(i); };

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

      {/* Step 1: the guest (and organization). */}
      <div className={`space-y-3 ${step === 0 ? '' : 'hidden'}`}>
        <GuestPicker initial={f.initialGuest} onChange={f.setGuestChoice} onQuery={f.setTypedGuest} />
        <div>
          <FieldLabel icon={Buildings} htmlFor="b-org">Organization (optional)</FieldLabel>
          <input id="b-org" name="organization" className="field" value={f.organization} onChange={(e) => f.editOrganization(e.target.value)} autoComplete="off" />
        </div>
      </div>

      {/* Step 2: rooms, dates and times. */}
      <div className={`space-y-3 ${step === 1 ? '' : 'hidden'}`}>
        <RoomPicker rooms={rooms} roomIds={f.roomIds} roomTaken={f.roomTaken} onToggle={f.toggleRoom} />
        <div>
          <span className="sr-only">Dates</span>
          <DateRangePicker checkIn={f.checkIn} checkOut={f.checkOut} onChange={f.setDates} isBusy={f.nightBusy} />
          <div className="mt-2 grid grid-cols-2 gap-3">
            <TimeSelect id="b-in-time" name="check_in_time" icon={SignIn} label="Check-in time" value={f.checkInTime} onChange={f.setCheckInTime} />
            <TimeSelect id="b-out-time" name="check_out_time" icon={SignOut} label="Check-out time" value={f.checkOutTime} onChange={f.setCheckOutTime} />
          </div>
        </div>
      </div>

      {/* Step 3: the box with everything to check, then the more options. */}
      <div className={`space-y-3 ${step === 2 ? '' : 'hidden'}`}>
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

        <MoreOptions f={f} defaultOpen />
      </div>

      {hint ? <p className="rounded-lg border border-danger px-3 py-2 text-sm text-danger" role="alert">{hint}</p> : null}
      {f.error && <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">{f.error}</p>}

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-line bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:pb-2 lg:pt-2">
        {step > 0 ? (
          <button type="button" className="btn" onClick={() => go(step - 1)} disabled={f.busy}>
            <ArrowLeft size={16} aria-hidden="true" /> Back
          </button>
        ) : (
          onCancel && (
            <button type="button" className="btn" onClick={onCancel} disabled={f.busy}>
              <X size={16} aria-hidden="true" /> Cancel
            </button>
          )
        )}
        {/* Different keys: with one shared button React would turn Next into a submit button mid-click and submit the form. */}
        {step < 2 ? (
          <button key="next" type="button" className="btn btn-primary flex-1" onClick={() => go(step + 1)}>
            Next <ArrowRight size={16} aria-hidden="true" />
          </button>
        ) : (
          <button key="confirm" type="submit" className="btn btn-primary flex-1" disabled={f.busy}>
            {f.busy ? 'Saving…' : <><Check size={18} aria-hidden="true" /> {confirmLabel}</>}
          </button>
        )}
      </div>
    </form>
  );
}
