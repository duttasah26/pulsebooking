import { api } from '../../lib/useApi';
import { addDays, diffDays } from '../../lib/dates';

/*
  Everything you can do to holds on the calendar. They all feel instant: the screen changes first, the server is told
  in the background, and a message with Undo appears at the same moment.
    placeHold       a drag or tap on free nights
    removeMany      the X on a hold, or Delete in the panel
    toggleRoom      click a room number to put another room on the open hold (or take it off)
  data: from useBookingData. panelState: { panel, setPanel, panelBooking, group, wide }. rooms: the room list.
*/
export function useHoldActions({ data, panelState, rooms, toast }) {
  const { bookings, isBusy, setExtra, forget, unforget, cancelledKeys } = data;
  const { panel, setPanel, panelBooking, group, wide } = panelState;

  // Remove bookings. They disappear the moment you click AND the message with Undo appears at the same moment; the
  // server is told in parallel. Undo waits for the server's answer so it knows whether to recreate a hold (the server
  // removes holds for good) or restore a booking (anything else is soft-deleted). If the server refuses, they come back.
  const removeMany = async (list) => {
    const real = list.filter((b) => b.id > 0);
    if (real.length === 0) return;
    real.forEach((b) => forget(b.id));
    setExtra((items) => items.filter((x) => !real.some((b) => b.id === x.id)));
    setPanel((p) => (p && real.some((b) => b.id === p.booking.id) ? null : p));

    const deleting = Promise.allSettled(real.map((b) => api(`/api/bookings/${b.id}`, { method: 'DELETE' })));
    toast({
      message: real.length > 1 ? `${real.length} bookings removed` : real[0].status === 'on_hold' ? 'Hold removed' : 'Booking removed',
      actionLabel: 'Undo',
      onAction: async () => {
        const settled = await deleting;
        const again = [];
        for (const [i, b] of real.entries()) {
          const r = settled[i];
          if (r.status === 'rejected') {
            unforget(b.id); // it was never deleted, so there is nothing to undo
          } else if (r.value.hold) {
            const [made] = await api('/api/bookings', {
              method: 'POST',
              body: {
                room_ids: [b.room_id], check_in: b.check_in, check_out: b.check_out, status: 'on_hold',
                group_id: b.group_id, color: b.color, label: b.label, organization: b.organization,
                check_in_time: b.check_in_time, check_out_time: b.check_out_time,
              },
            });
            again.push(made);
          } else if (!r.value.gone) {
            await api(`/api/bookings/${b.id}/restore`, { method: 'POST' });
            unforget(b.id);
          }
        }
        setExtra((items) => [...items, ...again]);
        bookings.reload();
      },
    });

    const settled = await deleting;
    const failed = real.filter((_, i) => settled[i].status === 'rejected');
    if (failed.length) {
      failed.forEach((b) => unforget(b.id));
      toast({ message: settled.find((r) => r.status === 'rejected').reason.message });
    } else {
      bookings.reload();
    }
  };

  const removeBooking = (b) => {
    if (b.id < 0) {
      // Still being saved: take it off the grid now, and delete it as soon as the server confirms it.
      cancelledKeys.current.add(b.clientKey);
      setExtra((items) => items.filter((x) => x.id !== b.id));
      setPanel((p) => (p && p.booking.id === b.id ? null : p));
      return;
    }
    return removeMany([b]);
  };

  // Place an on-hold booking. The hold, its message and its Undo all appear at once (with a stable key, so nothing
  // flickers when the server confirms); the save happens in the background. Undo works even before the server has
  // answered: the hold is taken off the screen now and deleted as soon as the server reports it was created.
  // opts.groupId / opts.copy add a room to an existing hold; opts.keepPanel leaves the open panel alone.
  const placeHold = async ({ roomIds, checkIn, checkOut }, opts = {}) => {
    const stamp = Date.now();
    const groupId = opts.groupId ?? crypto.randomUUID();
    const copy = opts.copy ?? {};
    const known = rooms ?? [];
    const temps = roomIds.map((roomId, i) => {
      const room = known.find((r) => r.id === roomId);
      return {
        id: -(stamp + i), clientKey: `tmp-${stamp}-${i}`, room_id: roomId, room_number: room?.number ?? '', room_color: room?.color ?? null,
        guest_id: null, name: copy.label || copy.organization || 'On hold', phone: null, email: null,
        check_in: checkIn, check_out: checkOut, nights: diffDays(checkIn, checkOut), status: 'on_hold', channel: 'Direct',
        rate_plan: 'EP', adults: 1, children: 0, notes: null, color: copy.color ?? null, organization: copy.organization ?? null,
        label: copy.label ?? null, group_id: groupId, check_in_time: copy.check_in_time ?? null, check_out_time: copy.check_out_time ?? null,
      };
    });
    const isTemp = (b) => temps.some((t) => t.id === b.id);
    const job = { created: [] }; // filled in when the server answers
    const message = roomIds.length > 1 ? `${roomIds.length} rooms on hold` : 'Room on hold';
    const ownsPanel = (p) => p && (temps.some((t) => t.clientKey === p.key) || job.created.some((c) => c.id === p.booking.id));

    setExtra((list) => [...list, ...temps]);
    // Wide screens: open the panel right away on the temporary hold (in the form, so a name can be typed at once);
    // Save waits until the server has confirmed it.
    if (!opts.keepPanel && wide) setPanel({ booking: temps[0], key: temps[0].clientKey, editing: true });

    const undo = async () => {
      temps.forEach((t) => cancelledKeys.current.add(t.clientKey)); // the answer handler below deletes what the server made
      setExtra((list) => list.filter((b) => !isTemp(b) && !job.created.some((c) => c.id === b.id)));
      job.created.forEach((b) => forget(b.id));
      setPanel((p) => (ownsPanel(p) ? null : p));
      if (job.created.length) {
        await Promise.all(job.created.map((b) => api(`/api/bookings/${b.id}`, { method: 'DELETE' })));
        bookings.reload();
      }
    };
    // Narrow screens: no pop-up over the calendar; the message offers the details form instead (tap the hold any time).
    if (!opts.keepPanel && !wide) {
      toast({
        message,
        actionLabel: 'Add Details',
        onAction: () => setPanel({ booking: job.created[0] ?? temps[0], key: temps[0].clientKey, editing: true }),
      });
    } else {
      toast({ message, actionLabel: 'Undo', onAction: undo });
    }

    try {
      const created = await api('/api/bookings', {
        method: 'POST',
        body: {
          room_ids: roomIds, check_in: checkIn, check_out: checkOut, status: 'on_hold', group_id: groupId,
          color: copy.color ?? null, label: copy.label ?? null, organization: copy.organization ?? null,
          check_in_time: copy.check_in_time ?? null, check_out_time: copy.check_out_time ?? null,
        },
      });
      job.created = created;
      // Holds the user already removed (or undid) while they were saving are deleted straight away.
      const dropped = created.filter((_, i) => cancelledKeys.current.has(temps[i]?.clientKey));
      if (dropped.length) await Promise.all(dropped.map((b) => api(`/api/bookings/${b.id}`, { method: 'DELETE' })));
      // Same key as the temporary row, so React keeps the same element: no re-animation, no flash.
      const real = created
        .map((b, i) => ({ ...b, clientKey: temps[i]?.clientKey }))
        .filter((b) => !cancelledKeys.current.has(b.clientKey));
      setExtra((list) => [...list.filter((b) => !isTemp(b)), ...real]);
      if (real.length > 0) setPanel((p) => (p && p.key === temps[0].clientKey ? { ...p, booking: real[0] } : p));
      bookings.reload();
    } catch (err) {
      setExtra((list) => list.filter((b) => !isTemp(b)));
      setPanel((p) => (ownsPanel(p) ? null : p));
      toast({ message: err.message });
    }
  };

  // Click a room number while a hold is open: put that room on the same hold, or take it off.
  const toggleRoom = async (roomId) => {
    if (!panelBooking || panelBooking.status !== 'on_hold' || !group) return;
    const existing = group.find((b) => b.room_id === roomId);
    if (existing) {
      if (group.length > 1) removeBooking(existing);
      return;
    }
    const number = (rooms ?? []).find((r) => r.id === roomId)?.number;
    for (let d = panelBooking.check_in; d < panelBooking.check_out; d = addDays(d, 1)) {
      if (isBusy(roomId, d)) return toast({ message: `Room ${number} is already booked on those dates`, duration: 3000 });
    }
    let groupId = panelBooking.group_id;
    if (!groupId) {
      // an older hold with no group yet: give it one so the rooms stay together
      groupId = crypto.randomUUID();
      try {
        await api(`/api/bookings/${panelBooking.id}`, { method: 'PATCH', body: { group_id: groupId } });
      } catch (err) {
        return toast({ message: err.message });
      }
    }
    placeHold(
      { roomIds: [roomId], checkIn: panelBooking.check_in, checkOut: panelBooking.check_out },
      { groupId, keepPanel: true, copy: panelBooking },
    );
  };

  return { placeHold, removeMany, removeBooking, toggleRoom };
}
