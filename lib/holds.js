import { api } from './useApi';

// Raised when a hold has no guest and nothing to name one after (no label, no organization).
export class NeedGuestError extends Error {
  constructor() {
    super('Please type the guest’s name, then press Confirm Booking');
  }
}

// Confirm a hold (all of its rooms together, if it has several). A booking needs a guest, so a hold without one throws
// NeedGuestError and nothing changes: the form opens and asks for the guest's name.
// Returns the guest id used.
export async function confirmHolds(holds) {
  let guestId = holds.find((h) => h.guest_id)?.guest_id ?? null;
  if (!guestId) throw new NeedGuestError(); // a real guest name is typed in the form, never made up from a label
  await Promise.all(holds.map((h) => api(`/api/bookings/${h.id}`, { method: 'PATCH', body: { status: 'confirmed', guest_id: guestId } })));
  return guestId;
}

// Put confirmed bookings back on hold (the guest stays attached).
export const reholdAll = (list) => Promise.all(list.map((b) => api(`/api/bookings/${b.id}`, { method: 'PATCH', body: { status: 'on_hold' } })));
