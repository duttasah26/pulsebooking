import { DEFAULT_SETTINGS } from './settings';

// Pastel booking colours. A booking stores a palette key, a custom hex like "#3b82f6", or null (automatic).
// Automatic = the colour of its status (on hold yellow, confirmed green; changeable in Settings).
export const COLORS = [
  { key: 'rose', name: 'Rose', bg: '#fcd9de', border: '#e58a9a' },
  { key: 'coral', name: 'Coral', bg: '#fbd3c9', border: '#e8836d' },
  { key: 'peach', name: 'Peach', bg: '#fde0cc', border: '#eb9d6e' },
  { key: 'sand', name: 'Sand', bg: '#efe3cf', border: '#c7a76f' },
  { key: 'amber', name: 'Amber', bg: '#fbeab8', border: '#d9b04a' },
  { key: 'gold', name: 'Gold', bg: '#fbefb0', border: '#d6b428' },
  { key: 'lime', name: 'Lime', bg: '#e3f1c0', border: '#9bc255' },
  { key: 'olive', name: 'Olive', bg: '#e1e8c3', border: '#a3b05a' },
  { key: 'mint', name: 'Mint', bg: '#cdeedd', border: '#5cba91' },
  { key: 'aqua', name: 'Aqua', bg: '#c9f0e6', border: '#62c4ab' },
  { key: 'teal', name: 'Teal', bg: '#c6ecec', border: '#4fb3b3' },
  { key: 'cyan', name: 'Cyan', bg: '#c8eaf5', border: '#5fb6d6' },
  { key: 'sky', name: 'Sky', bg: '#cde6fb', border: '#6aa9de' },
  { key: 'periwinkle', name: 'Periwinkle', bg: '#d3dcf9', border: '#7a8fe0' },
  { key: 'indigo', name: 'Indigo', bg: '#d9dcfb', border: '#8890e0' },
  { key: 'lilac', name: 'Lilac', bg: '#e6d6f7', border: '#b08ae0' },
  { key: 'orchid', name: 'Orchid', bg: '#ecd2f2', border: '#c37fd4' },
  { key: 'pink', name: 'Pink', bg: '#f8d3ee', border: '#de86c3' },
  { key: 'blush', name: 'Blush', bg: '#fadde6', border: '#e592ac' },
  { key: 'stone', name: 'Stone', bg: '#e2e4e8', border: '#9aa1ac' },
];

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

// Colour of a booking that has none of its own: by status. Checked in counts as confirmed; finished or cancelled go grey.
export function statusColor(status, settings = DEFAULT_SETTINGS) {
  if (status === 'checked_out' || status === 'cancelled') return STONE;
  const key = status === 'on_hold' ? 'on_hold' : 'confirmed';
  return resolveColor(settings.statusColors[key]) ?? resolveColor(DEFAULT_SETTINGS.statusColors[key]);
}

// A booking's own colour, else its guest's colour, else the colour of its status.
export const colorFor = (b, settings = DEFAULT_SETTINGS) => resolveColor(b.color) ?? resolveColor(b.guest_color) ?? statusColor(b.status, settings);
