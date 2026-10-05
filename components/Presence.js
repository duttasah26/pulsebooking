import { useEffect, useRef, useState } from 'react';

// Keeps a conditionally shown block on screen for `ms` after `show` turns false, playing `exit` meanwhile, so it fades
// away instead of vanishing. The last children it was shown with are kept for the exit (their data may be gone by then).
// While it leaves it comes out of the layout (position: absolute, where it stood), so whatever replaces it does not stack with it
// and nothing below jumps. Use opacity-only exits for anything position: fixed inside (a transform here would trap it).
export default function Presence({ show, children, exit = 'animate-fade-out', ms = 160 }) {
  const [mounted, setMounted] = useState(show);
  const last = useRef(children);
  if (show) last.current = children;
  useEffect(() => {
    if (show) {
      setMounted(true);
      return undefined;
    }
    const t = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(t);
  }, [show, ms]);
  if (!show && !mounted) return null;
  return <div data-leaving={show ? undefined : ''} className={show ? undefined : `${exit} pointer-events-none absolute inset-x-0`}>{show ? children : last.current}</div>;
}
