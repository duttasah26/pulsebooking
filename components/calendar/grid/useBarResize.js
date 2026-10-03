import { useState } from 'react';
import { DATE_LABEL, HEAD, LABEL, MONTH_HEAD } from './gridLayout';
import { addDays, diffDays } from '../../../lib/dates';

/*
  Pencil tool: change an existing booking by dragging one of its extenders, or the bar itself.
    start extender: moves check-in (drag outward to start earlier, inward to start later)
    end extender:   moves check-out (drag outward to stay longer, inward to leave sooner)
    the bar:        slides the whole stay to other days, and to another room if you drag up or down
  Dates snap to whole days. The bar stops at the next booked night (a booking can end on the day another begins, but
  cannot run into it), and a move only goes where every night is free.

  Group changes: when the booking is one of several selected (or of an open group), every one of them changes by the same
  number of days; a booking that would run into another booking stays as it is. linkedFor(booking) gives that list.

  Letting go calls onResize(items, { x, y }) if anything changed; the page keeps the change as pending until Save.
  Each item is { original, checkIn, checkOut, roomId } (original = the booking as saved). `drag` is the same list while the
  pointer is down, so the grid can draw it live.
  Timeline: days run across, rooms down. Month sheet: days run down, rooms across.
*/
export function useBarResize({ enabled, rows, days, rooms, gridRef, zoom, isBusy, linkedFor, onResize }) {
  const [drag, setDrag] = useState(null);

  const startResize = (e, b, edge) => {
    if (!enabled || e.button !== 0 || b.id < 0) return;
    const moving = edge === 'move'; // dragging the bar itself: starts only after a few pixels, so a plain click still opens it
    if (!moving) {
      e.stopPropagation();
      e.preventDefault();
    }
    const n = days.length;
    const others = (linkedFor?.(b) ?? []).filter((o) => o.id !== b.id && o.id > 0);
    const asItem = (o) => ({ original: o, checkIn: o.check_in, checkOut: o.check_out, roomId: o.room_id });
    let cur = { id: b.id, edge, items: [asItem(b), ...others.map(asItem)], x: e.clientX, y: e.clientY, checkIn: b.check_in, checkOut: b.check_out, roomId: b.room_id };
    let engaged = !moving;
    if (engaged) setDrag(cur);
    const x0 = e.clientX;
    const y0 = e.clientY;

    // Where the pointer is inside the (possibly zoomed) grid: which day, and which room.
    const position = (ev) => {
      const rect = gridRef.current.getBoundingClientRect();
      const x = (ev.clientX - rect.left) / zoom;
      const y = (ev.clientY - rect.top) / zoom;
      const w = rect.width / zoom;
      const h = rect.height / zoom;
      const dayAlong = rows ? x - LABEL : y - MONTH_HEAD;
      const dayRange = rows ? w - LABEL : h - MONTH_HEAD;
      const roomAlong = rows ? y - HEAD : x - DATE_LABEL;
      const roomRange = rows ? h - HEAD : w - DATE_LABEL;
      const clamp = (v, max) => Math.max(0, Math.min(max - 1, v));
      return {
        day: clamp(Math.floor(dayAlong / (dayRange / n)), n),
        room: clamp(Math.floor(roomAlong / (roomRange / rooms.length)), rooms.length),
      };
    };
    const start = position(e);
    const startRoom = rooms.findIndex((r) => r.id === b.room_id);

    // Every night of a stay free in that room (the booking's own nights do not count)?
    const free = (roomId, checkIn, checkOut, id) => {
      for (let d = checkIn; d < checkOut; d = addDays(d, 1)) if (isBusy(roomId, d, id)) return false;
      return true;
    };
    const fitEnd = (day) => {
      let out = day <= b.check_in ? addDays(b.check_in, 1) : day;
      for (let d = b.check_out; d < out; d = addDays(d, 1)) {
        if (isBusy(b.room_id, d, b.id)) {
          out = d;
          break;
        }
      }
      return { checkIn: b.check_in, checkOut: out, roomId: b.room_id };
    };
    const fitStart = (day) => {
      let inn = day >= b.check_out ? addDays(b.check_out, -1) : day;
      for (let d = addDays(b.check_in, -1); d >= inn; d = addDays(d, -1)) {
        if (isBusy(b.room_id, d, b.id)) {
          inn = addDays(d, 1);
          break;
        }
      }
      return { checkIn: inn, checkOut: b.check_out, roomId: b.room_id };
    };
    const fitMove = (pos) => {
      const shift = pos.day - start.day;
      const targetRoom = rooms[Math.max(0, Math.min(rooms.length - 1, startRoom + (pos.room - start.room)))];
      // Try the full move, then only the days, then only the room; keep where it was if none of those fit.
      for (const [dd, room] of [[shift, targetRoom], [shift, rooms[startRoom]], [0, targetRoom]]) {
        const checkIn = addDays(b.check_in, dd);
        const checkOut = addDays(b.check_out, dd);
        if (room && free(room.id, checkIn, checkOut, b.id)) return { checkIn, checkOut, roomId: room.id };
      }
      return { checkIn: cur.checkIn, checkOut: cur.checkOut, roomId: cur.roomId };
    };
    // The others change by the same days as the dragged booking (their room stays); one that would run into another stays put.
    const withOthers = (main) => {
      const dIn = diffDays(b.check_in, main.checkIn);
      const dOut = diffDays(b.check_out, main.checkOut);
      const rest = others.map((o) => {
        const checkIn = addDays(o.check_in, dIn);
        let checkOut = addDays(o.check_out, dOut);
        if (checkOut <= checkIn) checkOut = addDays(checkIn, 1);
        if (!free(o.room_id, checkIn, checkOut, o.id)) return asItem(o);
        return { original: o, checkIn, checkOut, roomId: o.room_id };
      });
      return [{ original: b, ...main }, ...rest];
    };

    const move = (ev) => {
      if (!engaged) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return;
        engaged = true;
      }
      const pos = position(ev);
      const main = edge === 'end' ? fitEnd(days[pos.day]) : edge === 'start' ? fitStart(days[pos.day]) : fitMove(pos);
      cur = { ...cur, ...main, items: withOthers(main), x: ev.clientX, y: ev.clientY };
      setDrag(cur);
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      setDrag(null);
      if (moving && engaged) {
        // the click that ends a drag must not also open the booking
        window.addEventListener('click', (ev) => ev.stopPropagation(), { capture: true, once: true });
      }
      const changed = cur.items.filter((i) => i.checkIn !== i.original.check_in || i.checkOut !== i.original.check_out || i.roomId !== i.original.room_id);
      if (changed.length) onResize(changed, { x: cur.x, y: cur.y });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  return { drag, startResize };
}
