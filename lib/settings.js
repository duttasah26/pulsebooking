import { DEFAULT_CHECK_IN_TIME, DEFAULT_CHECK_OUT_TIME } from './defaults';

// App-wide settings, shared by every device. They live in the database (settings table, key 'app'); this file is the
// one place that knows the defaults and how a change is applied, on the server and in the browser alike.
//   floorColors:  floor digit -> palette key or #hex (the room header boxes)
//   statusColors: booking status -> palette key or #hex (bars without a colour of their own)
export const DEFAULT_SETTINGS = {
  floorColors: { 1: 'mint', 2: 'gold', 3: 'sky' },
  statusColors: { confirmed: 'mint', on_hold: 'gold' },
  checkInTime: DEFAULT_CHECK_IN_TIME,
  checkOutTime: DEFAULT_CHECK_OUT_TIME,
};

export const STATUS_COLOR_KEYS = ['confirmed', 'on_hold'];

// Saved settings (possibly partial, possibly missing) on top of the defaults.
export function mergeSettings(saved) {
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    floorColors: { ...DEFAULT_SETTINGS.floorColors, ...saved?.floorColors },
    statusColors: { ...DEFAULT_SETTINGS.statusColors, ...saved?.statusColors },
  };
}

// Apply a validated change: { floorColors?: {1: 'sky' | null}, statusColors?, checkInTime?, checkOutTime? }.
// A null colour goes back to the default for that floor or status.
export function patchSettings(current, patch) {
  const next = { ...current, floorColors: { ...current.floorColors }, statusColors: { ...current.statusColors } };
  for (const [floor, color] of Object.entries(patch.floorColors ?? {})) {
    const fallback = DEFAULT_SETTINGS.floorColors[floor];
    if (color ?? fallback) next.floorColors[floor] = color ?? fallback;
    else delete next.floorColors[floor];
  }
  for (const [status, color] of Object.entries(patch.statusColors ?? {})) {
    next.statusColors[status] = color ?? DEFAULT_SETTINGS.statusColors[status];
  }
  if (patch.checkInTime !== undefined) next.checkInTime = patch.checkInTime ?? '';
  if (patch.checkOutTime !== undefined) next.checkOutTime = patch.checkOutTime ?? '';
  return next;
}
