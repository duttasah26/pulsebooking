import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle } from '@phosphor-icons/react';
import { COLORS, colorFor } from '../../lib/colors';
import {
  addDays, dayOfMonth, diffDays, fmtDayMonth, fmtMonthShort, fmtShort, fmtWeekday, isWeekend, today,
} from '../../lib/dates';

// Bars use the booking's pastel colour (see lib/colors.js). Cancelled bookings are not drawn (they free the room).
// Checked in shows a tick, checked out is faded.

const LABEL = 88; // px, room or date label column
const HEAD = 52; // px, header row

/*
  One grid, two layouts.
    orientation="rows": rooms down the side, days across (timeline)
    orientation="cols": days down the side, rooms across (month sheet)

  Creating a booking:
    mouse / pen: press on a free cell and drag along the room, release to continue.
    touch:       tap the first night, then tap the last night (the grid keeps scrolling normally).
    keyboard:    Enter on a cell works like a tap.
  Bookings in the way stop the selection, so a selection never overlaps one.
*/
export default function RoomGrid({ rooms, days, bookings, orientation, onCreate, onOpen, draft }) {
  const rows = orientation === 'rows';
  const n = days.length;
  const start = days[0];
  const todayStr = today();
  const cellW = rows ? 48 : 60;
  const cellH = rows ? 56 : 48;

  const [sel, setSel] = useState(null); // { r, a, b, dragging?, pending? }
  const pointerType = useRef('mouse');

  const occupancy = useMemo(() => {
    const map = new Map(rooms.map((room) => [room.id, Array(n).fill(null)]));
    for (const b of bookings) {
      if (b.status === 'cancelled') continue;
      const slots = map.get(b.room_id);
      if (!slots) continue;
      const from = Math.max(0, diffDays(start, b.check_in));
      const to = Math.min(n, diffDays(start, b.check_out));
      for (let i = from; i < to; i++) slots[i] = b;
    }
    return map;
  }, [rooms, bookings, n, start]);

  const isFree = (r, i) => !occupancy.get(rooms[r].id)[i];

  // Move the end of a selection from `a` toward `i`, stopping before any booked night.
  const extend = (r, a, i) => {
    const step = i >= a ? 1 : -1;
    let end = a;
    for (let k = a + step; step > 0 ? k <= i : k >= i; k += step) {
      if (!isFree(r, k)) break;
      end = k;
    }
    return end;
  };

  const finish = (s) => {
    const lo = Math.min(s.a, s.b);
    const hi = Math.max(s.a, s.b);
    setSel(null);
    onCreate({ room: rooms[s.r], checkIn: days[lo], checkOut: addDays(days[hi], 1) });
  };

  // Mouse drag: finish on release anywhere, cancel if the pointer is interrupted.
  const selRef = useRef(sel);
  selRef.current = sel;
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

  const onPointerDown = (e, r, i) => {
    pointerType.current = e.pointerType;
    if (e.pointerType === 'touch' || e.button !== 0 || !isFree(r, i)) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const next = { r, a: i, b: i, dragging: true };
    selRef.current = next; // read by the release handler before React re-renders
    setSel(next);
  };

  const onPointerMove = (e) => {
    const s = selRef.current;
    if (!s?.dragging) return;
    const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-cell]');
    if (!cell || Number(cell.dataset.r) !== s.r) return;
    const b = extend(s.r, s.a, Number(cell.dataset.i));
    if (b !== s.b) {
      const next = { ...s, b };
      selRef.current = next;
      setSel(next);
    }
  };

  const onClick = (e, r, i) => {
    const fromKeyboard = e.detail === 0;
    if (!fromKeyboard && pointerType.current !== 'touch') return; // mouse / pen are handled by drag
    if (!isFree(r, i)) return;
    if (!sel?.pending || sel.r !== r) {
      setSel({ r, a: i, b: i, pending: true });
      return;
    }
    finish({ ...sel, b: extend(r, sel.a, i) });
  };

  const selected = (r, i) => sel && sel.r === r && i >= Math.min(sel.a, sel.b) && i <= Math.max(sel.a, sel.b);

  const place = (r, i, len = 1) =>
    rows
      ? { gridRow: r + 2, gridColumn: len > 1 ? `${i + 2} / span ${len}` : i + 2 }
      : { gridColumn: r + 2, gridRow: len > 1 ? `${i + 2} / span ${len}` : i + 2 };

  const bars = useMemo(() => {
    const out = [];
    rooms.forEach((room, r) => {
      for (const b of bookings) {
        if (b.room_id !== room.id || b.status === 'cancelled') continue;
        const from = diffDays(start, b.check_in);
        const to = diffDays(start, b.check_out);
        if (to <= 0 || from >= n) continue;
        out.push({ b, r, i: Math.max(0, from), len: Math.min(n, to) - Math.max(0, from), cutStart: from < 0, cutEnd: to > n });
      }
    });
    return out;
  }, [rooms, bookings, start, n]);

  // The booking being created stays on the grid as a dashed block until it is saved or cancelled.
  const draftBar = useMemo(() => {
    if (!draft) return null;
    const r = rooms.findIndex((room) => room.id === draft.roomId);
    if (r < 0) return null;
    const from = diffDays(start, draft.checkIn);
    const to = diffDays(start, draft.checkOut);
    if (to <= 0 || from >= n) return null;
    const i = Math.max(0, from);
    return {
      r, i, len: Math.min(n, to) - i, nights: to - from,
      color: COLORS.find((c) => c.key === draft.color),
      key: `${draft.roomId}-${draft.checkIn}-${draft.checkOut}-${draft.color}`,
    };
  }, [draft, rooms, start, n]);

  const template = rows
    ? { gridTemplateColumns: `${LABEL}px repeat(${n}, minmax(${cellW}px, 1fr))`, gridTemplateRows: `${HEAD}px repeat(${rooms.length}, ${cellH}px)` }
    : { gridTemplateColumns: `80px repeat(${rooms.length}, minmax(${cellW}px, 1fr))`, gridTemplateRows: `${HEAD - 8}px repeat(${n}, ${cellH}px)` };

  const pendingLo = sel ? Math.min(sel.a, sel.b) : 0;
  const pendingHi = sel ? Math.max(sel.a, sel.b) : 0;

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
                  {isSel && i === sel.b && (
                    <span className="pointer-events-none rounded-lg bg-accent px-1.5 py-0.5 font-mono text-[11px] font-semibold text-accent-ink">
                      {pendingHi - pendingLo + 1}n
                    </span>
                  )}
                </button>
              );
            }),
          )}

          {/* booking bars */}
          {bars.map(({ b, r, i, len, cutStart, cutEnd }) => {
            const c = colorFor(b);
            const label = `${b.name}, Room ${b.room_number}, ${fmtShort(b.check_in)} to ${fmtShort(b.check_out)}`;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onOpen(b)}
                title={label}
                aria-label={`${label}, ${b.status.replace('_', ' ')}`}
                className={`animate-bar-in relative z-[1] m-[3px] flex min-w-0 items-center gap-1 overflow-hidden rounded-lg border px-2 text-left text-xs font-medium text-ink transition-transform active:scale-[0.98] ${
                  b.status === 'checked_out' ? 'opacity-60' : ''
                } ${cutStart ? (rows ? 'rounded-l-none border-l-0' : 'rounded-t-none border-t-0') : ''} ${
                  cutEnd ? (rows ? 'rounded-r-none border-r-0' : 'rounded-b-none border-b-0') : ''
                }`}
                style={{ ...place(r, i, len), backgroundColor: c.bg, borderColor: c.border }}
              >
                {b.status === 'checked_in' && <CheckCircle size={14} weight="fill" className="shrink-0" />}
                <span className="truncate">{b.name}</span>
              </button>
            );
          })}

          {/* draft booking */}
          {draftBar && (
            <div
              key={draftBar.key}
              aria-hidden="true"
              className="animate-pop pointer-events-none relative z-[1] m-[3px] flex min-w-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed px-1 text-xs font-semibold text-ink"
              style={{
                ...place(draftBar.r, draftBar.i, draftBar.len),
                backgroundColor: draftBar.color?.bg ?? 'var(--accent-soft)',
                borderColor: draftBar.color?.border ?? 'var(--accent)',
              }}
            >
              <span className="truncate">{rows ? `New booking, ${draftBar.nights}n` : `${draftBar.nights}n`}</span>
            </div>
          )}
        </div>
      </div>

      {/* touch: pending selection bar */}
      {sel?.pending && (
        <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 md:bottom-6">
          <div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-line bg-surface p-2 pl-4 shadow-lg">
            <p className="flex-1 text-sm">
              <span className="font-medium">
                Room {rooms[sel.r].number}, {fmtDayMonth(days[pendingLo])}
                {pendingHi > pendingLo ? ` to ${fmtDayMonth(days[pendingHi])}` : ''}
              </span>
              <span className="block text-muted">Tap an end night to extend</span>
            </p>
            <button type="button" className="btn" onClick={() => setSel(null)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={() => finish(sel)}>Book</button>
          </div>
        </div>
      )}
    </div>
  );
}
