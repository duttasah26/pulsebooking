import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, WarningCircle, Baby, Bed, Buildings, CalendarBlank, Palette, SignIn, SignOut, Suitcase, Tag, User, Users, Plus, X } from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import GuestPicker from '../GuestPicker';
import DateRangePicker from '../DateRangePicker';
import { formatTime } from '../TimeSelect';
import StatusBadge from '../StatusBadge';
import { useSettings } from '../SettingsProvider';
import RoomPicker from './RoomPicker';
import StatusPicker from './StatusPicker';
import ColorPicker from './ColorPicker';
import { Card, Moment, MomentPair, Stepper } from './formParts';
import MoreOptions from './MoreOptions';
import { RATE_PLANS } from './bookingOptions';
import { useBookingForm } from './useBookingForm';
import { resolveColor, roomShade, statusColor } from '../../lib/colors';
import { addDays, diffDays, fmtShort, nightsLabel } from '../../lib/dates';

const STEPS = ['Guest', 'Room', 'Confirm'];

// What each step asks, as a plain question with one line of help.
const ASKS = [
  { title: 'Who is staying?', help: 'Pick a past guest or add a new one.' },
  { title: 'Which room, and which days?', help: 'Tap a room, then the arrival and leaving days.' },
  { title: 'Check and confirm', help: 'Check it, then press the green button.' },
];

// One room of the booking, then its check-in, its check-out (red) and the nights. Words are plain; only the check-out
// date is coloured. A guest with several rooms on different days gets one line each, one after the other.
function StayLine({ room, checkIn, checkOut, inTime, outTime }) {
  const { settings } = useSettings();
  const shade = roomShade({ number: room }, settings);
  const chip = (
    <span className="rounded-md px-2 py-0.5 text-base font-semibold" style={{ backgroundColor: shade.fill, boxShadow: `inset 0 0 0 1px ${shade.edge}` }}>
      Room <span className="font-mono">{room}</span>
    </span>
  );
  // A new booking starts with no days chosen: say so instead of trying to write a date that is not there.
  if (!checkIn || !checkOut) {
    return (
      <li className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-line bg-surface px-3 py-2.5 text-base">
        {chip}
        <span className="text-muted">No days chosen yet</span>
      </li>
    );
  }
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-line bg-surface px-3 py-2.5 text-base">
      {chip}
      <span><span className="text-muted">Check-in</span> <strong className="font-semibold">{fmtShort(checkIn)}</strong>{inTime && <span className="text-muted">, {formatTime(inTime)}</span>}</span>
      <span><span className="text-muted">Check-out</span> <strong className="font-semibold text-danger">{fmtShort(checkOut)}</strong>{outTime && <span className="text-muted">, {formatTime(outTime)}</span>}</span>
      <span className="text-muted">{nightsLabel(diffDays(checkIn, checkOut))}</span>
    </li>
  );
}

// One fact in the confirmation card: a small label over the value in plain type.
function Fact({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.9375rem] text-muted">{label}</dt>
      <dd className="break-words font-semibold">{children}</dd>
    </div>
  );
}

