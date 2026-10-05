import { useRef, useState } from 'react';

/*
  Select mode: drag a box over the grid and every booking or hold it touches is ticked (for bulk delete).
    mouse / pen: press anywhere and drag; hold Shift or Ctrl to add to what is already ticked.
    touch:       the grid keeps scrolling, so tap bars one by one instead (the bars handle that themselves).
  A press that does not move on empty space clears the ticks. The box is drawn with position: fixed, so it needs no
  scroll or zoom arithmetic: bars are found by asking the browser where they are (data-bid on each bar).
  picked is a Set of booking ids; onPick(nextSet) replaces it.
*/
export function useMarquee({ enabled, containerRef, picked, onPick }) {
  const [box, setBox] = useState(null);
  const dragged = useRef(false);

  const onPointerDown = (e) => {
    const root = containerRef.current;
    if (!enabled || !root || e.pointerType === 'touch' || e.button !== 0) return;
    // Pressing on a bar that can be moved is the start of moving it, never of drawing a box (the box also re-picked bars).
    if (e.target.closest?.('[data-movable]')) return;
    const x0 = e.clientX;
    const y0 = e.clientY;
    const onBar = Boolean(e.target.closest?.('[data-bid]'));
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    const base = additive ? new Set(picked) : new Set();
    let moved = false;

    const move = (ev) => {
      if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return;
      moved = true;
      const left = Math.min(x0, ev.clientX);
      const top = Math.min(y0, ev.clientY);
      const right = Math.max(x0, ev.clientX);
      const bottom = Math.max(y0, ev.clientY);
      setBox({ left, top, width: right - left, height: bottom - top });
      const next = new Set(base);
      root.querySelectorAll('[data-bid]').forEach((el) => {
        const r = el.getBoundingClientRect();
        const id = Number(el.dataset.bid);
        if (id > 0 && r.right > left && r.left < right && r.bottom > top && r.top < bottom) next.add(id);
      });
      onPick(next);
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      setBox(null);
      if (moved) {
        dragged.current = true; // the click that follows a drag must not also tick the bar under the pointer
        setTimeout(() => { dragged.current = false; }, 0);
      } else if (!onBar && !additive) {
        onPick(new Set());
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  const onClickCapture = (e) => {
    if (dragged.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  return { box, onPointerDown, onClickCapture };
}
