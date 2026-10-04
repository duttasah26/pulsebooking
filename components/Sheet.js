import { useEffect } from 'react';
import { X } from '@phosphor-icons/react';

// Bottom sheet on phones (also a phone held sideways, which is wide but short), right-hand panel on tablets and desktop.
// locked: a form being filled in. A tap outside it or Escape does not close it (the X and Cancel still do), so typing is never lost by accident.
export default function Sheet({ title, onClose, children, footer, actions, locked = false }) {
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
    <div className="fixed inset-0 z-40 flex items-end md:justify-end short:justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" tabIndex={-1} className="animate-fade absolute inset-0 bg-black/40" onClick={locked ? undefined : onClose} />
      <div className="animate-sheet relative flex max-h-[92dvh] w-full flex-col rounded-t-lg border border-line bg-surface md:h-full md:max-h-none md:max-w-md md:rounded-none md:border-y-0 md:border-r-0 short:h-auto short:max-h-[96dvh] short:max-w-3xl short:rounded-t-lg short:border-y short:border-r">
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <h2 className="min-w-0 truncate text-base font-semibold">{title}</h2>
          <div className="flex shrink-0 items-center gap-1">
            {actions}
            <button type="button" className="btn btn-icon border-transparent" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className={`no-scrollbar flex-1 overflow-y-auto overscroll-contain scroll-pb-24 px-4 pt-4 ${footer ? 'pb-4' : ''}`}>{children}</div>
        {footer && (
          <div className="border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>
  );
}
