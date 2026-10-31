import { useEffect, useRef, useState } from 'react';

// A whole number that counts up or down to its new value when it changes (about 0.4 s, easing out), so a change on the page is seen.
// The first value is drawn as it is, with no count from zero. With reduced motion it simply changes.
export default function CountTo({ value }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      from.current = value;
      setShown(value);
      return undefined;
    }
    let frame;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 400);
      const eased = 1 - (1 - k) ** 3;
      const v = Math.round(start + (value - start) * eased);
      from.current = v;
      setShown(v);
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}
