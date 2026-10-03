import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, Clock } from '@phosphor-icons/react';
import { COLORS, colorFor } from '../../lib/colors';
import {
  addDays, dayOfMonth, diffDays, fmtDayMonth, fmtMonthShort, fmtShort, fmtWeekday, isWeekend, nightsLabel, today,
} from '../../lib/dates';

const LABEL = 88; // px, label column in the timeline
const HEAD = 52; // px, header row in the timeline
const GAP = 3; // px, space around a bar
const OVERLAP = 3; // px a bar reaches past the middle of its arrival or departure day

/*
  One grid, two layouts.
    orientation="rows": rooms down the side, days across (timeline)
    orientation="cols": days down the side, rooms across (default month sheet)

  Creating a booking:
    mouse / pen: press on a free cell and drag. A drag can cover several dates and several rooms.
    touch:       tap one corner, then tap the opposite corner (the grid keeps scrolling normally).
    keyboard:    Enter on a cell works like a tap.
  A selection only grows over free nights, so it never overlaps an existing booking.

  Bars run from the middle of the arrival day to the middle of the departure day, so a guest leaving on the
  5th and another arriving on the 5th share that day, with a slight overlap.
*/
export default function RoomGrid({ rooms, days, bookings, orientation, onCreate, onOpen, draft }) {
  const rows = orientation === 'rows';
  const n = days.length;
  const start = days[0];
  const todayStr = today();
  const cellW = rows ? 48 : 60;
  const cellH = rows ? 56 : 48;

  const [sel, setSel] = useState(null); // { rA, rB, a, b, dragging?, pending? }
  const pointerType = useRef('mouse');
  const selRef = useRef(sel);
  selRef.current = sel;

  const roomIndex = useMemo(() => new Map(rooms.map((room, i) => [room.id, i])), [rooms]);

  // occupancy[r][i] = the booking holding that room on night i (or null)
  const occupancy = useMemo(() => {
    const map = rooms.map(() => Array(n).fill(null));
    for (const b of bookings) {
      if (b.status === 'cancelled') continue;
      const r = roomIndex.get(b.room_id);
      if (r === undefined) continue;
      const from = Math.max(0, diffDays(start, b.check_in));
      const to = Math.min(n, diffDays(start, b.check_out));
      for (let i = from; i < to; i++) map[r][i] = b;
    }
    return map;
  }, [rooms, roomIndex, bookings, n, start]);

  const isFree = (r, i) => !occupancy[r][i];
  const rectFree = (r1, r2, d1, d2) => {
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
      for (let i = Math.min(d1, d2); i <= Math.max(d1, d2); i++) if (!isFree(r, i)) return false;
    }
    return true;
  };

  // Move the far corner of a selection toward (r, i), shrinking until the rectangle is free.
  const reach = (s, r, i) => {
    let rB = r;
    let b = i;
    while (rB !== s.rA && !rectFree(s.rA, rB, s.a, b)) rB += rB > s.rA ? -1 : 1;
    while (b !== s.a && !rectFree(s.rA, rB, s.a, b)) b += b > s.a ? -1 : 1;
    return { ...s, rB, b };
  };

  const rangeOf = (s) => ({
    roomIds: rooms.slice(Math.min(s.rA, s.rB), Math.max(s.rA, s.rB) + 1).map((room) => room.id),
    checkIn: days[Math.min(s.a, s.b)],
    checkOut: addDays(days[Math.max(s.a, s.b)], 1),
  });

  const finish = (s, opts) => {
    setSel(null);
    onCreate(rangeOf(s), opts);
  };

  // Mouse drag: finish on release anywhere, cancel if the pointer is interrupted.
  const dragging = Boolean(sel?.dragging);
  useEffect(() => {
    if (!dragging) return;
    const up = () => {
      const s = selRef.current;
      if (s?.dragging) finish(s);
    };
    const cancel = () => setSel(null);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  // Escape cancels a pending touch selection.
  useEffect(() => {
    if (!sel) return;
    const onKey = (e) => e.key === 'Escape' && setSel(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel]);

  const set = (next) => {
    selRef.current = next; // read by the release handler before React re-renders
    setSel(next);
  };

  const onPointerDown = (e, r, i) => {
    pointerType.current = e.pointerType;
    if (e.pointerType === 'touch' || e.button !== 0 || !isFree(r, i)) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    set({ rA: r, rB: r, a: i, b: i, dragging: true });
  };

  const onPointerMove = (e) => {
    const s = selRef.current;
    if (!s?.dragging) return;
    const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-cell]');
    if (!cell) return;
    const next = reach(s, Number(cell.dataset.r), Number(cell.dataset.i));
    if (next.rB !== s.rB || next.b !== s.b) set(next);
  };

  const onClick = (e, r, i) => {
    const fromKeyboard = e.detail === 0;
    if (!fromKeyboard && pointerType.current !== 'touch') return; // mouse / pen are handled by drag
    if (!isFree(r, i)) return;
    if (!sel?.pending) {
      set({ rA: r, rB: r, a: i, b: i, pending: true });
      return;
    }
    finish(reach(sel, r, i));
  };

  const selected = (r, i) =>
    sel &&
    r >= Math.min(sel.rA, sel.rB) && r <= Math.max(sel.rA, sel.rB) &&
    i >= Math.min(sel.a, sel.b) && i <= Math.max(sel.a, sel.b);

  const place = (r, i, len = 1) =>
    rows
      ? { gridRow: r + 2, gridColumn: len > 1 ? `${i + 2} / span ${len}` : i + 2 }
      : { gridColumn: r + 2, gridRow: len > 1 ? `${i + 2} / span ${len}` : i + 2 };

  // Where a stay is drawn: from the middle of the arrival day to the middle of the departure day.
  const geometry = (checkIn, checkOut) => {
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
  };

  const bars = useMemo(() => {
    const out = [];
    const sorted = [...bookings].sort((x, y) => (x.check_in < y.check_in ? -1 : x.check_in > y.check_in ? 1 : x.id - y.id));
    for (const b of sorted) {
      if (b.status === 'cancelled') continue;
      const r = roomIndex.get(b.room_id);
      const g = r === undefined ? null : geometry(b.check_in, b.check_out);
      if (g) out.push({ b, r, g });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, roomIndex, start, n, rows]);

  // The booking being created stays on the grid as a dashed block until it is saved or cancelled.
  const draftBars = useMemo(() => {
    if (!draft) return [];
    const g = geometry(draft.checkIn, draft.checkOut);
    if (!g) return [];
    const color = COLORS.find((c) => c.key === draft.color);
    return draft.roomIds
      .map((id) => roomIndex.get(id))
      .filter((r) => r !== undefined)
      .map((r) => ({ r, g, color, key: `${rooms[r].id}-${draft.checkIn}-${draft.checkOut}-${draft.color}` }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, roomIndex, rooms, start, n, rows]);
  const draftNights = draft ? diffDays(draft.checkIn, draft.checkOut) : 0;

  const template = rows
    ? { gridTemplateColumns: `${LABEL}px repeat(${n}, minmax(${cellW}px, 1fr))`, gridTemplateRows: `${HEAD}px repeat(${rooms.length}, ${cellH}px)` }
    : { gridTemplateColumns: `80px repeat(${rooms.length}, minmax(${cellW}px, 1fr))`, gridTemplateRows: `${HEAD - 8}px repeat(${n}, ${cellH}px)` };

  // A short description of the selection in progress (drag or tap).
  const summary = useMemo(() => {
    if (!sel) return null;
    const { roomIds, checkIn, checkOut } = rangeOf(sel);
    const rr = roomIds.length > 1 ? `${roomIds.length} rooms` : `Room ${rooms[Math.min(sel.rA, sel.rB)].number}`;
    const last = addDays(checkOut, -1);
    const when = checkIn === last ? fmtDayMonth(checkIn) : `${fmtDayMonth(checkIn)} to ${fmtDayMonth(last)}`;
    return `${rr}, ${when}, ${nightsLabel(diffDays(checkIn, checkOut))}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, rooms, days]);

  const cornerR = sel ? sel.rB : -1;
  const roomCount = sel ? Math.abs(sel.rB - sel.rA) + 1 : 0;
  const nightCount = sel ? Math.abs(sel.b - sel.a) + 1 : 0;

  return (
    <div className="relative">
      <div
        className="max-h-[calc(100dvh-15rem)] min-h-64 overflow-auto overscroll-contain rounded-lg border border-line bg-surface md:max-h-[calc(100dvh-12rem)]"
        onPointerMove={onPointerMove}
      >
        <div className="grid select-none" style={{ ...template, minWidth: 'max-content' }} role="grid" aria-label="Room availability">
          {/* corner */}
          <div className="sticky left-0 top-0 z-[3] border-b border-r border-line bg-surface" style={{ gridRow: 1, gridColumn: 1 }} />

          {/* day headers (rows) or room headers (cols) */}
          {rows
            ? days.map((d, i) => (
                <div
                  key={d}
                  className={`sticky top-0 z-[2] flex flex-col items-center justify-center border-b border-line text-xs ${
                    isWeekend(d) ? 'bg-surface-2' : 'bg-surface'
                  } ${d === todayStr ? 'font-semibold text-accent' : 'text-muted'}`}
                  style={{ gridRow: 1, gridColumn: i + 2 }}
                >
                  <span>{i === 0 || dayOfMonth(d) === 1 ? fmtMonthShort(d) : fmtWeekday(d)}</span>
                  <span className="font-mono text-sm text-ink">{dayOfMonth(d)}</span>
                </div>
              ))
            : rooms.map((room, r) => (
                <div
                  key={room.id}
                  className="sticky top-0 z-[2] flex items-center justify-center border-b border-l border-line bg-surface font-mono text-sm font-semibold"
                  style={{ gridRow: 1, gridColumn: r + 2 }}
                >
                  {room.number}
                </div>
              ))}

          {/* labels down the side */}
          {rows
            ? rooms.map((room, r) => (
                <div
                  key={room.id}
                  className="sticky left-0 z-[2] flex items-center border-r border-t border-line bg-surface px-3 font-mono text-sm font-semibold"
                  style={{ gridRow: r + 2, gridColumn: 1 }}
                >
                  {room.number}
                </div>
              ))
            : days.map((d, i) => (
                <div
                  key={d}
                  className={`sticky left-0 z-[2] flex flex-col justify-center border-r border-t border-line px-2 text-xs ${
                    isWeekend(d) ? 'bg-surface-2' : 'bg-surface'
                  } ${d === todayStr ? 'font-semibold text-accent' : 'text-muted'}`}
                  style={{ gridRow: i + 2, gridColumn: 1 }}
                >
                  <span>{fmtWeekday(d)}</span>
                  <span className="whitespace-nowrap font-mono text-sm text-ink">{fmtDayMonth(d)}</span>
                </div>
              ))}

          {/* cells */}
          {rooms.map((room, r) =>
            days.map((d, i) => {
              const free = isFree(r, i);
              const isSel = selected(r, i);
              const tint = isWeekend(d) ? 'bg-surface-2' : 'bg-surface';
              if (!free) {
                return <div key={`${room.id}-${d}`} aria-hidden="true" className={`border-l border-t border-line ${tint}`} style={place(r, i)} />;
              }
              return (
                <button
                  key={`${room.id}-${d}`}
                  type="button"
                  role="gridcell"
                  data-cell
                  data-r={r}
                  data-i={i}
                  aria-label={`Room ${room.number}, ${fmtShort(d)}, free`}
                  aria-pressed={isSel || undefined}
                  className={`cell relative flex touch-manipulation items-center justify-center border-l border-t border-line transition-colors ${
                    isSel ? 'animate-pop bg-accent-soft' : `${tint} hover:bg-accent-soft/60`
                  }`}
                  style={place(r, i)}
                  onPointerDown={(e) => onPointerDown(e, r, i)}
                  onClick={(e) => onClick(e, r, i)}
                >
                  {isSel && r === cornerR && i === sel.b && (
                    <span className="pointer-events-none rounded-lg bg-accent px-1.5 py-0.5 font-mono text-[11px] font-semibold text-accent-ink">
                      {roomCount > 1 ? `${roomCount}x` : ''}{nightCount}n
                    </span>
                  )}
                </button>
              );
            }),
          )}

          {/* booking bars: arrival day middle to departure day middle */}
          {bars.map(({ b, r, g }) => {
            const c = colorFor(b);
            const hold = b.status === 'on_hold';
            const label = `${b.name}, Room ${b.room_number}, ${fmtShort(b.check_in)} to ${fmtShort(b.check_out)}`;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onOpen(b)}
                title={label}
                aria-label={`${label}, ${b.status.replace('_', ' ')}`}
                className={`animate-bar-in relative z-[1] flex min-w-0 items-center gap-1 overflow-hidden rounded-lg border px-2 text-left text-xs font-medium text-ink transition-transform active:scale-[0.98] ${
                  hold ? 'border-dashed' : ''
                } ${b.status === 'checked_out' ? 'opacity-60' : ''} ${
                  g.cutStart ? (rows ? 'rounded-l-none border-l-0' : 'rounded-t-none border-t-0') : ''
                } ${g.cutEnd ? (rows ? 'rounded-r-none border-r-0' : 'rounded-b-none border-b-0') : ''}`}
                style={{
                  ...place(r, g.a, g.len),
                  ...g.margin,
                  backgroundColor: c.bg,
                  borderColor: c.border,
                  boxShadow: '0 0 0 1.5px var(--surface)',
                  ...(hold
                    ? { backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 5px, rgb(255 255 255 / 0.55) 5px 7px)' }
                    : {}),
                }}
              >
                {b.status === 'checked_in' && <CheckCircle size={14} weight="fill" className="shrink-0" />}
                {hold && <Clock size={14} className="shrink-0" />}
                <span className="truncate">{b.name}</span>
              </button>
            );
          })}

          {/* draft booking, one block per selected room */}
          {draftBars.map(({ r, g, color, key }) => (
            <div
              key={key}
              aria-hidden="true"
              className="animate-pop pointer-events-none relative z-[1] flex min-w-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed px-1 text-xs font-semibold text-ink"
              style={{
                ...place(r, g.a, g.len),
                ...g.margin,
                backgroundColor: color?.bg ?? 'var(--accent-soft)',
                borderColor: color?.border ?? 'var(--accent)',
              }}
            >
              <span className="truncate">{rows ? `New, ${draftNights}n` : `${draftNights}n`}</span>
            </div>
          ))}
        </div>
      </div>

      {/* live summary of the selection being made */}
      {summary && (
        <p
          aria-live="polite"
          className="pointer-events-none absolute right-2 top-2 z-[4] max-w-[85%] rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-canvas shadow-lg"
        >
          {summary}
        </p>
      )}

      {/* touch: pending selection bar */}
      {sel?.pending && (
        <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 md:bottom-6">
          <div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-line bg-surface p-2 pl-4 shadow-lg">
            <p className="flex-1 text-sm">
              <span className="font-medium">{summary}</span>
              <span className="block text-muted">Tap the opposite corner to extend</span>
            </p>
            <button type="button" className="btn" onClick={() => setSel(null)}>Cancel</button>
            <button type="button" className="btn" onClick={() => finish(sel, { hold: true })}>Hold</button>
            <button type="button" className="btn btn-primary" onClick={() => finish(sel)}>Book</button>
          </div>
        </div>
      )}
    </div>
  );
}
