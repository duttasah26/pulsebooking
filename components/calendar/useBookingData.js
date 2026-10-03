import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApi } from '../../lib/useApi';
import { addDays, daysInMonth, monthStart } from '../../lib/dates';

// The dates the current view needs bookings for.
function windowFor(view, date, span) {
  if (view === 'timeline') return { from: date, days: span };
  if (view === 'day') return { from: addDays(date, -1), days: 3 };
  const first = monthStart(date);
  return { from: first, days: daysInMonth(first) };
}

/*
  Rooms and bookings for the current view, plus the bookkeeping that makes holds feel instant:
    extra:   bookings added on screen that the server has not returned yet (temporary holds, recreated holds)
    removed: ids deleted on screen that the server list may still contain
  bookingList is the server list with those two applied. Both are tidied whenever a fresh list arrives.
  isBusy(roomId, date, ignoreId) tells whether a room is taken that night (used to grey out rooms and dates).
  cancelledKeys holds temporary holds the user removed before the server had confirmed them.
*/
export function useBookingData({ view, date, span, enabled }) {
  const win = useMemo(() => windowFor(view, date, span), [view, date, span]);
  const rooms = useApi('/api/rooms');
  const bookings = useApi(
    enabled ? `/api/bookings?from=${win.from}&to=${addDays(win.from, win.days)}&sort=check_in&dir=asc` : null,
  );
  const fetched = bookings.data;

  const [extra, setExtra] = useState([]);
  const [removed, setRemoved] = useState(() => new Set());
  const cancelledKeys = useRef(new Set());

  useEffect(() => {
    if (!fetched) return;
    const ids = new Set(fetched.map((b) => b.id));
    setExtra((list) => (list.some((b) => ids.has(b.id)) ? list.filter((b) => !ids.has(b.id)) : list));
    setRemoved((set) => {
      const kept = [...set].filter((id) => ids.has(id));
      return kept.length === set.size ? set : new Set(kept);
    });
  }, [fetched]);

  const bookingList = useMemo(
    () => [...(fetched ?? []), ...extra].filter((b) => !removed.has(b.id)),
    [fetched, extra, removed],
  );

  const busyNights = useMemo(() => {
    const map = new Map();
    for (const b of bookingList) {
      if (b.status === 'cancelled') continue;
      for (let d = b.check_in; d < b.check_out; d = addDays(d, 1)) {
        const key = `${b.room_id}|${d}`;
        (map.get(key) ?? map.set(key, []).get(key)).push(b.id);
      }
    }
    return map;
  }, [bookingList]);
  const isBusy = useCallback(
    (roomId, d, ignoreId) => (busyNights.get(`${roomId}|${d}`) ?? []).some((id) => id !== ignoreId),
    [busyNights],
  );

  const forget = (id) => setRemoved((set) => new Set(set).add(id));
  const unforget = (id) =>
    setRemoved((set) => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });

  return { rooms, bookings, bookingList, isBusy, setExtra, forget, unforget, cancelledKeys };
}
