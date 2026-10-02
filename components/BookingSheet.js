import { useEffect, useState } from 'react';
import { ArrowUUpLeft, Check, Trash } from '@phosphor-icons/react';
import Sheet from './Sheet';
import GuestPicker from './GuestPicker';
import { useToast } from './Toast';
import { api, useApi } from '../lib/useApi';
import { COLORS } from '../lib/colors';
import { diffDays, fmtDateTime, nightsLabel } from '../lib/dates';

const STATUSES = [
  ['confirmed', 'Confirmed'],
  ['checked_in', 'Checked in'],
  ['checked_out', 'Checked out'],
  ['cancelled', 'Cancelled'],
];
const CHANNELS = ['Direct', 'Phone', 'Email', 'Website', 'Walk-in', 'Agent'];
const RATE_PLANS = [
  ['EP', 'EP, room only'],
  ['CP', 'CP, with breakfast'],
  ['MAP', 'MAP, breakfast and one meal'],
  ['AP', 'AP, all meals'],
];
const ACTION = { insert: 'Created', update: 'Edited', delete: 'Deleted', restore: 'Restored' };

/*
  The booking form. Create (mode="create", defaults = { roomId, checkIn, checkOut, guest? }) or
  edit (mode="edit", booking = row from /api/bookings).
  onSaved(message?) refreshes the caller's data. onDone() closes the sheet or resets the side panel.
*/
export function BookingForm({ mode, booking, defaults, rooms, onSaved, onDone, onCancel, onPreview }) {
  const toast = useToast();
  const edit = mode === 'edit';

  const [roomId, setRoomId] = useState(String(edit ? booking.room_id : defaults.roomId));
  const [checkIn, setCheckIn] = useState(edit ? booking.check_in : defaults.checkIn);
  const [checkOut, setCheckOut] = useState(edit ? booking.check_out : defaults.checkOut);
  const [status, setStatus] = useState(edit ? booking.status : 'confirmed');
  const [channel, setChannel] = useState(edit ? booking.channel : 'Direct');
  const [ratePlan, setRatePlan] = useState(edit ? booking.rate_plan : 'EP');
  const [adults, setAdults] = useState(edit ? booking.adults : 1);
  const [children, setChildren] = useState(edit ? booking.children : 0);
  const [notes, setNotes] = useState(edit ? booking.notes ?? '' : '');
  const [color, setColor] = useState(edit ? booking.color ?? null : defaults.color ?? null); // null = automatic per guest
  const [guestChoice, setGuestChoice] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const initialGuest = edit
    ? { id: booking.guest_id, name: booking.name, phone: booking.phone, email: booking.email }
    : defaults.guest ?? null;

  const nights = checkIn && checkOut ? diffDays(checkIn, checkOut) : 0;

  // Lets the calendar draw this booking on the grid while it is being filled in.
  useEffect(() => {
    if (onPreview && nights >= 1) onPreview({ roomId: Number(roomId), checkIn, checkOut, color });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, checkIn, checkOut, color, nights]);
  const history = useApi(edit ? `/api/bookings/${booking.id}` : null).data?.history ?? [];

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (!guestChoice) return setError('Choose a guest, or add a new one with a phone or email.');
    if (nights < 1) return setError('Check-out must be after check-in.');

    setBusy(true);
    try {
      const common = {
        room_id: Number(roomId), check_in: checkIn, check_out: checkOut, status, channel,
        rate_plan: ratePlan, adults: Number(adults), children: Number(children), notes: notes.trim() || null, color,
      };
      if (edit) {
        let guestId = guestChoice.guestId;
        if (guestChoice.newGuest) guestId = (await api('/api/guests', { method: 'POST', body: guestChoice.newGuest })).id;
        await api(`/api/bookings/${booking.id}`, { method: 'PATCH', body: { ...common, guest_id: guestId } });
      } else {
        await api('/api/bookings', {
          method: 'POST',
          body: guestChoice.guestId ? { ...common, guest_id: guestChoice.guestId } : { ...common, guest: guestChoice.newGuest },
        });
      }
      onSaved(edit ? 'Booking updated' : 'Booking created');
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api(`/api/bookings/${booking.id}`, { method: 'DELETE' });
      onSaved();
      onDone();
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

  return (
    <form onSubmit={save} className="space-y-4">
        <GuestPicker initial={initialGuest} onChange={setGuestChoice} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="b-in">Check-in</label>
            <input id="b-in" type="date" required className="field" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="b-out">Check-out</label>
            <input id="b-out" type="date" required className="field" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </div>
        </div>
        <p className="-mt-2 text-sm text-muted">{nights > 0 ? nightsLabel(nights) : 'Check-out must be after check-in'}</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="b-room">Room</label>
            <select id="b-room" className="field" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              {rooms.map((r) => <option key={r.id} value={r.id}>Room {r.number}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="b-status">Status</label>
            <select id="b-status" className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
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
            <button
              type="button"
              aria-pressed={color === null}
              onClick={() => setColor(null)}
              className={`btn ${color === null ? 'border-ink' : ''}`}
            >
              Auto
            </button>
            {COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                aria-label={c.name}
                aria-pressed={color === c.key}
                onClick={() => setColor(c.key)}
                className={`cell flex size-11 items-center justify-center rounded-lg border-2 transition-transform active:scale-95 ${
                  color === c.key ? 'border-ink' : ''
                }`}
                style={{ backgroundColor: c.bg, borderColor: color === c.key ? undefined : c.border }}
              >
                {color === c.key && <Check size={18} weight="bold" />}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-sm text-muted">Auto gives each guest their own colour.</p>
        </div>

        <div>
          <label className="label" htmlFor="b-notes">Notes</label>
          <textarea id="b-notes" rows={3} className="field" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">{error}</p>}

        {edit && history.length > 0 && (
          <details className="rounded-lg border border-line">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-medium">
              <ArrowUUpLeft size={18} /> History ({history.length})
            </summary>
            <ul className="divide-y divide-line border-t border-line text-sm">
              {history.map((h) => (
                <li key={h.id} className="flex justify-between gap-3 px-3 py-2">
                  <span>{ACTION[h.action] ?? h.action}{h.changed_by ? ` by ${h.changed_by}` : ''}</span>
                  <span className="shrink-0 text-muted">{fmtDateTime(h.changed_at)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-line bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {edit && (
          <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>
            <Trash size={18} /> Delete
          </button>
        )}
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary flex-1" disabled={busy}>
          {busy ? 'Saving...' : edit ? 'Save changes' : 'Create booking'}
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
