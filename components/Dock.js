import { useEffect, useRef, useState } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

// Column templates for a page that has a dock on the right (use as the page's grid classes, from lg up).
// Written out in full so Tailwind can see them.
export const DOCK_GRID = {
  wide: { open: 'lg:grid-cols-[minmax(0,1fr)_25rem]', folded: 'lg:grid-cols-[minmax(0,1fr)_2.75rem]' },
  narrow: { open: 'lg:grid-cols-[minmax(0,1fr)_15rem]', folded: 'lg:grid-cols-[minmax(0,1fr)_2.75rem]' },
};

/*
  A panel docked to the right edge of the page. It can be folded away to a slim tab and brought back.
  The content stays mounted while folded, so anything typed in it is kept.
    label:   what the dock is ("Booking form"); used for the hide and show buttons
    title:   the heading shown in the dock
    actions: extra buttons next to the hide button (a pencil, a New button)
    tab:     what the folded tab says (vertical), and tabMark: a small dot on it when something is open
*/
export default function Dock({ open, onToggle, label, title, actions, tab, tabMark = false, children }) {
  // The panel is as tall as the room left below where it starts (the toolbar sits above it), so its own scrolling reaches
  // everything, including the buttons at the bottom of a long form.
  const box = useRef(null);
  const [maxH, setMaxH] = useState(null);
  useEffect(() => {
    const measure = () => {
      const el = box.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - window.scrollY; // where it is now on screen
      setMaxH(Math.max(240, Math.floor(window.innerHeight - Math.max(top, 72) - 24))); // 24: a margin
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, [open]);
  return (
    <>
      <aside
        ref={box}
        aria-label={label}
        style={maxH ? { maxHeight: maxH } : undefined}
        className={`sticky top-[4.5rem] overflow-y-auto overscroll-contain scroll-pb-24 rounded-lg border border-line bg-surface ${maxH ? '' : 'max-h-[calc(100dvh-12rem)]'} ${open ? '' : 'hidden'}`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-1.5">
          <h2 className="min-w-0 truncate text-base font-semibold">{title}</h2>
          <div className="flex shrink-0 items-center gap-1">
            {actions}
            <button type="button" className="btn btn-icon" aria-label={`Hide ${label.toLowerCase()}`} aria-expanded="true" title={`Hide ${label.toLowerCase()}`} onClick={() => onToggle(false)}>
              <CaretRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="px-4 pt-3">{children}</div>
      </aside>

      {!open && (
        <button
          type="button"
          aria-label={`Show ${label.toLowerCase()}`}
          aria-expanded="false"
          title={`Show ${label.toLowerCase()}`}
          onClick={() => onToggle(true)}
          className="sticky top-[4.5rem] flex h-44 w-11 flex-col items-center gap-3 rounded-lg border border-line bg-surface py-3 text-sm font-medium hover:bg-surface-2"
        >
          <CaretLeft size={18} aria-hidden="true" />
          <span className="[writing-mode:vertical-rl]">{tab}</span>
          {tabMark && <span aria-hidden="true" className="size-2 rounded-full bg-accent" />}
        </button>
      )}
    </>
  );
}
