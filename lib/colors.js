// Pastel booking colours. A booking stores the key (or null for automatic).
// Automatic = picked from the guest id, so each guest keeps one colour and neighbours usually differ.
export const COLORS = [
  { key: 'rose', name: 'Rose', bg: '#fcd9de', border: '#e58a9a' },
  { key: 'peach', name: 'Peach', bg: '#fde0cc', border: '#eb9d6e' },
  { key: 'amber', name: 'Amber', bg: '#fbeab8', border: '#d9b04a' },
  { key: 'lime', name: 'Lime', bg: '#e3f1c0', border: '#9bc255' },
  { key: 'mint', name: 'Mint', bg: '#cdeedd', border: '#5cba91' },
  { key: 'teal', name: 'Teal', bg: '#c6ecec', border: '#4fb3b3' },
  { key: 'sky', name: 'Sky', bg: '#cde6fb', border: '#6aa9de' },
  { key: 'indigo', name: 'Indigo', bg: '#d9dcfb', border: '#8890e0' },
  { key: 'lilac', name: 'Lilac', bg: '#e6d6f7', border: '#b08ae0' },
  { key: 'pink', name: 'Pink', bg: '#f8d3ee', border: '#de86c3' },
];

export const COLOR_KEYS = COLORS.map((c) => c.key);

export const autoColor = (guestId) => COLORS[(Number(guestId) * 7) % COLORS.length];
export const colorFor = (b) => COLORS.find((c) => c.key === b.color) ?? autoColor(b.guest_id);
