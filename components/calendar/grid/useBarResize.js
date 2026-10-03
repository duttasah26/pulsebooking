import { useState } from 'react';
import { DATE_LABEL, HEAD, LABEL, MONTH_HEAD } from './gridLayout';
import { addDays, diffDays } from '../../../lib/dates';

/*
  Pencil tool: change an existing booking by dragging one of its small arrows.
    start arrow:  moves check-in (drag outward to start earlier, inward to start later)
    end arrow:    moves check-out (drag outward to stay longer, inward to leave sooner)
    move handle:  slides the whole stay to other days, and to another room if you drag up or down
  Dates snap to whole days. The bar stops at the next booked night (a booking can end on the day another begins, but
  cannot run into it), and a move only goes where every night is free. Letting go calls
  onResize(booking, checkIn, checkOut, roomId, { x, y }) if anything changed (the grid then asks you to Save). `drag` is the booking as it is being changed, so
  the grid can draw it live.
  Timeline: days run across, rooms down. Month sheet: days run down, rooms across.
*/
export function useBarResize({ enabled, rows, days, rooms, gridRef, zoom, isBusy, onResize }) {
  const [drag, setDrag] = useState(null);

  const startResize = (e, b, edge) => {
    if (!enabled || e.button !== 0 || b.id < 0) return;
    const moving = edge === 'move'; // dragging the bar itself: starts only after a few pixels, so a plain click still opens it
    if (!moving) {
      e.stopPropagation();
      e.preventDefault();
    }
    const n = days.length;
    let cur = { id: b.id, edge, checkIn: b.check_in, checkOut: b.check_out, roomId: b.room_id, x: e.clientX, y: e.clientY };
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

    const fitEnd = (day) => {
      let out = day <= b.check_in ? addDays(b.check_in, 1) : day;
      for (let d = b.check_out; d < out; d = addDays(d, 1)) {
        if (isBusy(b.room_id, d, b.id)) {
          out = d;
          break;
        }
      }
      return { checkOut: out };
    };
    const fitStart = (day) => {
      let inn = day >= b.check_out ? addDays(b.check_out, -1) : day;
      for (let d = addDays(b.check_in, -1); d >= inn; d = addDays(d, -1)) {
        if (isBusy(b.room_id, d, b.id)) {
          inn = addDays(d, 1);
          break;
        }
      }
      return { checkIn: inn };
    };
    // Every night of the stay free in that room (the booking's own nights do not count)?
    const free = (roomId, checkIn, checkOut) => {
      for (let d = checkIn; d < checkOut; d = addDays(d, 1)) if (isBusy(roomId, d, b.id)) return false;
      return true;
    };
    const fitMove = (pos) => {
      const shift = pos.day - start.day;
      const targetRoom = rooms[Math.max(0, Math.min(rooms.length - 1, startRoom + (pos.room - start.room)))];
      // Try the full move, then only the days, then only the room; keep where it was if none of those fit.
      for (const [dd, room] of [[shift, targetRoom], [shift, rooms[startRoom]], [0, targetRoom]]) {
        const checkIn = addDays(b.check_in, dd);
        const checkOut = addDays(b.check_out, dd);
        if (room && free(room.id, checkIn, checkOut)) return { checkIn, checkOut, roomId: room.id };
      }
      return { checkIn: cur.checkIn, checkOut: cur.checkOut, roomId: cur.roomId };
    };

    const move = (ev) => {
      if (!engaged) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return;
        engaged = true;
      }
      const pos = position(ev);
      const next = edge === 'end' ? fitEnd(days[pos.day]) : edge === 'start' ? fitStart(days[pos.day]) : fitMove(pos);
      cur = { ...cur, ...next, x: ev.clientX, y: ev.clientY };
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
      if (cur.checkIn !== b.check_in || cur.checkOut !== b.check_out || cur.roomId !== b.room_id) {
        onResize(b, cur.checkIn, cur.checkOut, cur.roomId, { x: cur.x, y: cur.y });
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  return { drag, startResize, nightsOf: (d) => diffDays(d.checkIn, d.checkOut) };
}
