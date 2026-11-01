import { useCallback, useMemo, useSyncExternalStore } from 'react';

// Bookings pinned for quick reach: to the side of the calendar, and to the top of the Bookings list, with a small pin shown on the booking
// itself wherever it appears. Kept on this device (like the other device choices) in localStorage: for each pin its booking id and a small
// snapshot of the booking (name, room, colour, dates, status), so a pinned tab can be drawn at once, before (or without) any request.
// One small store feeds every place that shows a pin (a calendar can draw hundreds of bars), so there is one listener, not one per bar.
const KEY = 'pulse.pinned';
export const MAX_PINS = 8;

const NONE = [];
let raw = null; // the saved text last read, so the parsed list keeps one identity until it really changes
let list = NONE; // [{ id, snap }]

const snapOf = (b) => ({
  name: b.name ?? null,
  room_number: b.room_number ?? null,
  check_in: b.check_in ?? null,
  check_out: b.check_out ?? null,
  status: b.status ?? null,
  color: b.color ?? null,
  guest_color: b.guest_color ?? null,
});

function snapshot() {
  let now = null;
  try {
    now = localStorage.getItem(KEY);
  } catch {}
  if (now !== raw) {
    raw = now;
    try {
      const parsed = JSON.parse(now ?? '[]');
      // An entry is a booking id (how pins were first saved) or { id, snap }.
      list = Array.isArray(parsed)
        ? parsed
            .map((p) => (Number.isInteger(p) ? { id: p, snap: null } : p && Number.isInteger(p.id) ? { id: p.id, snap: p.snap ?? null } : null))
            .filter((p) => p && p.id > 0)
            .slice(0, MAX_PINS)
        : NONE;
    } catch {
      list = NONE;
    }
  }
  return list;
}

const emit = () => listeners.forEach((fn) => fn());
const listeners = new Set();
function subscribe(fn) {
  if (listeners.size === 0) window.addEventListener('storage', emit); // another tab changed the pins
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) window.removeEventListener('storage', emit);
  };
}
const write = (pins) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(pins));
  } catch {}
  emit();
};

export function usePinned() {
  const pins = useSyncExternalStore(subscribe, snapshot, () => NONE);
  const ids = useMemo(() => pins.map((p) => p.id), [pins]);
  // toggle(booking): returns 'pinned', 'unpinned', or 'full' when MAX_PINS are already pinned.
  const toggle = useCallback((booking) => {
    const now = snapshot();
    if (now.some((p) => p.id === booking.id)) {
      write(now.filter((p) => p.id !== booking.id));
      return 'unpinned';
    }
    if (now.length >= MAX_PINS) return 'full';
    write([...now, { id: booking.id, snap: snapOf(booking) }]);
    return 'pinned';
  }, []);
  const remove = useCallback((id) => write(snapshot().filter((p) => p.id !== id)), []);
  // Keeps a pin's snapshot current: pins saved the old way (just an id) get theirs the first time the booking loads, so their tab is instant
  // from then on, and a renamed or recoloured booking is picked up. Saves only when something changed.
  const refresh = useCallback((booking) => {
    const now = snapshot();
    const at = now.findIndex((p) => p.id === booking.id);
    if (at < 0) return;
    const snap = snapOf(booking);
    if (JSON.stringify(now[at].snap) === JSON.stringify(snap)) return;
    write(now.map((p, i) => (i === at ? { id: p.id, snap } : p)));
  }, []);
  return { pins, ids, isPinned: (id) => ids.includes(id), toggle, remove, refresh };
}

// Just "is this booking pinned", for the many small places (a list row, a calendar bar) that draw the pin.
export const useIsPinned = (id) => useSyncExternalStore(subscribe, () => snapshot().some((p) => p.id === id), () => false);
