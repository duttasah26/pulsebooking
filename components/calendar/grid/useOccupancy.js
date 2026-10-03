import { useMemo } from 'react';
import { diffDays } from '../../../lib/dates';

// roomIndex: room id -> row position.  occupancy[r][i]: the booking holding room r on night i, or null.
// Cancelled bookings free the room, so they are ignored.
export function useOccupancy(rooms, bookings, days) {
  const n = days.length;
  const start = days[0];
  const roomIndex = useMemo(() => new Map(rooms.map((room, i) => [room.id, i])), [rooms]);

  const occupancy = useMemo(() => {
    const map = rooms.map(() => Array(n).fill(null));
    for (const b of bookings) {
      if (b.status === 'cancelled') continue;
      const r = roomIndex.get(b.room_id);
      if (r === undefined) continue;
      const from = Math.max(0, diffDays(start, b.check_in));
      const to = Math.min(n, diffDays(start, b.check_out));
      for (let i = from; i < to; i++) map[r][i] = b;
    }
    return map;
  }, [rooms, roomIndex, bookings, n, start]);

  return { roomIndex, occupancy };
}
