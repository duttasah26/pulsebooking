import { useCallback, useSyncExternalStore } from 'react';

// Bookings pinned for quick reach: to the side of the calendar, and to the top of the Bookings list, with a small pin shown on the booking
// itself wherever it appears. Kept on this device (like the other device choices): a list of booking ids in localStorage.
// One small store feeds every place that shows a pin (a calendar can draw hundreds of bars), so there is one listener, not one per bar.
const KEY = 'pulse.pinned';
export const MAX_PINS = 8;

const NONE = [];
let raw = null; // the saved text last read, so the parsed list keeps one identity until it really changes
let list = NONE;
const listeners = new Set();

function snapshot() {
  let now = null;
  try {
    now = localStorage.getItem(KEY);
  } catch {}
  if (now !== raw) {
    raw = now;
    try {
      const parsed = JSON.parse(now ?? '[]');
      list = Array.isArray(parsed) ? parsed.filter((n) => Number.isInteger(n) && n > 0).slice(0, MAX_PINS) : NONE;
    } catch {
      list = NONE;
    }
  }
  return list;
}

const emit = () => listeners.forEach((fn) => fn());
function subscribe(fn) {
  if (listeners.size === 0) window.addEventListener('storage', emit); // another tab changed the pins
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) window.removeEventListener('storage', emit);
  };
}
const write = (ids) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {}
  emit();
};

export function usePinned() {
  const ids = useSyncExternalStore(subscribe, snapshot, () => NONE);
  // Returns 'pinned', 'unpinned', or 'full' when MAX_PINS are already pinned.
  const toggle = useCallback((id) => {
    const now = snapshot();
    if (now.includes(id)) {
      write(now.filter((x) => x !== id));
      return 'unpinned';
    }
    if (now.length >= MAX_PINS) return 'full';
    write([...now, id]);
    return 'pinned';
  }, []);
  const remove = useCallback((id) => write(snapshot().filter((x) => x !== id)), []);
  return { ids, isPinned: (id) => ids.includes(id), toggle, remove };
}

// Just "is this booking pinned", for the many small places (a list row, a calendar bar) that draw the pin.
export const useIsPinned = (id) => useSyncExternalStore(subscribe, () => snapshot().includes(id), () => false);
