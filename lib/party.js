// How many people a set of bookings holds. A booking made for several rooms stores the same party on every one of its
// rooms (4 rooms for 4 adults shows 4 on each), so rooms of one group count once, not once per room; separate
// bookings add up.
export function partyOf(bookings) {
  const groups = new Map();
  for (const b of bookings) {
    const key = b.group_id ?? `booking-${b.id}`;
    const seen = groups.get(key) ?? { adults: 0, children: 0 };
    groups.set(key, { adults: Math.max(seen.adults, b.adults ?? 0), children: Math.max(seen.children, b.children ?? 0) });
  }
  let adults = 0;
  let children = 0;
  for (const g of groups.values()) {
    adults += g.adults;
    children += g.children;
  }
  return { adults, children };
}

export const partyText = ({ adults, children }) =>
  `${adults} ${adults === 1 ? 'adult' : 'adults'}${children > 0 ? `, ${children} ${children === 1 ? 'child' : 'children'}` : ''}`;
