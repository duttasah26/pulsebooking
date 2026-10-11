import { DEFAULT_SETTINGS } from './settings';

// Booking colours: soft, slightly greyed tints (like coloured index cards, not sweets) with a firmer edge. A booking stores a palette key, a custom hex like "#3b82f6", or null (automatic).
// Automatic = the colour of its status (on hold yellow, confirmed green; changeable in Settings).
export const COLORS = [
  { key: 'rose', name: 'Rose', bg: '#f5e0e3', border: '#c37986' },
  { key: 'coral', name: 'Coral', bg: '#f1d9d3', border: '#c17261' },
  { key: 'peach', name: 'Peach', bg: '#f4e2d5', border: '#c48762' },
  { key: 'sand', name: 'Sand', bg: '#e9e1d5', border: '#a38b60' },
  { key: 'amber', name: 'Amber', bg: '#eee4c5', border: '#a78c49' },
  { key: 'gold', name: 'Gold', bg: '#ede5be', border: '#8f7f3c' },
  { key: 'lime', name: 'Lime', bg: '#dfe8c9', border: '#7b9252' },
  { key: 'olive', name: 'Olive', bg: '#dde1ca', border: '#7b8255' },
  { key: 'mint', name: 'Mint', bg: '#d3e8dd', border: '#568d75' },
  { key: 'aqua', name: 'Aqua', bg: '#d0e9e2', border: '#589b8a' },
  { key: 'teal', name: 'Teal', bg: '#cde5e5', border: '#4f8080' },
  { key: 'cyan', name: 'Cyan', bg: '#d1e6ec', border: '#5496ae' },
  { key: 'sky', name: 'Sky', bg: '#d6e5f2', border: '#5e8eb7' },
  { key: 'periwinkle', name: 'Periwinkle', bg: '#dae0f2', border: '#6b7cbc' },
  { key: 'indigo', name: 'Indigo', bg: '#dfe1f5', border: '#777ebe' },
  { key: 'lilac', name: 'Lilac', bg: '#e6dcf1', border: '#9779be' },
  { key: 'orchid', name: 'Orchid', bg: '#e8d8ec', border: '#a46fb1' },
  { key: 'pink', name: 'Pink', bg: '#f1daeb', border: '#bc75a6' },
  { key: 'blush', name: 'Blush', bg: '#f4e3e8', border: '#c48095' },
  { key: 'stone', name: 'Stone', bg: '#e3e4e7', border: '#838890' },
];

// Pickers show only four quick swatches plus a custom colour (the full palette still resolves for anything saved earlier).
// Floors and statuses use one set, bookings and guests another.
export const STATUS_SWATCHES = ['mint', 'gold', 'sky', 'rose'];
export const BOOKING_SWATCHES = ['lilac', 'peach', 'teal', 'pink'];

export const COLOR_KEYS = COLORS.map((c) => c.key);
export const HEX_RE = /^#[0-9a-fA-F]{6}$/;
export const isCustomColor = (value) => typeof value === 'string' && HEX_RE.test(value);

// A custom colour is used as the border; the fill is a light tint of it so dark text stays readable.
const customStyle = (hex) => ({
  key: hex,
  name: 'Custom',
  bg: `color-mix(in srgb, ${hex} 28%, white)`,
  border: hex,
});

// The style for a stored value, or undefined when it is empty or unknown.
export const resolveColor = (value) => COLORS.find((c) => c.key === value) ?? (isCustomColor(value) ? customStyle(value) : undefined);

const STONE = COLORS.find((c) => c.key === 'stone');

// Header box colour of a room: one per floor (first digit of the room number), set in Settings.
export const floorColor = (room, settings = DEFAULT_SETTINGS) => resolveColor(settings.floorColors[String(room.number)[0]]) ?? STONE;

// A room number's colour: its floor's pastel with its own edge. The default floor pastels (yellow-green, orange, sky blue)
// are different hues from the Confirmed and On hold colours, so a room number is not mistaken for a status.
export function roomShade(room, settings = DEFAULT_SETTINGS) {
  const tone = floorColor(room, settings);
  return { fill: tone.bg, edge: tone.border };
}

// Colour of a booking that has none of its own: by status. Checked in counts as confirmed; finished or cancelled go grey.
export function statusColor(status, settings = DEFAULT_SETTINGS) {
  if (status === 'checked_out' || status === 'cancelled') return STONE;
  const key = status === 'on_hold' ? 'on_hold' : 'confirmed';
  return resolveColor(settings.statusColors[key]) ?? resolveColor(DEFAULT_SETTINGS.statusColors[key]);
}

// The colour of the first or last day of a stay in the date picker (which: 'checkIn' | 'checkOut'), set in Settings.
export const stayColor = (which, settings = DEFAULT_SETTINGS) => resolveColor(settings.stayColors?.[which]) ?? resolveColor(DEFAULT_SETTINGS.stayColors[which]);

// A booking's own colour, else its guest's colour, else the colour of its status.
export const colorFor = (b, settings = DEFAULT_SETTINGS) => resolveColor(b.color) ?? resolveColor(b.guest_color) ?? statusColor(b.status, settings);
