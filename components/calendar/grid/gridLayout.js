import { diffDays } from '../../../lib/dates';

// Sizes in px. The grid has two layouts:
//   rows (timeline):  rooms down the side, days across
//   cols (month):     days down the side, rooms across
export const LABEL = 64; // label column in the timeline
export const HEAD = 38; // header row in the timeline
export const DATE_LABEL = 92; // date column in the month sheet (one line: "Thu 1 Oct")
export const MONTH_HEAD = 30; // room header row in the month sheet
const GAP = 3; // space around a bar
const OVERLAP = 3; // how far a bar reaches past the middle of its arrival or departure day

// Minimum cell width (cells stretch to fill the width) and fixed cell height. Short rows fit a month with little scrolling.
export const cellSize = (rows) => ({ cellW: rows ? 40 : 56, cellH: rows ? 40 : 28 });

// CSS grid placement of cell (r, i), spanning len cells along the day axis.
export const placeAt = (rows, r, i, len = 1) =>
  rows
    ? { gridRow: r + 2, gridColumn: len > 1 ? `${i + 2} / span ${len}` : i + 2 }
    : { gridColumn: r + 2, gridRow: len > 1 ? `${i + 2} / span ${len}` : i + 2 };

export function gridTemplate({ rows, n, rooms, cellW, cellH }) {
  return rows
    ? { gridTemplateColumns: `${LABEL}px repeat(${n}, minmax(${cellW}px, 1fr))`, gridTemplateRows: `${HEAD}px repeat(${rooms.length}, ${cellH}px)` }
    : { gridTemplateColumns: `${DATE_LABEL}px repeat(${rooms.length}, minmax(${cellW}px, 1fr))`, gridTemplateRows: `${MONTH_HEAD}px repeat(${n}, ${cellH}px)` };
}

// The grid is exactly as wide as its columns need, never as wide as its longest booking name. (min-width: max-content
// used to let one long name stretch every column, so the calendar looked zoomed in on a few rooms.)
export const gridMinWidth = ({ rows, n, rooms, cellW }) => (rows ? LABEL + n * cellW : DATE_LABEL + rooms.length * cellW);

// Where a stay is drawn: from the middle of the arrival day to the middle of the departure day, so a guest leaving on
// the 5th and another arriving on the 5th share that day with a slight overlap. Returns null when it is off screen.
export function barGeometry({ rows, start, n, cellH }, checkIn, checkOut) {
  const first = diffDays(start, checkIn);
  const out = diffDays(start, checkOut);
  if (out < 0 || first >= n) return null;
  const a = Math.max(0, first);
  const e = Math.min(n - 1, out);
  const len = e - a + 1;
  const halfStart = first >= 0;
  const halfEnd = out <= n - 1;
  const half = rows ? `calc(${50 / len}% - ${OVERLAP}px)` : `${cellH / 2 - OVERLAP}px`;
  const before = halfStart ? half : `${GAP}px`;
  const after = halfEnd ? half : `${GAP}px`;
  const margin = rows
    ? { margin: GAP, marginLeft: before, marginRight: after }
    : { margin: GAP, marginTop: before, marginBottom: after };
  return { a, len, cutStart: !halfStart, cutEnd: !halfEnd, margin };
}
