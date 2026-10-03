import { useState } from 'react';
import { Buildings, Envelope, Note, Phone, User } from '@phosphor-icons/react';
import Sheet from '../Sheet';
import BookingSheet from '../booking/BookingSheet';
import FieldLabel from '../FieldLabel';
import ColorPicker from '../booking/ColorPicker';
import GuestStays from './GuestStays';
import { api } from '../../lib/useApi';

// A guest's details (name is required; phone, email and organization are optional) and, for an existing guest,
// every stay with Book Again. isNew creates a guest; otherwise it edits one.
export default function GuestForm({ isNew, guest, rooms, onClose, onChanged, toast }) {
  const [form, setForm] = useState({
    name: guest?.name ?? '', phone: guest?.phone ?? '', email: guest?.email ?? '',
    organization: guest?.organization ?? '', notes: guest?.notes ?? '', color: guest?.color ?? null,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [booking, setBooking] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Enter the guest’s name to save.');
    setBusy(true);
    try {
      const body = {
        name: form.name.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null,
        organization: form.organization.trim() || null, notes: form.notes.trim() || null, color: form.color,
      };
      if (isNew) await api('/api/guests', { method: 'POST', body });
      else await api(`/api/guests/${guest.id}`, { method: 'PATCH', body });
      toast({ message: isNew ? 'Guest added' : 'Guest updated', duration: 3000 });
      onChanged();
      if (isNew) onClose();
      setBusy(false);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <Sheet
        title={isNew ? 'New Guest' : guest.name}
        onClose={onClose}
        footer={
          <button type="submit" form="guest-form" className="btn btn-primary w-full" disabled={busy}>
            {busy ? 'Saving…' : isNew ? 'Add Guest' : 'Save'}
          </button>
        }
      >
        <form id="guest-form" onSubmit={save} className="space-y-4">
          <div>
            <FieldLabel icon={User} htmlFor="g-name">Name</FieldLabel>
            <input id="g-name" name="name" className="field" value={form.name} onChange={set('name')} autoComplete="off" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel icon={Phone} htmlFor="g-phone">Phone (optional)</FieldLabel>
              <input id="g-phone" name="phone" type="tel" inputMode="tel" className="field" value={form.phone} onChange={set('phone')} autoComplete="off" placeholder="+91 98450 12345" />
            </div>
            <div>
              <FieldLabel icon={Envelope} htmlFor="g-email">Email (optional)</FieldLabel>
              <input id="g-email" name="email" type="email" inputMode="email" className="field" value={form.email} onChange={set('email')} autoComplete="off" spellCheck={false} placeholder="name@example.com" />
            </div>
          </div>
          <div>
            <FieldLabel icon={Buildings} htmlFor="g-org">Organization (optional)</FieldLabel>
            <input id="g-org" name="organization" className="field" value={form.organization} onChange={set('organization')} autoComplete="off" />
          </div>
          <ColorPicker
            id="g-color-label"
            label="Guest Colour (optional)"
            autoLabel="None"
            hint="This guest's bookings use this colour on the calendar. None uses the status colour."
            color={form.color}
            onChange={(color) => setForm({ ...form, color })}
          />
          <div>
            <FieldLabel icon={Note} htmlFor="g-notes">Notes</FieldLabel>
            <textarea id="g-notes" name="notes" rows={3} className="field" value={form.notes} onChange={set('notes')} />
          </div>
          {error && <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">{error}</p>}
        </form>

        {!isNew && <GuestStays guest={guest} rooms={rooms} onBookAgain={setBooking} />}
      </Sheet>

      {booking && (
        <BookingSheet
          mode="create"
          defaults={booking}
          rooms={rooms}
          onClose={() => setBooking(null)}
          onSaved={(m) => { onChanged(); if (m) toast({ message: m, duration: 3000 }); }}
        />
      )}
    </>
  );
}
