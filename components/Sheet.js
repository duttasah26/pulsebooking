import { useEffect, useRef } from 'react';
import { useLeave } from './useLeave';
import { X } from '@phosphor-icons/react';

// Bottom sheet on phones (also a phone held sideways, which is wide but short), right-hand panel on tablets and desktop.
// locked: a form being filled in. A tap outside it or Escape does not close it (the X and Cancel still do), so typing is never lost by accident.
// leaving: pass it (with a close that already waits for the exit) to animate every way out, such as a Cancel inside the
// form; without it the sheet animates its own backdrop, X and Escape.
export default function Sheet({ title, onClose: closeNow, children, footer, actions, locked = false, wide = false, leaving: leavingProp }) {
  const [ownLeaving, ownClose] = useLeave(closeNow);
  const leaving = leavingProp ?? ownLeaving;
  const onClose = leavingProp === undefined ? ownClose : closeNow;
  // Focus moves into the dialog when it opens, Tab stays inside it, and focus goes back to where it was when it closes.
  const root = useRef(null);
  useEffect(() => {
    const before = document.activeElement;
    root.current?.focus({ preventScroll: true });
    return () => before?.focus?.({ preventScroll: true });
  }, []);
  const keepFocus = (e) => {
    if (e.key !== 'Tab' || !root.current) return;
    const items = [...root.current.querySelectorAll('a[href], button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === root.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !locked && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, locked]);

  return (
    <div ref={root} tabIndex={-1} onKeyDown={keepFocus} className="fixed inset-0 z-40 flex items-end outline-none md:justify-end short:justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" tabIndex={-1} className={`absolute inset-0 bg-ink/35 ${leaving ? 'animate-fade-out' : 'animate-fade'}`} onClick={locked ? undefined : onClose} />
      <div className={`${leaving ? 'animate-sheet-out' : 'animate-sheet'} relative flex max-h-[92dvh] w-full flex-col rounded-t-lg bg-surface shadow-lg md:h-full md:max-h-none ${wide ? 'md:max-w-2xl' : 'md:max-w-md'} md:rounded-none md:border-l md:border-line short:h-auto short:max-h-[96dvh] short:max-w-3xl short:rounded-t-lg`}>
        <div className="flex min-h-16 items-center justify-between gap-3 border-b border-line px-5 py-2">
          <h2 className="t-title min-w-0 truncate">{title}</h2>
          <div className="flex shrink-0 items-center gap-1">
            {actions}
            <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Close">
              <X size={20} weight="bold" />
            </button>
          </div>
        </div>
        <div className={`no-scrollbar flex flex-1 flex-col overflow-y-auto bg-canvas overscroll-contain scroll-pb-24 px-5 pt-5 pb-5 [&:has(.sticky.bottom-0)]:pb-0`} data-scroll-body>{children}</div>
        {footer && (
          <div className="border-t border-line bg-surface px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>
  );
}
