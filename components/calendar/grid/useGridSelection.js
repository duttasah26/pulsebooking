import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, diffDays, fmtDayMonth, nightsLabel } from '../../../lib/dates';

/*
  Selecting free nights on the grid to place a hold.
    mouse / pen: press on a free cell and drag. A drag can cover several dates and several rooms.
    touch:       tap one corner, then tap the opposite corner (the grid keeps scrolling normally).
    keyboard:    Enter on a cell works like a tap.
  A selection only grows over free nights, so it never overlaps an existing booking.
  sel = { rA, rB, a, b, dragging?, pending? }: room rows rA..rB and day columns a..b (either order).
*/
export function useGridSelection({ rooms, days, occupancy, onCreate }) {
  const [sel, setSel] = useState(null);
  const pointerType = useRef('mouse');
  const selRef = useRef(sel);
  selRef.current = sel;

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
    set({ rA: r, rB: r, a: i, b: i, dragging: true, invert: e.shiftKey || e.ctrlKey || e.metaKey });
    // Listen for the release from this very moment (not after the next render), so even a very quick click is caught.
    const up = (ev) => {
      window.removeEventListener('pointercancel', cancel);
      const s = selRef.current;
      if (s?.dragging) finish(s, { invert: s.invert || ev.shiftKey || ev.ctrlKey || ev.metaKey });
    };
    const cancel = () => {
      window.removeEventListener('pointerup', up);
      setSel(null);
    };
    window.addEventListener('pointerup', up, { once: true });
    window.addEventListener('pointercancel', cancel, { once: true });
  };

  // Attached to the scrolling container: while dragging, follow the cell under the pointer.
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
    Boolean(sel) &&
    r >= Math.min(sel.rA, sel.rB) && r <= Math.max(sel.rA, sel.rB) &&
    i >= Math.min(sel.a, sel.b) && i <= Math.max(sel.a, sel.b);

  // A short description of the selection in progress, for the live summary.
  const summary = useMemo(() => {
    if (!sel) return null;
    const { roomIds, checkIn, checkOut } = rangeOf(sel);
    const rr = roomIds.length > 1 ? `${roomIds.length} rooms` : `Room ${rooms[Math.min(sel.rA, sel.rB)].number}`;
    const last = addDays(checkOut, -1);
    const when = checkIn === last ? fmtDayMonth(checkIn) : `${fmtDayMonth(checkIn)} to ${fmtDayMonth(last)}`;
    return `${rr}, ${when}, ${nightsLabel(diffDays(checkIn, checkOut))}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, rooms, days]);

  return {
    sel,
    summary,
    isFree,
    selected,
    onPointerDown,
    onPointerMove,
    onClick,
    cancel: () => setSel(null),
    confirm: () => sel && finish(sel),
    // the corner cell shows the size of the selection, for example "3x2n"
    cornerR: sel ? sel.rB : -1,
    cornerI: sel ? sel.b : -1,
    roomCount: sel ? Math.abs(sel.rB - sel.rA) + 1 : 0,
    nightCount: sel ? Math.abs(sel.b - sel.a) + 1 : 0,
  };
}
