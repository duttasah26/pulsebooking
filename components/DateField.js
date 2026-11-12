import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarBlank, X } from '@phosphor-icons/react';
import DateRangePicker from './DateRangePicker';
import { addDays, fmtDayMonthYear } from '../lib/dates';

// A date field that opens the app's own month calendar (with the line to type "next fri", "dec 1") in place of the browser's date box.
// value is YYYY-MM-DD, or '' for none; onChange gets the same. min / max grey out days. clearable adds a Clear button for an empty value.
// The calendar is drawn on the page itself (not inside the panel the field sits in), under the field, or above it when there is no room below,
// so a narrow or scrolling panel never clips it. align="right" lines its right edge up with the field's.
export default function DateField({ id, name, value, onChange, min, max, clearable = false, align = 'left', placeholder = 'Pick a day', 'aria-label': ariaLabel, className = '' }) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState(null);
  const button = useRef(null);
  const pop = useRef(null);

  // Place the calendar from the field's position and the calendar's own size; keep it on the screen.
  useLayoutEffect(() => {
    if (!open) {
      setPlace(null);
      return undefined;
    }
    const put = () => {
      const f = button.current?.getBoundingClientRect();
      const p = pop.current;
      if (!f || !p) return;
      const w = p.offsetWidth;
      const h = p.offsetHeight;
      const gap = 6;
      const roomBelow = window.innerHeight - f.bottom - gap;
      const top = roomBelow >= h || roomBelow >= f.top - gap ? f.bottom + gap : f.top - gap - h;
      const left = align === 'right' ? f.right - w : f.left;
      setPlace({ top: Math.max(8, Math.min(top, window.innerHeight - h - 8)), left: Math.max(8, Math.min(left, window.innerWidth - w - 8)) });
    };
    put();
    window.addEventListener('resize', put);
    return () => window.removeEventListener('resize', put);
  }, [open, align, value]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => !pop.current?.contains(e.target) && !button.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    // The calendar lives on the page, outside any menu the field is in; a press inside it must not read as "outside" to that menu and close it.
    const node = pop.current;
    const keep = (e) => e.stopPropagation();
    node?.addEventListener('pointerdown', keep);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      node?.removeEventListener('pointerdown', keep);
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative min-w-0">
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={button}
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`field flex items-center gap-2 px-2 text-left ${className}`}
      >
        <CalendarBlank size={18} aria-hidden="true" className="shrink-0 text-muted" />
        <span className={`min-w-0 truncate ${value ? '' : 'text-muted'}`}>{value ? fmtDayMonthYear(value) : placeholder}</span>
      </button>
      {open && createPortal(
        <div
          ref={pop}
          role="dialog"
          aria-label={ariaLabel || 'Choose a day'}
          style={{ position: 'fixed', top: place?.top ?? 0, left: place?.left ?? 0, visibility: place ? 'visible' : 'hidden', transformOrigin: align === 'right' ? 'top right' : 'top left' }}
          className="popover-in z-[60] w-[min(21rem,calc(100vw-1rem))] space-y-2 rounded-lg border border-line bg-surface p-3 text-base font-normal shadow-lg"
        >
          <DateRangePicker single checkIn={value || undefined} checkOut={value ? addDays(value, 1) : undefined} min={min} max={max} onChange={(a) => { onChange(a); setOpen(false); button.current?.focus(); }} />
          {clearable && value && (
            <button type="button" className="btn btn-quiet w-full" onClick={() => { onChange(''); setOpen(false); button.current?.focus(); }}>
              <X size={16} aria-hidden="true" /> Clear
            </button>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