// The three steps as a segmented control: tap any to jump there. A finished step shows a tick on green; a step you have
// moved past without filling it in shows a red exclamation mark in place of its number.
function StepList({ step, done, onGo }) {
  return (
    <ol className="seg grid w-full grid-cols-3" aria-label="Booking steps">
      {STEPS.map((name, i) => {
        const current = i === step;
        const missing = done[i] === false && step > i; // only once you have moved on without filling it in
        return (
          <li key={name}>
            <button
              type="button"
              onClick={() => onGo(i)}
              aria-current={current ? 'step' : undefined}
              className="seg-item min-h-11 w-full gap-2 px-2 lg:min-h-9"
            >
              {/* The step number turns into an exclamation mark while the step is not filled in. */}
              {missing ? (
                <WarningCircle size={20} weight="fill" className="shrink-0 text-danger" />
              ) : (
                <span className={`grid size-6 place-items-center rounded-md font-mono text-sm font-semibold ${current ? 'bg-ink text-white' : done[i] ? 'bg-accent text-accent-ink' : 'bg-ink/10'}`}>
                  {done[i] && !current ? <Check size={14} /> : i + 1}
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
  return <Steps key={round} {...props} onClear={() => { onDone?.(); restart(); }} onDone={() => { onDone?.(); restart(); }} />;
}

function Steps({ rooms, onCancel, onClear, onPreview, drawn, ...rest }) {
  const f = useBookingForm(rest);
  const { settings } = useSettings();
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0); // furthest step seen: the ghost stays on the calendar once the dates step was reached

  const guest = f.guestChoice?.guest ?? f.guestChoice?.newGuest ?? null;
  const takenRoom = f.roomIds.map((id) => rooms.find((r) => r.id === id)).find((r) => r && f.roomTaken(r.id));
  const guestProblem = !guest && !f.typedGuest.trim() && !(f.isHold && (f.label.trim() || f.organization.trim())) ? 'Please type the guest’s name first (step 1).' : '';
  const stayProblem =
    f.roomIds.length === 0 ? 'Please tap at least one room (step 2).'
    : !f.checkIn || !f.checkOut ? 'Please pick the check-in day and the check-out day (step 2).'
    : f.nights < 1 ? 'The day they leave must come after the day they arrive (step 2).'
    : takenRoom ? `Room ${takenRoom.number} is already booked on those days. Please choose another room or other days (step 2).` : '';
  // Further stays: none may fall on nights that are already booked, or on nights of another stay in this same booking.
  const extraProblem = (() => {
    const seen = new Set();
    const nightsOf = (s) => { const out = []; for (let d = s.checkIn; d < s.checkOut; d = addDays(d, 1)) out.push(d); return out; };
    for (const id of f.roomIds) for (const d of nightsOf({ checkIn: f.checkIn, checkOut: f.checkOut })) seen.add(`${id}|${d}`);
    for (const s of f.extraStays) {
      for (const id of s.roomIds) {
        const number = rooms.find((r) => r.id === id)?.number;
        for (const d of nightsOf(s)) {
          if (rest.isBusy?.(id, d) || seen.has(`${id}|${d}`)) return `Room ${number} is already booked on ${fmtShort(d)}. Remove that stay or choose other days (step 2).`;
          seen.add(`${id}|${d}`);
        }
      }
    }
    return '';
  })();
  const done = [!guestProblem, !stayProblem && !extraProblem, null]; // null: nothing is required on step 3
  const [hint, setHint] = useState('');
  // A draft brought back after leaving the page already has its rooms and days: show them on the calendar again.
  useEffect(() => {
    if (f.roomIds.length && f.checkIn && f.checkOut) setReached((r) => Math.max(r, 1));
  }, [f.roomIds.length, f.checkIn, f.checkOut]);
  const go = (i) => { setHint(''); setStep(i); setReached((r) => Math.max(r, i)); };
  // What is drawn on the calendar while New Booking is on. The first stay fills in the rooms and days. Another stay for the
  // same days adds its rooms; one for other days becomes a further stay in the same booking (listed in step 2, each editable, with an X).
  // A clicked room number toggles that room. Everything is saved together under one guest.
  const drew = useRef(false);
  useEffect(() => {
    if (!drawn) return;
    if (drawn.remove) {
      const { roomId, checkIn, checkOut } = drawn.remove;
      if (checkIn === f.checkIn && checkOut === f.checkOut) {
        if (f.roomIds.length > 1) f.setRoomIds((ids) => ids.filter((x) => x !== roomId));
        else if (f.extraStays.length) {
          const [first, ...rest] = f.extraStays; // the first further stay becomes the main one
          f.setRoomIds(first.roomIds);
          f.setDates(first.checkIn, first.checkOut);
          f.setExtraStays(rest);
        }
        return;
      }
      return f.setExtraStays((list) => list
        .map((s) => (s.checkIn === checkIn && s.checkOut === checkOut ? { ...s, roomIds: s.roomIds.filter((x) => x !== roomId) } : s))
        .filter((s) => s.roomIds.length));
    }
    if (drawn.toggle) return f.toggleRoom(drawn.toggle);
    setReached((r) => Math.max(r, 1));
    if (!drew.current) {
      drew.current = true;
      f.setRoomIds(drawn.roomIds);
      f.setDates(drawn.checkIn, drawn.checkOut);
      return;
    }
    if (drawn.checkIn === f.checkIn && drawn.checkOut === f.checkOut) {
      f.setRoomIds((ids) => [...new Set([...ids, ...drawn.roomIds])]);
      return;
    }
    f.setExtraStays((list) => {
      const fresh = drawn.roomIds
        .filter((id) => !list.some((x) => x.roomIds[0] === id && x.checkIn === drawn.checkIn && x.checkOut === drawn.checkOut))
        .map((id) => ({ roomIds: [id], checkIn: drawn.checkIn, checkOut: drawn.checkOut }));
      return [...list, ...fresh];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawn?.n]);
  // Room by room: every room of the booking can have its own days. The calendar edits the room chosen above it.
  const nightsIn = (x) => { const out = []; for (let d = x.checkIn; d < x.checkOut; d = addDays(d, 1)) out.push(d); return out; };
  const allIds = [...new Set([...f.roomIds, ...f.extraStays.map((x) => x.roomIds[0])])];
  const [chosenRoom, setChosenRoom] = useState(null);
  const activeId = allIds.includes(chosenRoom) ? chosenRoom : allIds[0];
  // With several rooms, the days and times apply to ALL of them (a group booking) until one room is picked to differ.
  const forAll = allIds.length > 1 && !allIds.includes(chosenRoom);
  const activeExtra = forAll || f.roomIds.includes(activeId) ? null : f.extraStays.find((x) => x.roomIds[0] === activeId) ?? null;
  const activeStay = activeExtra ?? { checkIn: f.checkIn, checkOut: f.checkOut };
  // Each room has its own arrival and leaving time too; a further stay with none of its own uses the first stay's.
  const timeIn = activeExtra ? activeExtra.checkInTime ?? f.checkInTime : f.checkInTime;
  const timeOut = activeExtra ? activeExtra.checkOutTime ?? f.checkOutTime : f.checkOutTime;
  const numberOf = (id) => rooms.find((r) => r.id === id)?.number ?? '?';
  // The days of one room. A room that shared the first stay's days moves out into its own stay when its days change.
  const setRoomDates = (id, a, b) => {
    if (forAll) {
      f.setDates(a, b);
      return f.setExtraStays((list) => list.map((x) => ({ ...x, checkIn: a, checkOut: b })));
    }
    if (allIds.length === 0) return f.setDates(a, b); // no room chosen yet: these are just the days
    if (f.roomIds.includes(id)) {
      if (f.roomIds.length === 1) return f.setDates(a, b);
      if (a === f.checkIn && b === f.checkOut) return;
      f.setRoomIds((ids) => ids.filter((x) => x !== id));
      return f.setExtraStays((list) => [...list, { roomIds: [id], checkIn: a, checkOut: b, checkInTime: f.checkInTime, checkOutTime: f.checkOutTime }]);
    }
    f.setExtraStays((list) => list.map((x) => (x.roomIds[0] === id ? { ...x, checkIn: a, checkOut: b } : x)));
  };
  // The arrival or leaving time of one room: { checkInTime } or { checkOutTime }. Like the days, it moves the room out of
  // a shared stay when it differs.
  const setRoomTimes = (id, change) => {
    if (forAll) {
      if ('checkInTime' in change) f.setCheckInTime(change.checkInTime);
      else f.setCheckOutTime(change.checkOutTime);
      return f.setExtraStays((list) => list.map((x) => ({ ...x, ...change })));
    }
    if (allIds.length === 0) return 'checkInTime' in change ? f.setCheckInTime(change.checkInTime) : f.setCheckOutTime(change.checkOutTime);
    if (f.roomIds.includes(id)) {
      if (f.roomIds.length === 1) return 'checkInTime' in change ? f.setCheckInTime(change.checkInTime) : f.setCheckOutTime(change.checkOutTime);
      f.setRoomIds((ids) => ids.filter((x) => x !== id));
      return f.setExtraStays((list) => [...list, { roomIds: [id], checkIn: f.checkIn, checkOut: f.checkOut, checkInTime: f.checkInTime, checkOutTime: f.checkOutTime, ...change }]);
    }
    f.setExtraStays((list) => list.map((x) => (x.roomIds[0] === id ? { ...x, ...change } : x)));
  };
  // Tapping a room adds it (with the days of the room being edited) or takes it out of the booking.
  const toggleAny = (id) => {
    if (allIds.length === 0) {
      f.setRoomIds([id]);
      return setChosenRoom(id);
    }
    if (!allIds.includes(id)) {
      if (forAll || f.roomIds.includes(activeId)) f.setRoomIds((ids) => [...ids, id]);
      else f.setExtraStays((list) => [...list, { roomIds: [id], checkIn: activeStay.checkIn, checkOut: activeStay.checkOut }]);
      if (allIds.length === 1) setChosenRoom(null); // two rooms now: the days are for both
      return;
    }
    if (allIds.length === 1) return;
    if (f.roomIds.includes(id)) {
      if (f.roomIds.length > 1) f.setRoomIds((ids) => ids.filter((x) => x !== id));
      else {
        const [first, ...rest] = f.extraStays; // the first further stay becomes the main one
        f.setRoomIds(first.roomIds);
        f.setDates(first.checkIn, first.checkOut);
        f.setExtraStays(rest);
      }
    } else f.setExtraStays((list) => list.filter((x) => x.roomIds[0] !== id));
  };
  const busyFor = (id, from, to) => nightsIn({ checkIn: from, checkOut: to }).some((d) => rest.isBusy?.(id, d));
  const activeTaken = (id) => busyFor(id, activeStay.checkIn, activeStay.checkOut);
  const roomsOf = (ids) => ids.map((id) => rooms.find((r) => r.id === id)?.number).filter(Boolean).sort().join(', ');
  const extraRooms = f.extraStays.reduce((total, s) => total + s.roomIds.length, 0);

  // Confirm checks every step and jumps to the first one that is not filled in.
  const confirm = () => {
    if (guestProblem) { setHint(guestProblem); return setStep(0); }
    if (stayProblem || extraProblem) { setHint(stayProblem || extraProblem); return setStep(1); }
    setHint('');
    f.submit(false);
  };

  const tone = resolveColor(f.color) ?? resolveColor(guest?.color) ?? statusColor(f.status, settings);
  const roomNumbers = f.roomIds.map((id) => rooms.find((r) => r.id === id)?.number).filter(Boolean).sort();
  const times = [f.checkInTime && `in ${formatTime(f.checkInTime)}`, f.checkOutTime && `out ${formatTime(f.checkOutTime)}`].filter(Boolean);
  const guestName = guest?.name ?? (f.typedGuest.trim() || null);
  const ratePlan = RATE_PLANS.find(([v]) => v === f.ratePlan)?.[1] ?? f.ratePlan;
  // Ghost of this booking on the main calendar once the rooms and dates step has been reached.
  const previewKey = `${f.extraStays.map((s) => `${s.roomIds.join('.')}@${s.checkIn}@${s.checkOut}`).join(';')}#${f.roomIds.join(',')}|${f.checkIn}|${f.checkOut}|${f.checkInTime}|${f.checkOutTime}|${tone.border}|${guestName ?? ''}`;
  useEffect(() => {
    if (!onPreview) return;
    onPreview(reached >= 1 && f.nights >= 1 ? { stays: [{ roomIds: f.roomIds, checkIn: f.checkIn, checkOut: f.checkOut }, ...f.extraStays], roomIds: f.roomIds, checkIn: f.checkIn, checkOut: f.checkOut, checkInTime: f.checkInTime, checkOutTime: f.checkOutTime, tone, name: guestName } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reached, previewKey]);
  useEffect(() => () => onPreview?.(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalRooms = f.roomIds.length + extraRooms;
  const confirmLabel = f.isHold ? 'Place Hold' : totalRooms > 1 ? `Confirm ${totalRooms} Rooms` : 'Confirm Booking';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (step < 2) go(step + 1);
        else confirm();
      }}
      className="form-area flex flex-1 flex-col gap-6"
    >
      <StepList step={step} done={done} onGo={go} />

      <div>
        <h2 className="t-title">{ASKS[step].title}</h2>
        <p className="t-footnote mt-1">{ASKS[step].help}</p>
      </div>

      {hint && (guestProblem || stayProblem || extraProblem) ? <p key={hint} className="animate-shake flex items-center gap-2 rounded-lg bg-danger-soft px-4 py-3 text-base font-medium text-danger" role="alert"><WarningCircle size={20} weight="fill" className="shrink-0 text-danger" />{hint}</p> : null}

      {/* Step 1: the guest (and organization). */}
      <div className={`space-y-4 ${step === 0 ? 'animate-step' : 'hidden'}`}>
        <Card icon={User} title="Guest">
          <GuestPicker initial={f.initialGuest} onChange={f.setGuestChoice} onQuery={f.setTypedGuest} />
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
          {allIds.length > 1 && <p className="text-base text-muted">One adult per room to start: {allIds.length} rooms, {allIds.length} guests. Change it if more are coming.</p>}
        </Card>
        <Card icon={Palette} title="Colour on the calendar (optional)">
          <ColorPicker id="b-color-label" label="Colour" hideLabel color={f.color} onChange={f.setColor} />
        </Card>
      </div>

      {/* Step 2: rooms, dates and times. */}
      <div className={`space-y-4 ${step === 1 ? 'animate-step' : 'hidden'}`}>
        <Card icon={Bed} title={allIds.length > 1 ? `Rooms (${allIds.length} chosen)` : 'Room'}>
          <RoomPicker rooms={rooms} roomIds={allIds} roomTaken={activeTaken} onToggle={toggleAny} />
        </Card>
        <Card icon={CalendarBlank} title="Days">
          {allIds.length > 1 && (
            <div role="group" aria-label="Choose the room these days are for" className="space-y-1">
              <p className="text-base font-medium">Days for</p>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" aria-pressed={forAll} onClick={() => setChosenRoom('all')} className={`btn px-3 font-semibold ${forAll ? 'ring-2 ring-ink ring-offset-2' : ''}`}>
                  All rooms
                </button>
                {allIds.map((id) => {
                  const shade = roomShade({ number: numberOf(id) }, settings); // the room's floor colour, as on the calendar
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={!forAll && id === activeId}
                      onClick={() => setChosenRoom(id)}
                      className={`btn px-3 font-semibold ${!forAll && id === activeId ? 'ring-2 ring-ink ring-offset-2' : ''}`}
                      style={{ backgroundColor: shade.fill, borderColor: shade.edge }}
                    >
                      Room <span className="font-mono">{numberOf(id)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <DateRangePicker
            checkIn={activeStay.checkIn}
            checkOut={activeStay.checkOut}
            onChange={(a, b) => setRoomDates(activeId, a, b)}
            isBusy={(d) => (forAll ? allIds : [activeId]).some((id) => rest.isBusy?.(id, d))}
          />
        </Card>
        <div>
          {allIds.length > 1 && <p className="mb-1 text-base font-medium">{forAll ? 'Times for all rooms' : `Times for Room ${numberOf(activeId)}`}</p>}
          <MomentPair>
            <Moment icon={SignIn} tone="text-accent-text" label="Check-in" id="b-in" time={timeIn} onTime={(v) => setRoomTimes(activeId, { checkInTime: v })} />
            <Moment icon={SignOut} tone="text-danger" label="Check-out" id="b-out" time={timeOut} onTime={(v) => setRoomTimes(activeId, { checkOutTime: v })} />
          </MomentPair>
        </div>
        {f.nights >= 3 && (
          <Card icon={Suitcase} title="Going away for a few days?">
            {f.away ? (
              <>
                <p className="t-footnote">The room is kept for them. It is saved as two stays for the same guest.</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="away-from" className="label">They leave on</label>
                    <input id="away-from" type="date" className="field min-w-0 px-2 font-semibold" value={f.away.from} min={addDays(f.checkIn, 1)} max={addDays(f.checkOut, -2)} onChange={(e) => e.target.value && f.setAway({ from: e.target.value, to: f.away.to > e.target.value ? f.away.to : addDays(e.target.value, 1) })} />
                  </div>
                  <div>
                    <label htmlFor="away-to" className="label">They come back on</label>
                    <input id="away-to" type="date" className="field min-w-0 px-2 font-semibold" value={f.away.to} min={addDays(f.away.from, 1)} max={addDays(f.checkOut, -1)} onChange={(e) => e.target.value && f.setAway({ ...f.away, to: e.target.value })} />
                  </div>
                </div>
                <button type="button" className="btn w-full" onClick={() => f.setAway(null)}>
                  No Break
                </button>
              </>
            ) : (
              <button type="button" className="btn w-full" onClick={() => f.setAway({ from: addDays(f.checkIn, 1), to: addDays(f.checkIn, 2) })}>
                <Plus size={18} aria-hidden="true" /> Add a Break
              </button>
            )}
          </Card>
        )}
      </div>

      {/* Step 3: the box with everything to check, then the more options. */}
      <div className={`space-y-4 ${step === 2 ? 'animate-step' : 'hidden'}`}>
        <Card icon={Tag} title="Book it, or only hold the room?">
          <StatusPicker value={f.status} onChange={f.setStatus} hideLabel only={['confirmed', 'on_hold']} />
          <p className="t-footnote">
            <strong>Confirmed</strong> is a real booking. <strong>On hold</strong> keeps the room for now, until the guest is sure.
          </p>
        </Card>
        {f.isHold && (
          <div>
            <FieldLabel icon={Tag} htmlFor="b-label">Hold label (optional)</FieldLabel>
            <input id="b-label" name="label" className="field" placeholder="For example, Sharma wedding party…" value={f.label} onChange={(e) => f.setLabel(e.target.value)} autoComplete="off" />
          </div>
        )}
        <section aria-label="Booking summary" className="space-y-4 rounded-lg border p-4" style={{ backgroundColor: tone.bg, borderColor: tone.border }}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="t-title break-words">{guestName ?? 'No guest yet'}</h3>
              {(guest?.phone || guest?.email) && <p className="mt-0.5 break-words text-base text-muted">{[guest.phone, guest.email].filter(Boolean).join(', ')}</p>}
            </div>
            <StatusBadge status={f.status} />
          </div>

          <div>
            <h4 className="mb-2 text-[1.0625rem] font-semibold">Rooms and days</h4>
            <ul className="space-y-2">
              {allIds.map((id) => rooms.find((r) => r.id === id)?.number).filter(Boolean).sort().map((number) => {
                const own = f.extraStays.find((x) => x.roomIds[0] === rooms.find((r) => r.number === number)?.id);
                return (
                  <StayLine
                    key={number}
                    room={number}
                    checkIn={own?.checkIn ?? f.checkIn}
                    checkOut={own?.checkOut ?? f.checkOut}
                    inTime={own ? own.checkInTime ?? f.checkInTime : f.checkInTime}
                    outTime={own ? own.checkOutTime ?? f.checkOutTime : f.checkOutTime}
                  />
                );
              })}
            </ul>
            {f.away && <p className="mt-1.5 text-base">Away from <strong className="font-semibold">{fmtShort(f.away.from)}</strong>, back on <strong className="font-semibold">{fmtShort(f.away.to)}</strong> (saved as two stays)</p>}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-black/10 pt-3 text-base">
            <Fact label="Guests">
              {f.adults} {Number(f.adults) === 1 ? 'adult' : 'adults'}
              {Number(f.children) > 0 && <>, {f.children} {Number(f.children) === 1 ? 'child' : 'children'}</>}
            </Fact>
            <Fact label="Booked via">{f.channel}</Fact>
            <Fact label="Rate plan">{ratePlan}</Fact>
            {f.organization.trim() && <Fact label="Company or group">{f.organization.trim()}</Fact>}
            {f.notes.trim() && <div className="col-span-2"><Fact label="Notes">{f.notes.trim()}</Fact></div>}
          </dl>
        </section>

        <MoreOptions f={f} hideParty hideStatus hideColor />
      </div>

      {f.error && <p role="alert" className="animate-shake rounded-lg bg-danger-soft px-4 py-3 text-base font-medium text-danger">{f.error}</p>}

      <div className="sticky bottom-0 -mx-4 mt-auto flex gap-3 border-t border-line bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:pb-4">
        {step > 0 ? (
          <button type="button" className="btn btn-lg btn-quiet" onClick={() => go(step - 1)} disabled={f.busy}>
            Back
          </button>
        ) : (
          <button type="button" className="btn btn-lg btn-quiet" onClick={() => (onCancel ? onCancel() : onClear())} disabled={f.busy}>
            {onCancel ? 'Cancel' : 'Clear'}
          </button>
        )}
        {/* Different keys: with one shared button React would turn Next into a submit button mid-click and submit the form. */}
        {step < 2 ? (
          <button key="next" type="button" className="btn btn-lg btn-primary flex-1" onClick={() => go(step + 1)}>
            Next: {STEPS[step + 1]} <ArrowRight size={18} aria-hidden="true" />
          </button>
        ) : (
          <button key="confirm" type="submit" className="btn btn-lg btn-primary flex-1" disabled={f.busy}>
            {f.busy ? 'Saving…' : confirmLabel}
          </button>
        )}
      </div>
    </form>
  );
}
