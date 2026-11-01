import { Moon, SignIn, SignOut, User } from '@phosphor-icons/react';
import { dayOfMonth, fmtShort, nightsLabel } from '../../../lib/dates';

// What a booking bar says besides the name, packed to the room the bar really has (its measured width and height).
// Items are tried in order of importance and laid into lines like words in a paragraph: each goes on the current line if it
// fits, else on a new line if there is height left, else in a shorter form, else it is left out. Nothing is ever cut in half.
// Colour carries meaning, as on the Day tab: arriving green, leaving red, status in its own colour. Each coloured bit is a
// small chip on a near-white ground, so it stays readable on whatever colour the booking itself has.

export const LINE = 20; // px per line of 14px text, with its gap
const GAP = 4;
// px per character of 14px mono text, a little generous so a line errs on the short side.
let CH = 8.4;
const CHIP_PAD = 8;

// The soft fills are see-through tints in dark, so a chip lays its tint over the page surface first and keeps its own clean colour on any bar.
const over = (token) => `bg-surface bg-[image:linear-gradient(var(--${token}),var(--${token}))]`;
const CHIP = {
  in: 'bg-surface/80 text-ok-text',
  out: 'bg-surface/80 text-danger',
  confirmed: `${over('ok-soft')} text-ok-text`,
  on_hold: `${over('hold')} text-hold-ink`,
  checked_in: 'bg-accent text-accent-ink',
  checked_out: 'bg-surface-2 text-muted',
  cancelled: 'bg-surface-2 text-muted',
};
export const STATUS_WORD = { confirmed: 'Confirmed', on_hold: 'On hold', checked_in: 'Checked in', checked_out: 'Checked out', cancelled: 'Cancelled' };

function Chip({ tone, children }) {
  return <span className={`shrink-0 whitespace-nowrap rounded px-1 font-semibold ${CHIP[tone] ?? 'bg-surface/80'}`}>{children}</span>;
}
const chipW = (text) => String(text).length * CH + CHIP_PAD;
const ICON = 14; // an icon's width, as on the booking rows: a symbol and a number say what a word used to
const iconW = (text) => ICON + 4 + String(text).length * CH;

// Each item: variants, widest first, as { w, node }.
function items(b, roomTone, hold) {
  const out = [];
  const sameMonth = b.check_in.slice(0, 7) === b.check_out.slice(0, 7);
  const dateVariants = [
    { w: chipW(fmtShort(b.check_in)) + chipW(fmtShort(b.check_out)) + 2 * GAP + 14, node: (<><Chip tone="in">{fmtShort(b.check_in)}</Chip><span aria-hidden="true" className="text-muted">to</span><Chip tone="out">{fmtShort(b.check_out)}</Chip></>) },
  ];
  if (sameMonth) {
    dateVariants.push({ w: chipW(dayOfMonth(b.check_in)) + chipW(fmtShort(b.check_out)) + 2 * GAP + 14, node: (<><Chip tone="in">{dayOfMonth(b.check_in)}</Chip><span aria-hidden="true" className="text-muted">to</span><Chip tone="out">{fmtShort(b.check_out)}</Chip></>) });
  }
  out.push({ key: 'dates', variants: dateVariants });

  // A confirmed booking is the usual case, so it is not written out: a green tick beside the name says it (see BookingBar). The others keep their word.
  if (b.status !== 'confirmed') {
    const word = STATUS_WORD[b.status] ?? b.status;
    out.push({ key: 'status', variants: [{ w: chipW(word), node: <Chip tone={b.status}>{word}</Chip> }] });
  }

  // Nights and guests are an icon and a number, as on the booking rows (a moon and 5, a person and 2).
  out.push({
    key: 'nights',
    variants: [{ w: iconW(b.nights), node: <span title={nightsLabel(b.nights)} className="flex shrink-0 items-center gap-1 whitespace-nowrap font-mono font-semibold"><Moon size={ICON} aria-hidden="true" />{b.nights}<span className="sr-only">{b.nights === 1 ? 'night' : 'nights'}</span></span> }],
  });
  if (b.adults != null) {
    const guests = b.adults + (b.children ?? 0);
    out.push({
      key: 'guests',
      variants: [{ w: iconW(guests), node: <span title={`${guests} ${guests === 1 ? 'guest' : 'guests'}`} className="flex shrink-0 items-center gap-1 whitespace-nowrap font-mono font-semibold"><User size={ICON} aria-hidden="true" />{guests}<span className="sr-only">guests</span></span> }],
    });
  }

  if (!hold) { // a hold already carries its room number at the left of the bar
    out.push({
      key: 'room',
      variants: [{ w: chipW(b.room_number), node: <span className="shrink-0 rounded px-1 font-mono font-semibold" style={{ backgroundColor: roomTone.fill, boxShadow: `inset 0 0 0 1px ${roomTone.edge}` }}>{b.room_number}</span> }],
    });
  }
  if (b.check_in_time) out.push({ key: 'tin', variants: [{ w: chipW(b.check_in_time) + ICON + 2, node: <Chip tone="in"><span className="flex items-center gap-0.5"><SignIn size={ICON} aria-hidden="true" /><span className="sr-only">in </span>{b.check_in_time}</span></Chip> }, { w: chipW(b.check_in_time), node: <Chip tone="in">{b.check_in_time}</Chip> }] });
  if (b.check_out_time) out.push({ key: 'tout', variants: [{ w: chipW(b.check_out_time) + ICON + 2, node: <Chip tone="out"><span className="flex items-center gap-0.5"><SignOut size={ICON} aria-hidden="true" /><span className="sr-only">out </span>{b.check_out_time}</span></Chip> }, { w: chipW(b.check_out_time), node: <Chip tone="out">{b.check_out_time}</Chip> }] });
  return out;
}

// `width` is the room for text beside the bar's icons; `height` is the whole bar. Returns lines of nodes (after the name line).
export function packInfo(b, roomTone, hold, width, height, big = false) {
  CH = 8.4;
  const maxLines = Math.floor((height - 6) / LINE) - 1; // the name takes the first line
  if (maxLines < 1 || width < 70) return [];
  const lines = [{ used: 0, nodes: [] }];
  for (const item of items(b, roomTone, hold)) {
    let placed = false;
    const line = lines[lines.length - 1];
    const gap = line.nodes.length ? GAP : 0;
    const fit = item.variants.find((v) => line.used + gap + v.w <= width);
    if (fit) {
      line.used += gap + fit.w;
      line.nodes.push({ key: item.key, node: fit.node });
      placed = true;
    } else if (line.nodes.length && lines.length < maxLines) {
      const alone = item.variants.find((v) => v.w <= width);
      if (alone) {
        lines.push({ used: alone.w, nodes: [{ key: item.key, node: alone.node }] });
        placed = true;
      }
    }
    if (!placed) continue; // too wide even alone: left out, a smaller item after it may still fit
  }
  return lines.filter((l) => l.nodes.length);
}
