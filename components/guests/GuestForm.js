import { useState } from 'react';
import { Buildings, Envelope, Note, Phone, User, FloppyDisk, GitMerge, UserPlus } from '@phosphor-icons/react';
import Sheet from '../Sheet';
import BookingSheet from '../booking/BookingSheet';
import FieldLabel from '../FieldLabel';
import ColorPicker from '../booking/ColorPicker';
import GuestStays from './GuestStays';
import { api } from '../../lib/useApi';

// A guest's details (name is required; phone, email and organization are optional) and, for an existing guest,
// every stay with Book Again. isNew creates a guest; otherwise it edits one.
export default function GuestForm({ isNew, guest, rooms, onClose, onChanged, toast, onMerge }) {
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
      if (isNew) toast({ message: 'Guest added', duration: 3000 });
      else {
        // Undo puts the details back as they were before this save.
        const before = { name: guest.name, phone: guest.phone ?? null, email: guest.email ?? null, organization: guest.organization ?? null, notes: guest.notes ?? null, color: guest.color ?? null };
        toast({
          message: 'Guest updated',
          actionLabel: 'Undo',
          onAction: async () => {
            try {
              await api(`/api/guests/${guest.id}`, { method: 'PATCH', body: before });
              onChanged();
            } catch (err) {
              toast({ message: `Could not undo: ${err.message}` });
            }
          },
        });
      }
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
          <button type="submit" form="guest-form" className="btn btn-primary min-h-12 w-full lg:min-h-12" disabled={busy}>
            {busy ? 'Saving…' : isNew ? <><UserPlus size={18} aria-hidden="true" /> Add Guest</> : <><FloppyDisk size={18} aria-hidden="true" /> Save</>}
          </button>
        }
      >
        <form id="guest-form" onSubmit={save} className="form-area space-y-4">
          <div className="card space-y-4">
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
          </div>
          <div className="card space-y-4">
          <div>
            <FieldLabel icon={Buildings} htmlFor="g-org">Company or group (optional)</FieldLabel>
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
          </div>
          {!isNew && onMerge && (
            <div className="card">
              <p className="text-base font-semibold">Listed twice?</p>
              <p className="mb-2 text-base text-ink/80">If this guest also appears under another spelling, you can combine them. You choose, and you see what happens first.</p>
              <button type="button" className="btn px-3" onClick={onMerge}>
                <GitMerge size={18} aria-hidden="true" /> Merge with another guest
              </button>
            </div>
          )}
          {error && <p role="alert" className="animate-shake rounded-lg border-2 border-danger bg-red-50 px-3 py-2 text-base text-danger">{error}</p>}
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
