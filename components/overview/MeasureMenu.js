import { useEffect, useId, useRef, useState } from 'react';
import { Check, DotsThreeVertical } from '@phosphor-icons/react';
import { MEASURES } from '../../lib/devicePrefs';

// The three dots on a figure (or on the chart): a small menu to choose what is counted, bookings, the number of guests, or rooms.
// The choice is kept on this device. `className` places the button; the menu opens under it.
export default function MeasureMenu({ label, value, onPick, className = '' }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => !box.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      box.current?.querySelector('button')?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={box} className={`${className} ${open ? 'z-40' : ''}`}>
      <button
        type="button"
        className="btn btn-icon btn-quiet size-9! min-h-0! min-w-0! p-0!"
        aria-label={`${label}: what to show`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <DotsThreeVertical size={20} weight="bold" aria-hidden="true" />
      </button>
      {open && (
        <div id={id} role="menu" aria-label={`${label}: show`} className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-line bg-surface p-1 shadow-lg">
          <p className="px-3 pb-1 pt-1.5 text-[0.8125rem] font-semibold text-muted">Show</p>
          {MEASURES.map(([key, text]) => (
            <button
              key={key}
              type="button"
              role="menuitemradio"
              aria-checked={value === key}
              onClick={() => { onPick(key); setOpen(false); }}
              className="flex min-h-10 w-full items-center justify-between gap-2 rounded-md px-3 text-left text-[0.9375rem] hover:bg-surface-2"
            >
              <span className={value === key ? 'font-semibold' : ''}>{text}</span>
              {value === key && <Check size={16} weight="bold" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
