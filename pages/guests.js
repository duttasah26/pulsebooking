import { useState } from 'react';
import { MagnifyingGlass, Plus, UserCircle } from '@phosphor-icons/react';
import Layout from '../components/Layout';
import Sheet from '../components/Sheet';
import BookingSheet from '../components/BookingSheet';
import { useToast } from '../components/Toast';
import { api, useApi, useDebounced } from '../lib/useApi';
import { STATUS_LABEL } from '../lib/status';
import { addDays, fmtDayMonthYear, fmtShort, nightsLabel, today } from '../lib/dates';

export default function Guests() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null); // guest id, or 'new'
  const search = useDebounced(q.trim());
  const list = useApi(`/api/guests${search ? `?q=${encodeURIComponent(search)}` : ''}`);
  const guests = list.data ?? [];

  return (
    <Layout title="Guests">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Guests</h1>
          <button type="button" className="btn btn-primary" onClick={() => setOpen('new')}>
            <Plus size={18} /> New guest
          </button>
        </div>

        <div className="relative">
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="field pl-10" placeholder="Search by name, phone, email or organization" aria-label="Search guests" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {list.error && (
          <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">
            Could not load guests: {list.error.message}
            <button type="button" className="btn ml-3" onClick={list.reload}>Retry</button>
          </p>
        )}

        {list.loading && !list.data ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-lg bg-surface-2 motion-safe:animate-pulse" />)}
          </div>
        ) : guests.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface p-8 text-center text-muted">
            {search ? `No guests match "${search}".` : 'No guests yet. They are added when you create a booking.'}
          </p>
        ) : (
          <ul className={`divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface ${list.loading ? 'opacity-70' : ''}`}>
            {guests.map((g) => (
              <li key={g.id}>
                <button type="button" onClick={() => setOpen(g.id)} className="flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-2">
                  <UserCircle size={32} className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{g.name}</span>
                    <span className="block truncate text-sm text-muted">{[g.phone, g.email, g.organization].filter(Boolean).join(', ') || 'No contact saved'}</span>
                  </span>
                  <span className="shrink-0 text-right text-sm">
                    <span className="block font-mono font-semibold">{g.stays} stay{Number(g.stays) === 1 ? '' : 's'}</span>
                    {g.last_check_in && <span className="block text-muted">last {fmtDayMonthYear(g.last_check_in)}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && <GuestSheet id={open} onClose={() => setOpen(null)} onChanged={list.reload} />}
    </Layout>
  );
}

function GuestSheet({ id, onClose, onChanged }) {
  const toast = useToast();
  const isNew = id === 'new';
  const detail = useApi(isNew ? null : `/api/guests/${id}`);
  const rooms = useApi('/api/rooms');
  const guest = detail.data;

  if (!isNew && !guest) {
    return (
      <Sheet title="Guest" onClose={onClose}>
        <p className="text-muted">{detail.error ? detail.error.message : 'Loading...'}</p>
      </Sheet>
    );
  }
  return <GuestForm key={id} isNew={isNew} guest={guest} rooms={rooms.data ?? []} onClose={onClose} onChanged={() => { onChanged(); detail.reload(); }} toast={toast} />;
}

function GuestForm({ isNew, guest, rooms, onClose, onChanged, toast }) {
  const [form, setForm] = useState({ name: guest?.name ?? '', phone: guest?.phone ?? '', email: guest?.email ?? '', organization: guest?.organization ?? '', notes: guest?.notes ?? '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [booking, setBooking] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Name is required.');
    if (!form.phone.trim() && !form.email.trim()) return setError('Add a phone or email so guests with the same name can be told apart.');
    setBusy(true);
    try {
      const body = { name: form.name.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null, organization: form.organization.trim() || null, notes: form.notes.trim() || null };
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

  const stays = guest?.bookings ?? [];

  return (
    <>
      <Sheet
        title={isNew ? 'New guest' : guest.name}
        onClose={onClose}
        footer={
          <button type="submit" form="guest-form" className="btn btn-primary w-full" disabled={busy}>
            {busy ? 'Saving...' : isNew ? 'Add guest' : 'Save changes'}
          </button>
        }
      >
        <form id="guest-form" onSubmit={save} className="space-y-4">
          <div>
            <label className="label" htmlFor="g-name">Name</label>
            <input id="g-name" className="field" value={form.name} onChange={set('name')} autoComplete="off" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="g-phone">Phone</label>
              <input id="g-phone" type="tel" inputMode="tel" className="field" value={form.phone} onChange={set('phone')} />
            </div>
            <div>
              <label className="label" htmlFor="g-email">Email</label>
              <input id="g-email" type="email" inputMode="email" className="field" value={form.email} onChange={set('email')} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="g-org">Organization</label>
            <input id="g-org" className="field" value={form.organization} onChange={set('organization')} autoComplete="off" />
          </div>
          <div>
            <label className="label" htmlFor="g-notes">Notes</label>
            <textarea id="g-notes" rows={3} className="field" value={form.notes} onChange={set('notes')} />
          </div>
          {error && <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">{error}</p>}
        </form>

        {!isNew && (
          <section className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Stays ({stays.length})</h3>
              <button
                type="button"
                className="btn"
                disabled={rooms.length === 0}
                onClick={() => {
                  const t = today();
                  setBooking({ roomIds: [rooms[0].id], checkIn: t, checkOut: addDays(t, 1), guest });
                }}
              >
                <Plus size={18} /> Book again
              </button>
            </div>
            {stays.length === 0 ? (
              <p className="text-sm text-muted">No stays yet.</p>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {stays.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className={b.deleted_at ? 'line-through' : ''}>
                      <span className="block font-medium">{fmtShort(b.check_in)} to {fmtShort(b.check_out)}</span>
                      <span className="block text-muted">Room {b.room_number}, {nightsLabel(b.nights)}</span>
                    </span>
                    <span className="badge shrink-0">{b.deleted_at ? 'Deleted' : STATUS_LABEL[b.status]}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
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
