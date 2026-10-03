import { useEffect, useRef, useState } from 'react';
import { useRemoveBooking } from './useRemoveBooking';
import { api, useApi } from '../../lib/useApi';
import { DEFAULT_CHECK_IN_TIME, DEFAULT_CHECK_OUT_TIME } from '../../lib/defaults';
import { addDays, diffDays } from '../../lib/dates';

const NEVER_BUSY = () => false;

/*
  All the state and actions behind the booking form (the form components only draw it).
    create: mode="create", defaults = { roomIds, checkIn, checkOut, color?, guest? }. Several rooms can be booked at once.
    edit:   mode="edit", booking = a row from /api/bookings.
  isBusy(roomId, date, ignoreBookingId) says whether a room is taken that night, so taken rooms and nights are greyed out.
  onSaved(message?) refreshes the caller's data. onDone() runs after a save; onRemoved() after a delete (defaults to onDone).
  group: for a hold made of several rooms, all of its bookings. Saving applies to every room; deleting removes them all.
  onRemove(bookings): the page removes the bookings itself, instantly, and handles Undo.
  roomIds / onRoomIdsChange: the page may own the room list (so clicking a room header on the grid adds it).
*/
export function useBookingForm({
  mode, booking, defaults, isBusy = NEVER_BUSY, onSaved, onDone, onRemoved, onPreview,
  roomIds: controlledRoomIds, onRoomIdsChange, group, onRemove,
}) {
  const edit = mode === 'edit';

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
  // A hold that the server has not confirmed yet has a temporary (negative) id: it cannot be saved or deleted yet.
  const unconfirmed = edit && targets.some((t) => t.id < 0);
  const isHold = status === 'on_hold';
  const isHoldEdit = edit && booking.status === 'on_hold';
  const ignoreId = edit ? booking.id : null;
  const history = useApi(edit && booking.id > 0 ? `/api/bookings/${booking.id}` : null).data?.history ?? [];
  const { remove, removing, removeError } = useRemoveBooking({ booking, targets, onRemove, onSaved, onDone: onRemoved ?? onDone });

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
  const editOrganization = (value) => {
    orgTouched.current = true;
    setOrganization(value);
  };

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

  return {
    edit, booking, targets, unconfirmed, isHold, isHoldEdit, initialGuest, history, error: error || removeError, busy: busy || removing,
    roomIds, setRoomIds, toggleRoom, roomTaken, nightBusy,
    checkIn, checkOut, setDates: (a, b) => { setCheckIn(a); setCheckOut(b); },
    checkInTime, setCheckInTime, checkOutTime, setCheckOutTime,
    status, setStatus, channel, setChannel, ratePlan, setRatePlan, adults, setAdults, children, setChildren,
    notes, setNotes, color, setColor, organization, editOrganization, label, setLabel,
    setGuestChoice, setTypedGuest, submit, remove,
  };
}
