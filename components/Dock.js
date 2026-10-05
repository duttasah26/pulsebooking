import { useEffect, useRef, useState } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useLeave } from './useLeave';

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
// overlay: lie over the right side of the parent (which must be position: relative), as tall as the parent, instead of taking
// a column, so what is behind it does not move.
export default function Dock({ open, onToggle, label, title, actions, tab, tabMark = false, overlay = false, children }) {
  // The panel is as tall as the room left below where it starts (the toolbar sits above it), so its own scrolling reaches
  // everything, including the buttons at the bottom of a long form.
  const [leaving, hide] = useLeave(() => onToggle(false), 170); // fades out before the column folds
  const box = useRef(null);
  const [maxH, setMaxH] = useState(null);
  useEffect(() => {
    if (overlay) return undefined; // floating over the page, it is as tall as its parent and measures nothing
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
  }, [open, overlay]);
  return (
    <>
      <aside
        ref={box}
        aria-label={label}
        style={maxH && !overlay ? { maxHeight: maxH } : undefined}
        className={`no-scrollbar ${overlay ? 'absolute inset-y-0 right-0 z-30 w-[23rem] max-w-full shadow-lg' : 'sticky top-[4.5rem]'} overflow-y-auto overscroll-contain scroll-pb-24 rounded-lg border border-line bg-surface ${maxH ? '' : 'max-h-[calc(100dvh-12rem)]'} ${open ? (leaving ? 'animate-dock-out' : 'animate-dock-in') : 'hidden'}`}
      >
        {/* Docked at the top of the panel however far its contents are scrolled: the name, Edit and Hide stay in reach. */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-surface px-4 py-1.5">
          <h2 className="min-w-0 truncate text-base font-semibold">{title}</h2>
          <div className="flex shrink-0 items-center gap-1">
            {actions}
            <button type="button" className="btn btn-icon" aria-label={`Hide ${label.toLowerCase()}`} aria-expanded="true" title={`Hide ${label.toLowerCase()}`} onClick={() => hide()}>
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
          className={`animate-fade sticky top-[4.5rem] flex h-44 w-11 flex-col items-center gap-3 rounded-lg border border-line bg-surface py-3 text-sm font-medium transition-[background-color,border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-muted/50 hover:bg-surface-2 hover:shadow-sm active:translate-y-0`}
        >
          <CaretLeft size={18} aria-hidden="true" />
          <span className="[writing-mode:vertical-rl]">{tab}</span>
          {tabMark && <span aria-hidden="true" className="size-2 rounded-full bg-accent" />}
        </button>
      )}
    </>
  );
}
