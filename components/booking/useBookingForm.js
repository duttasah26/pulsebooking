import { useEffect, useRef, useState } from 'react';
import { useRemoveBooking } from './useRemoveBooking';
import { api } from '../../lib/useApi';
import { useSettings } from '../SettingsProvider';
import { shareOut } from '../../lib/party';
import { addDays, diffDays } from '../../lib/dates';

const NEVER_BUSY = () => false;

/*
  All the state and actions behind the booking form (the form components only draw it).
    create: mode="create", defaults = { roomIds, checkIn, checkOut, color?, guest? }. Several rooms can be booked at once.
    edit:   mode="edit", booking = a row from /api/bookings.
  isBusy(roomId, date, ignoreBookingId) says whether a room is taken that night, so taken rooms and nights are greyed out.
  onSaved(message?, entry?) refreshes the caller's data; entry ({ label, undo, redo }) is the saved change, for the page's Undo. onDone() runs after a save; onRemoved() after a delete (defaults to onDone).
  group: for a hold made of several rooms, all of its bookings. Saving applies to every room; deleting removes them all.
  onRemove(bookings): the page removes the bookings itself, instantly, and handles Undo.
  roomIds / onRoomIdsChange: the page may own the room list (so clicking a room header on the grid adds it).
*/
export function useBookingForm({
  mode, booking, defaults, isBusy = NEVER_BUSY, onSaved, onDone, onRemoved, onPreview,
  roomIds: controlledRoomIds, onRoomIdsChange, group, onRemove,
}) {
  const edit = mode === 'edit';
  const { settings } = useSettings();

  const [ownRoomIds, setOwnRoomIds] = useState(edit ? [booking.room_id] : defaults.roomIds);
  const roomIds = controlledRoomIds ?? ownRoomIds;
  const setRoomIds = (next) => {
    const value = typeof next === 'function' ? next(roomIds) : next;
    if (onRoomIdsChange) onRoomIdsChange(value);
    else setOwnRoomIds(value);
  };

  const [checkIn, setCheckIn] = useState(edit ? booking.check_in : defaults.checkIn);
  const [checkOut, setCheckOut] = useState(edit ? booking.check_out : defaults.checkOut);
  const [checkInTime, setCheckInTime] = useState(edit ? booking.check_in_time ?? '' : settings.checkInTime);
  const [checkOutTime, setCheckOutTime] = useState(edit ? booking.check_out_time ?? '' : settings.checkOutTime);
  const [status, setStatus] = useState(edit ? booking.status : 'confirmed');
  const [channel, setChannel] = useState(edit ? booking.channel : 'Direct');
  const [ratePlan, setRatePlan] = useState(edit ? booking.rate_plan : 'EP');
  // Editing rooms booked together shows their total guests; saving shares the total out over the rooms again.
  const together = edit && group && group.length > 1;
  const sumOf = (key) => (together ? group.reduce((total, x) => total + (x[key] ?? 0), 0) : booking[key]);
  const [adults, setAdults] = useState(edit ? sumOf('adults') : 1);
  const [children, setChildren] = useState(edit ? sumOf('children') : 0);
  const [notes, setNotes] = useState(edit ? booking.notes ?? '' : '');
  const [color, setColor] = useState(edit ? booking.color ?? null : defaults.color ?? null); // palette key, #hex, or null = automatic
  const [organization, setOrganization] = useState(edit ? booking.organization ?? '' : '');
  const [label, setLabel] = useState(edit ? booking.label ?? '' : '');
  const [guestChoice, setGuestChoice] = useState(null);
  const [typedGuest, setTypedGuest] = useState(''); // text typed in the guest box, used as a hold label if no guest is picked
  // A break in the stay (new bookings only): the guest leaves on `from` and comes back on `to`, so it is saved as two stays.
  const [away, setAway] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const orgTouched = useRef(edit);
  const timesTouched = useRef(edit);
  const adultsTouched = useRef(edit);

  // The saved default times can arrive after a blank form is already showing: follow them until a time is picked by hand.
  useEffect(() => {
    if (timesTouched.current) return;
    setCheckInTime(settings.checkInTime);
    setCheckOutTime(settings.checkOutTime);
  }, [settings.checkInTime, settings.checkOutTime]);

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

  // A new booking starts with one adult per room (4 rooms, 4 adults) until the number is typed in by hand.
  useEffect(() => {
    if (!adultsTouched.current) setAdults(Math.max(1, roomIds.length));
  }, [roomIds.length]);

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
    if (away && !(away.from > checkIn && away.to > away.from && away.to < checkOut)) {
      return setError('The break must start after check-in and end before check-out, and the guest must be away at least one night.');
    }
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
        const adultsPer = shareOut(adults, targets.length, 1);
        const childrenPer = shareOut(children, targets.length, 0);
        const bodies = targets.map((t, i) => ({
          ...common,
          ...(targets.length === 1 ? { room_id: roomIds[0] } : { adults: adultsPer[i], children: childrenPer[i] }),
          ...(guestId ? { guest_id: guestId } : {}),
        }));
        // What each room was before, for Undo (only the fields this form can change).
        const before = targets.map((t) => ({
          check_in: t.check_in, check_out: t.check_out, status: t.status, channel: t.channel, rate_plan: t.rate_plan,
          check_in_time: t.check_in_time ?? null, check_out_time: t.check_out_time ?? null, adults: t.adults, children: t.children,
          notes: t.notes ?? null, color: t.color ?? null, organization: t.organization ?? null, label: t.label ?? null,
          room_id: t.room_id, ...(t.guest_id && guestId ? { guest_id: t.guest_id } : {}),
        }));
        const send = (list) => Promise.all(targets.map((t, i) => api(`/api/bookings/${t.id}`, { method: 'PATCH', body: list[i] })));
        await send(bodies);
        const entry = {
          label: 'Booking edited',
          undo: async () => { await send(before); onSaved(); },
          redo: async () => { await send(bodies); onSaved(); },
        };
        onSaved(booking.status === 'on_hold' && finalStatus !== 'on_hold' ? 'Booking confirmed' : isHoldEdit ? 'Hold updated' : 'Booking updated', entry);
      } else {
        const guestPart = guestChoice?.guestId
          ? { guest_id: guestChoice.guestId }
          : guestChoice?.newGuest ? { guest: guestChoice.newGuest } : {};
        const postBody = { ...common, ...guestPart, room_ids: roomIds };
        // With a break there are two stays for the same guest and rooms: check-in to the day they leave, and the day they come back to check-out.
        const first = away ? { ...postBody, check_out: away.from } : postBody;
        let made = await api('/api/bookings', { method: 'POST', body: first });
        let secondBody = null;
        if (away) {
          const guestId = made[0]?.guest_id;
          const { guest: _newGuest, ...rest } = postBody;
          secondBody = { ...rest, ...(guestId ? { guest_id: guestId } : {}), check_in: away.to };
          try {
            made = [...made, ...(await api('/api/bookings', { method: 'POST', body: secondBody }))];
          } catch (err) {
            await Promise.all(made.map((m) => api(`/api/bookings/${m.id}`, { method: 'DELETE' }))); // all or nothing
            throw err;
          }
        }
        const knownGuest = made[0]?.guest_id ?? null;
        const entry = {
          label: finalStatus === 'on_hold' ? 'Hold placed' : 'Booking created',
          undo: async () => { await Promise.all(made.map((m) => api(`/api/bookings/${m.id}`, { method: 'DELETE' }))); onSaved(); },
          redo: async () => {
            // The guest made the first time is reused, not created again.
            const { guest: _g, ...firstRest } = first;
            const again = { ...firstRest, ...(knownGuest ? { guest_id: knownGuest } : { guest: first.guest }) };
            made = await api('/api/bookings', { method: 'POST', body: again });
            if (secondBody) made = [...made, ...(await api('/api/bookings', { method: 'POST', body: { ...secondBody, guest_id: made[0]?.guest_id ?? secondBody.guest_id } }))];
            onSaved();
          },
        };
        onSaved(away ? 'Booking created in two parts' : finalStatus === 'on_hold' ? 'Hold placed' : roomIds.length > 1 ? `${roomIds.length} rooms booked` : 'Booking created', entry);
      }
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return {
    edit, booking, targets, unconfirmed, isHold, isHoldEdit, initialGuest, error: error || removeError, busy: busy || removing,
    roomIds, setRoomIds, toggleRoom, roomTaken, nightBusy,
    checkIn, checkOut, nights, setDates: (a, b) => { setCheckIn(a); setCheckOut(b); },
    setAdults: (v) => { adultsTouched.current = true; setAdults(v); },
    checkInTime, checkOutTime,
    setCheckInTime: (v) => { timesTouched.current = true; setCheckInTime(v); },
    setCheckOutTime: (v) => { timesTouched.current = true; setCheckOutTime(v); },
    status, setStatus, channel, setChannel, ratePlan, setRatePlan, adults, children, setChildren,
    notes, setNotes, color, setColor, organization, editOrganization, label, setLabel,
    away, setAway, guestChoice, setGuestChoice, typedGuest, setTypedGuest, submit, remove,
  };
}
