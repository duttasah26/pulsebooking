import { api } from './useApi';

// Raised when a hold has no guest and nothing to name one after (no label, no organization).
export class NeedGuestError extends Error {
  constructor() {
    super('Add a guest name to confirm this hold');
  }
}

// Confirm a hold (all of its rooms together, if it has several). A booking needs a guest, so a hold without one gets a
// new guest named after its label or organization; with neither, NeedGuestError is thrown and nothing changes.
// Returns the guest id used.
export async function confirmHolds(holds) {
  let guestId = holds.find((h) => h.guest_id)?.guest_id ?? null;
  if (!guestId) {
    const first = holds[0];
    const name = (first.label || first.organization || '').trim();
    if (!name) throw new NeedGuestError();
    guestId = (await api('/api/guests', { method: 'POST', body: { name, organization: first.organization || null } })).id;
  }
  await Promise.all(holds.map((h) => api(`/api/bookings/${h.id}`, { method: 'PATCH', body: { status: 'confirmed', guest_id: guestId } })));
  return guestId;
}

// Put confirmed bookings back on hold (the guest stays attached).
export const reholdAll = (list) => Promise.all(list.map((b) => api(`/api/bookings/${b.id}`, { method: 'PATCH', body: { status: 'on_hold' } })));
