import { useEffect } from 'react';
import { X } from '@phosphor-icons/react';

// Bottom sheet on phones, right-hand panel on desktop.
export default function Sheet({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end md:justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" tabIndex={-1} className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full flex-col rounded-t-lg border border-line bg-surface md:h-full md:max-h-none md:max-w-md md:rounded-none md:border-y-0 md:border-r-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" className="btn btn-icon border-transparent" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className={`flex-1 overflow-y-auto overscroll-contain px-4 pt-4 ${footer ? 'pb-4' : ''}`}>{children}</div>
        {footer && (
          <div className="border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>
  );
}
