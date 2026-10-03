import { useEffect, useRef, useState } from 'react';
import { ArrowUUpLeft, CaretDown, Check, Clock, Trash } from '@phosphor-icons/react';
import Sheet from './Sheet';
import GuestPicker from './GuestPicker';
import DateRangePicker from './DateRangePicker';
import TimeSelect from './TimeSelect';
import { useToast } from './Toast';
import { api, useApi } from '../lib/useApi';
import { COLORS, isCustomColor, resolveColor } from '../lib/colors';
import { DEFAULT_CHECK_IN_TIME, DEFAULT_CHECK_OUT_TIME } from '../lib/defaults';
import { STATUS_OPTIONS } from '../lib/status';
import { addDays, diffDays, fmtDateTime } from '../lib/dates';

const CHANNELS = ['Direct', 'Phone', 'Email', 'Website', 'Walk-in', 'Agent'];
const RATE_PLANS = [
  ['EP', 'EP, room only'],
  ['CP', 'CP, with breakfast'],
  ['MAP', 'MAP, breakfast and one meal'],
  ['AP', 'AP, all meals'],
];
const ACTION = { insert: 'Created', update: 'Edited', delete: 'Deleted', restore: 'Restored' };
const NEVER_BUSY = () => false;

/*
  The booking form. The essentials are always visible (guest, organization, rooms, dates, times);
  everything else sits under "More options" so the form fits on screen without scrolling.
    create: mode="create", defaults = { roomIds, checkIn, checkOut, color?, guest? }. Several rooms can be booked at once.
    edit:   mode="edit", booking = a row from /api/bookings.
  isBusy(roomId, date, ignoreBookingId) says whether a room is taken that night, so taken rooms and nights are greyed out.
  onSaved(message?) refreshes the caller's data. onDone() closes the sheet or resets the side panel.
  onPreview(draft) lets the calendar draw the booking while it is being filled in.
  group: for a hold made of several rooms, all of its bookings. Saving applies to every room; deleting removes them all.
*/
export function BookingForm({
  mode, booking, defaults, rooms, isBusy = NEVER_BUSY, onSaved, onDone, onCancel, onPreview,
  roomIds: controlledRoomIds, onRoomIdsChange, group,
}) {
  const toast = useToast();
  const edit = mode === 'edit';

  // Rooms are controlled by the calendar page when it passes roomIds (so clicking a room header on the grid adds it).
  const [ownRoomIds, setOwnRoomIds] = useState(edit ? [booking.room_id] : defaults.roomIds);
  const roomIds = controlledRoomIds ?? ownRoomIds;
  const setRoomIds = (next) => {
    const value = typeof next === 'function' ? next(roomIds) : next;
    if (onRoomIdsChange) onRoomIdsChange(value);
    else setOwnRoomIds(value);
  };
  const [checkIn, setCheckIn] = useState(edit ? booking.check_in : defaults.checkIn);
  const [checkOut, setCheckOut] = useState(edit ? booking.check_out : defaults.checkOut);
  const [checkInTime, setCheckInTime] = useState(edit ? booking.check_in_time ?? '' : DEFAULT_CHECK_IN_TIME);
  const [checkOutTime, setCheckOutTime] = useState(edit ? booking.check_out_time ?? '' : DEFAULT_CHECK_OUT_TIME);
  const [status, setStatus] = useState(edit ? booking.status : 'confirmed');
  const [channel, setChannel] = useState(edit ? booking.channel : 'Direct');
  const [ratePlan, setRatePlan] = useState(edit ? booking.rate_plan : 'EP');
  const [adults, setAdults] = useState(edit ? booking.adults : 1);
  const [children, setChildren] = useState(edit ? booking.children : 0);
  const [notes, setNotes] = useState(edit ? booking.notes ?? '' : '');
  const [color, setColor] = useState(edit ? booking.color ?? null : defaults.color ?? null); // palette key, #hex, or null = automatic
  const [organization, setOrganization] = useState(edit ? booking.organization ?? '' : '');
  const [label, setLabel] = useState(edit ? booking.label ?? '' : '');
  const [guestChoice, setGuestChoice] = useState(null);
  const [typedGuest, setTypedGuest] = useState(''); // text typed in the guest box, used as a hold label if no guest is picked
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const orgTouched = useRef(edit);

  const initialGuest = edit && booking.guest_id
    ? { id: booking.guest_id, name: booking.name, phone: booking.phone, email: booking.email }
    : defaults?.guest ?? null;

  const nights = checkIn && checkOut ? diffDays(checkIn, checkOut) : 0;
  const targets = edit && group && group.length > 1 ? group : edit ? [booking] : [];
  const ignoreId = edit ? booking.id : null;
  const history = useApi(edit ? `/api/bookings/${booking.id}` : null).data?.history ?? [];

  // Show the booking on the calendar grid while it is being filled in.
  useEffect(() => {
    if (onPreview && nights >= 1) onPreview({ roomIds, checkIn, checkOut, color });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomIds, checkIn, checkOut, color, nights]);

  // A guest's usual organization fills the field until it is edited by hand.
  const guestOrg = guestChoice?.guest?.organization ?? guestChoice?.newGuest?.organization;
  useEffect(() => {
    if (!orgTouched.current && guestOrg) setOrganization(guestOrg);
  }, [guestOrg]);

  const nightBusy = (date) => roomIds.some((id) => isBusy(id, date, ignoreId));
  const roomTaken = (id) => {
    for (let d = checkIn; d < checkOut; d = addDays(d, 1)) if (isBusy(id, d, ignoreId)) return true;
    return false;
  };
  const toggleRoom = (id) =>
    setRoomIds((ids) => (ids.includes(id) ? (ids.length > 1 ? ids.filter((x) => x !== id) : ids) : [...ids, id]));

  const submit = async (asHold) => {
    setError('');
    if (roomIds.length === 0) return setError('Choose at least one room.');
    if (nights < 1) return setError('Check-out must be after check-in.');
    const finalStatus = asHold ? 'on_hold' : status;
    if (finalStatus !== 'on_hold' && !guestChoice) {
      return setError('Choose a guest, or add a new one (a name is enough). Use Hold to reserve without details.');
    }

    setBusy(true);
    try {
      // A hold shows a name on the calendar: the label you typed, else the organization, else the guest text.
      const holdLabel = label.trim() || organization.trim() || guestChoice?.newGuest?.name || typedGuest.trim() || null;
      const common = {
        check_in: checkIn, check_out: checkOut, status: finalStatus, channel, rate_plan: ratePlan,
        check_in_time: checkInTime || null, check_out_time: checkOutTime || null,
        adults: Number(adults), children: Number(children), notes: notes.trim() || null, color,
        organization: organization.trim() || null,
        label: finalStatus === 'on_hold' ? holdLabel : label.trim() || null,
      };
      if (edit) {
        let guestId = guestChoice?.guestId;
        if (guestChoice?.newGuest) guestId = (await api('/api/guests', { method: 'POST', body: guestChoice.newGuest })).id;
        await Promise.all(
          targets.map((t) =>
            api(`/api/bookings/${t.id}`, {
              method: 'PATCH',
              body: { ...common, ...(targets.length === 1 ? { room_id: roomIds[0] } : {}), ...(guestId ? { guest_id: guestId } : {}) },
            }),
          ),
        );
        onSaved(booking.status === 'on_hold' && finalStatus !== 'on_hold' ? 'Booking confirmed' : isHoldEdit ? 'Hold updated' : 'Booking updated');
      } else {
        const guestPart = guestChoice?.guestId
          ? { guest_id: guestChoice.guestId }
          : guestChoice?.newGuest ? { guest: guestChoice.newGuest } : {};
        await api('/api/bookings', { method: 'POST', body: { ...common, ...guestPart, room_ids: roomIds } });
        onSaved(finalStatus === 'on_hold' ? 'Hold placed' : roomIds.length > 1 ? `${roomIds.length} rooms booked` : 'Booking created');
      }
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await Promise.all(targets.map((t) => api(`/api/bookings/${t.id}`, { method: 'DELETE' })));
      onSaved();
      onDone();
      // A hold is removed for good, so only a normal booking can be restored.
      if (booking.status === 'on_hold') return toast({ message: targets.length > 1 ? 'Holds removed' : 'Hold removed', duration: 3000 });
      toast({
        message: 'Booking deleted',
        actionLabel: 'Undo',
        onAction: async () => {
          try {
            await api(`/api/bookings/${booking.id}/restore`, { method: 'POST' });
            onSaved('Booking restored');
          } catch (err) {
            toast({ message: `Could not restore: ${err.message}` });
          }
        },
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const isHold = status === 'on_hold';
  const isHoldEdit = edit && booking.status === 'on_hold';
  const custom = isCustomColor(color);

  // Rooms grouped by floor (the first digit of the number): one row of chips per floor.
  const floors = [
    ...rooms
      .reduce((map, r) => {
        const floor = String(r.number)[0];
        return map.set(floor, [...(map.get(floor) ?? []), r]);
      }, new Map())
      .entries(),
  ];


  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(false); }} className="space-y-4 lg:space-y-3">
      {isHold && (
        <p className="flex items-start gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
          <Clock size={18} className="mt-0.5 shrink-0" />
          On hold keeps the room blocked. Add the guest later to confirm it.
        </p>
      )}

      <GuestPicker initial={initialGuest} onChange={setGuestChoice} onQuery={setTypedGuest} />

      {isHold && (
        <div>
          <label className="label" htmlFor="b-label">Hold label (optional)</label>
          <input id="b-label" className="field" placeholder="For example: Sharma wedding party" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
      )}

      <div>
        <label className="label" htmlFor="b-org">Organization (optional)</label>
        <input
          id="b-org"
          className="field"
          value={organization}
          onChange={(e) => { orgTouched.current = true; setOrganization(e.target.value); }}
          autoComplete="off"
        />
      </div>

      {edit ? (
        <div className="grid grid-cols-2 gap-3">
          <div className={targets.length > 1 ? 'hidden' : ''}>
            <label className="label" htmlFor="b-room">Room</label>
            <select id="b-room" className="field" value={roomIds[0]} onChange={(e) => setRoomIds([Number(e.target.value)])}>
              {rooms.map((r) => <option key={r.id} value={r.id}>Room {r.number}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="b-status">Status</label>
            <select id="b-status" className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {targets.length > 1 ? (
            <p className="col-span-2 -mt-1 text-sm text-muted">
              Rooms {targets.map((t) => t.room_number).join(', ')}. Changes apply to all of them. Click a room number on the calendar to add or remove a room.
            </p>
          ) : isHoldEdit ? (
            <p className="col-span-2 -mt-1 text-sm text-muted">Click another room number on the calendar to hold that room too.</p>
          ) : booking.group_id ? (
            <p className="col-span-2 -mt-1 text-sm text-muted">Booked together with other rooms. Changes here apply to this room only.</p>
          ) : null}
        </div>
      ) : (
        <fieldset>
          <legend className="label">
            Rooms {roomIds.length > 1 && <span className="font-normal text-muted">({roomIds.length} selected)</span>}
          </legend>
          <div className="space-y-1.5">
            {floors.map(([floor, list]) => (
              <div key={floor} className="flex flex-wrap gap-1.5">
                {list.map((r) => {
                  const on = roomIds.includes(r.id);
                  const taken = roomTaken(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      aria-pressed={on}
                      disabled={taken && !on}
                      title={taken ? 'Booked on these dates' : `Room ${r.number}`}
                      onClick={() => toggleRoom(r.id)}
                      className={`btn gap-1.5 px-2.5 font-mono lg:min-h-7 lg:px-2 lg:text-xs ${on ? 'border-accent bg-accent text-accent-ink hover:bg-accent' : ''} ${taken && !on ? 'hatch' : ''}`}
                    >
                      <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full border border-black/20" style={{ backgroundColor: resolveColor(r.color)?.border ?? 'transparent' }} />
                      {on && <Check size={14} weight="bold" />}
                      {r.number}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </fieldset>
      )}

      <div>
        <span className="sr-only">Dates</span>
        <DateRangePicker
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(a, b) => { setCheckIn(a); setCheckOut(b); }}
          isBusy={nightBusy}
        />
        <div className="mt-2 grid grid-cols-2 gap-3">
          <TimeSelect id="b-in-time" label="Check-in time" value={checkInTime} onChange={setCheckInTime} />
          <TimeSelect id="b-out-time" label="Check-out time" value={checkOutTime} onChange={setCheckOutTime} />
        </div>
      </div>

      <details className="group rounded-lg border border-line">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium lg:min-h-9">
          More options
          <CaretDown size={16} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 border-t border-line p-3">
          <div className="grid grid-cols-2 gap-3">
            {!edit && (
              <div className="col-span-2">
                <label className="label" htmlFor="b-status">Status</label>
                <select id="b-status" className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label" htmlFor="b-adults">Adults</label>
              <input id="b-adults" type="number" inputMode="numeric" min="1" className="field" value={adults} onChange={(e) => setAdults(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="b-children">Children</label>
              <input id="b-children" type="number" inputMode="numeric" min="0" className="field" value={children} onChange={(e) => setChildren(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="b-channel">Booked via</label>
              <select id="b-channel" className="field" value={channel} onChange={(e) => setChannel(e.target.value)}>
                {[...new Set([...CHANNELS, channel])].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="b-rate">Rate plan</label>
              <select id="b-rate" className="field" value={ratePlan} onChange={(e) => setRatePlan(e.target.value)}>
                {RATE_PLANS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <span className="label" id="color-label">Colour</span>
            <div role="group" aria-labelledby="color-label" className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={color === null} onClick={() => setColor(null)} className={`btn px-3 ${color === null ? 'border-ink' : ''}`}>
                Auto
              </button>
              {COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  aria-label={c.name}
                  title={c.name}
                  aria-pressed={color === c.key}
                  onClick={() => setColor(c.key)}
                  className={`cell flex size-10 items-center justify-center rounded-lg border-2 transition-transform active:scale-95 lg:size-7 ${color === c.key ? 'border-ink' : ''}`}
                  style={{ backgroundColor: c.bg, borderColor: color === c.key ? undefined : c.border }}
                >
                  {color === c.key && <Check size={16} weight="bold" />}
                </button>
              ))}
              {/* Any colour you like: the native colour picker sits invisibly over this swatch. */}
              <label
                title="Pick any colour"
                className={`cell relative flex size-10 cursor-pointer items-center justify-center rounded-lg border-2 transition-transform active:scale-95 focus-within:outline-2 focus-within:outline-accent lg:size-7 ${custom ? 'border-ink' : 'border-line'}`}
                style={{
                  background: custom
                    ? `color-mix(in srgb, ${color} 28%, white)`
                    : 'conic-gradient(from 0deg, #f87171, #fbbf24, #4ade80, #22d3ee, #818cf8, #e879f9, #f87171)',
                }}
              >
                {custom && <Check size={16} weight="bold" />}
                <span className="sr-only">Custom colour</span>
                <input
                  type="color"
                  aria-label="Custom colour"
                  value={custom ? color : '#8b9bd6'}
                  onChange={(e) => setColor(e.target.value.toLowerCase())}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </label>
            </div>
            <p className="mt-1.5 text-sm text-muted">Auto gives each guest their own colour. The last swatch picks any colour.</p>
          </div>

          <div>
            <label className="label" htmlFor="b-notes">Notes</label>
            <textarea id="b-notes" rows={2} className="field" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {edit && history.length > 0 && (
            <div>
              <span className="label flex items-center gap-1.5">
                <ArrowUUpLeft size={16} /> History ({history.length})
              </span>
              <ul className="divide-y divide-line rounded-lg border border-line text-sm">
                {history.map((h) => (
                  <li key={h.id} className="flex justify-between gap-3 px-3 py-1.5">
                    <span>{ACTION[h.action] ?? h.action}{h.changed_by ? ` by ${h.changed_by}` : ''}</span>
                    <span className="shrink-0 text-muted">{fmtDateTime(h.changed_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>

      {error && <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-line bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:pb-3">
        {edit && (
          <button type="button" className="btn btn-danger btn-icon" onClick={remove} disabled={busy} aria-label="Delete booking">
            <Trash size={18} />
          </button>
        )}
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
        )}
        {!edit && (
          <button type="button" className="btn" onClick={() => submit(true)} disabled={busy}>
            <Clock size={18} /> Hold
          </button>
        )}
        <button type="submit" className="btn btn-primary flex-1" disabled={busy}>
          {busy ? 'Saving...' : edit ? 'Save changes' : roomIds.length > 1 ? `Book ${roomIds.length} rooms` : 'Create booking'}
        </button>
      </div>
    </form>
  );
}

// Modal version for phones and the Bookings / Guests tabs.
export default function BookingSheet({ onClose, ...props }) {
  return (
    <Sheet title={props.mode === 'edit' ? 'Edit booking' : 'New booking'} onClose={onClose}>
      <BookingForm {...props} onDone={onClose} onCancel={onClose} />
    </Sheet>
  );
}
