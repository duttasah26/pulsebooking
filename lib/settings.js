import { DEFAULT_CHECK_IN_TIME, DEFAULT_CHECK_OUT_TIME } from './defaults';

// App-wide settings, shared by every device. They live in the database (settings table, key 'app'); this file is the
// one place that knows the defaults and how a change is applied, on the server and in the browser alike.
//   floorColors:  floor digit -> palette key or #hex (the room header boxes and room number chips)
//   statusColors: booking status -> palette key or #hex (bars without a colour of their own)
//   stayColors:   checkIn / checkOut -> palette key or #hex (the first and last day in the booking form's date picker)
export const DEFAULT_SETTINGS = {
  // Pastels, each a clearly different hue from the status colours (Confirmed mint green, On hold gold yellow): a
  // yellow-green, an orange and a sky blue, so a room number is never mistaken for a status.
  floorColors: { 1: 'lime', 2: 'peach', 3: 'sky' },
  statusColors: { confirmed: 'mint', on_hold: 'gold' },
  stayColors: { checkIn: 'mint', checkOut: '#dc2626' }, // check-in green, check-out red (a custom hex; the fill is a light tint of it)
  checkInTime: DEFAULT_CHECK_IN_TIME,
  checkOutTime: DEFAULT_CHECK_OUT_TIME,
};

export const STATUS_COLOR_KEYS = ['confirmed', 'on_hold'];
export const STAY_COLOR_KEYS = ['checkIn', 'checkOut'];

// Saved settings (possibly partial, possibly missing) on top of the defaults.
export function mergeSettings(saved) {
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    floorColors: { ...DEFAULT_SETTINGS.floorColors, ...saved?.floorColors },
    statusColors: { ...DEFAULT_SETTINGS.statusColors, ...saved?.statusColors },
    stayColors: { ...DEFAULT_SETTINGS.stayColors, ...saved?.stayColors },
  };
}

// Apply a validated change: { floorColors?: {1: 'sky' | null}, statusColors?, stayColors?, checkInTime?, checkOutTime? }.
// A null colour goes back to the default for that floor or status.
export function patchSettings(current, patch) {
  const next = { ...current, floorColors: { ...current.floorColors }, statusColors: { ...current.statusColors }, stayColors: { ...DEFAULT_SETTINGS.stayColors, ...current.stayColors } };
  for (const [floor, color] of Object.entries(patch.floorColors ?? {})) {
    const fallback = DEFAULT_SETTINGS.floorColors[floor];
    if (color ?? fallback) next.floorColors[floor] = color ?? fallback;
    else delete next.floorColors[floor];
  }
  for (const [status, color] of Object.entries(patch.statusColors ?? {})) {
    next.statusColors[status] = color ?? DEFAULT_SETTINGS.statusColors[status];
  }
  for (const [which, color] of Object.entries(patch.stayColors ?? {})) {
    next.stayColors[which] = color ?? DEFAULT_SETTINGS.stayColors[which];
  }
  if (patch.checkInTime !== undefined) next.checkInTime = patch.checkInTime ?? '';
  if (patch.checkOutTime !== undefined) next.checkOutTime = patch.checkOutTime ?? '';
  return next;
}
