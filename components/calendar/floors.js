// A floor is the first digit of the room number: 1xx is the 1st floor, 2xx the 2nd, 3xx the 3rd.
export const floorOf = (room) => String(room.number)[0];

const SUFFIX = { 1: 'st', 2: 'nd', 3: 'rd' };
export const floorShort = (f) => `${f}${SUFFIX[f] ?? 'th'}`;
export const floorLabel = (f) => `${floorShort(f)} Floor`;

// `chosen` is the floors picked in the toolbar (null = all). Returns the floors that exist, the ones showing,
// and the rooms on those floors. Picking nothing, or only floors that do not exist, shows everything.
export function deriveFloors(rooms, chosen) {
  const floorKeys = [...new Set(rooms.map(floorOf))].sort();
  const picked = chosen ? chosen.filter((f) => floorKeys.includes(f)) : floorKeys;
  const shownFloors = picked.length ? picked : floorKeys;
  const visibleRooms = rooms.filter((r) => shownFloors.includes(floorOf(r)));
  return { floorKeys, shownFloors, visibleRooms };
}
