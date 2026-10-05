import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/*
  Two small helpers for the day and month pickers.

  useSlide: when `value` changes, the element glides from where the old content was. A strip passes a `unit` (one cell wide)
    and slides by the number of cells it moved, picking up from wherever a running slide had got to, so holding an arrow
    feels like one continuous belt. Page content passes a short fixed `distance` and fades in as it lands.

  useHoldStep: press and hold a button to keep stepping. A quick tap is still an ordinary click. The step starts after a
    short pause, then speeds up. Release anywhere (even if the strip has moved under the finger) to stop.
*/

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function useSlide(ref, value, { delta, unit, distance = 24, max = 7, fade = false, duration = 280 }) {
  const prev = useRef(value);
  useLayoutEffect(() => {
    const el = ref.current;
    const before = prev.current;
    prev.current = value;
    if (!el || before === value || !el.animate) return;
    const steps = Math.max(-max, Math.min(max, delta(before, value))); // positive: moved forward, so content arrives from the right
    if (!steps) return;
    if (reduced()) {
      el.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
      return;
    }
    const t = getComputedStyle(el).transform; // where a slide still running had got to
    const carried = unit && t !== 'none' ? new DOMMatrix(t).m41 : 0;
    el.getAnimations().forEach((a) => a.cancel());
    const from = carried + (unit ? steps * unit(el) : Math.sign(steps) * distance);
    el.animate(
      [{ transform: `translateX(${from}px)`, ...(fade ? { opacity: 0 } : {}) }, { transform: 'translateX(0)', ...(fade ? { opacity: 1 } : {}) }],
      { duration, easing: EASE }
    );
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useHoldStep({ delay = 380, first = 150, fastest = 70 } = {}) {
  const fns = useRef({});
  const timer = useRef(null);
  const held = useRef(false);
  const stop = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;
    window.removeEventListener('pointerup', stop);
    window.removeEventListener('pointercancel', stop);
    window.removeEventListener('blur', stop);
    if (held.current) setTimeout(() => { held.current = false; }, 60); // swallow the click that follows a hold
  }, []);
  useEffect(() => stop, [stop]);

  // `id` names the button; `step` is its latest action (so a repeating step never uses a stale date).
  return (id, step, onClick) => {
    fns.current[id] = step;
    return {
      onPointerDown: (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        held.current = false;
        let gap = first;
        const tick = () => {
          held.current = true;
          fns.current[id]();
          gap = Math.max(fastest, gap * 0.92);
          timer.current = setTimeout(tick, gap);
        };
        timer.current = setTimeout(tick, delay);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
        window.addEventListener('blur', stop);
      },
      onClick: (e) => {
        if (held.current) { e.preventDefault(); return; }
        (onClick ?? step)(e);
      },
      onContextMenu: (e) => e.preventDefault(), // a long press on a phone must not open the menu
      style: { touchAction: 'manipulation', WebkitUserSelect: 'none', userSelect: 'none' },
    };
  };
}
