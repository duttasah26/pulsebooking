// Guests. Every booking row (one room) stores its own adults and children, and the total for several rooms is simply the
// sum. When one booking is made for several rooms with a total (4 rooms, 6 adults), shareOut splits the total between the
// rooms: 2, 2, 1, 1. A room always has at least one adult, so the minimum for adults is 1.
export function shareOut(total, rooms, min = 0) {
  const n = Math.max(1, rooms);
  const t = Math.max(0, Math.floor(Number(total) || 0));
  const base = Math.floor(t / n);
  const extra = t % n;
  return Array.from({ length: n }, (_, i) => Math.max(min, base + (i < extra ? 1 : 0)));
}

// How many people a set of bookings holds: everyone added up.
export function partyOf(bookings) {
  let adults = 0;
  let children = 0;
  for (const b of bookings) {
    adults += b.adults ?? 0;
    children += b.children ?? 0;
  }
  return { adults, children };
}

export const partyText = ({ adults, children }) =>
  `${adults} ${adults === 1 ? 'adult' : 'adults'}${children > 0 ? `, ${children} ${children === 1 ? 'child' : 'children'}` : ''}`;
