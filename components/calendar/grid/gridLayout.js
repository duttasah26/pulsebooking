import { diffDays } from '../../../lib/dates';

// Sizes in px. The grid has two layouts:
//   rows (timeline):  rooms down the side, days across
//   cols (month):     days down the side, rooms across
export const LABEL = 64; // label column in the timeline
export const HEAD = 38; // header row in the timeline
export const DATE_LABEL = 92; // date column in the month sheet (one line: "Thu 1 Oct")
export const MONTH_HEAD = 30; // room header row in the month sheet
const GAP = 3; // space around a bar

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

// "14:30" as a share of the day (0 to 1), or `fallback` when there is no time.
export const dayFraction = (time, fallback) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(time ?? '');
  return m ? Math.min(1, (Number(m[1]) * 60 + Number(m[2])) / 1440) : fallback;
};

const MIN_LEN = 0.4; // a bar is never shorter than this share of a cell

// Where a stay is drawn: from the check-in time on the arrival day to the check-out time on the departure day (a share
// of each day's cell), so a bar's length shows how long the stay really is, and a guest leaving at 11:00 and another
// arriving at 14:00 leave a small gap on the turnover day. fIn and fOut are those times as shares of the day.
// Returns null when the stay is off screen.
export function barGeometry({ rows, start, n, cellH }, checkIn, checkOut, fIn = 0.5, fOut = 0.5) {
  const first = diffDays(start, checkIn);
  const out = diffDays(start, checkOut);
  if (out < 0 || first >= n) return null;
  const a = Math.max(0, first);
  const e = Math.min(n - 1, out);
  const len = e - a + 1;
  const halfStart = first >= 0;
  const halfEnd = out <= n - 1;
  let from = halfStart ? fIn : 0;
  const to = halfEnd ? fOut : 1;
  if (len - 1 + to - from < MIN_LEN) from = Math.max(0, len - 1 + to - MIN_LEN); // keep very short stays visible
  // `before` and `after` are how far the bar starts after the cell edge and ends before the other edge.
  const before = !halfStart ? `${GAP}px` : rows ? `calc(${(from * 100) / len}% + 1px)` : `${cellH * from + 1}px`;
  const after = !halfEnd ? `${GAP}px` : rows ? `calc(${((1 - to) * 100) / len}% + 1px)` : `${cellH * (1 - to) + 1}px`;
  const margin = rows
    ? { margin: GAP, marginLeft: before, marginRight: after }
    : { margin: GAP, marginTop: before, marginBottom: after };
  return { a, len, cutStart: !halfStart, cutEnd: !halfEnd, margin };
}
