import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Info, X } from '@phosphor-icons/react';

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

// show({ message, actionLabel?, onAction?, duration? })
//
// Messages live in one status bar along the bottom of the screen, like the status bar in a spreadsheet, instead of a new
// pop-up each time. The bar is always there: it says "Ready" until something happens, then holds the latest message and
// its action (for example Undo) until the next message replaces it or it is cleared with the X. `duration` is not
// needed any more; it is accepted so older calls keep working.
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const stamp = useRef(0);

  const clear = useCallback(() => setToast(null), []);
  const show = useCallback((next) => {
    stamp.current += 1;
    setToast({ ...next, id: stamp.current });
  }, []);

  const runAction = async () => {
    const current = toast;
    clear();
    try {
      await current.onAction?.();
    } catch (err) {
      show({ message: err.message || 'Something went wrong' });
    }
  };

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-x-0 bottom-14 z-50 border-t border-line bg-surface pb-0 md:bottom-0"
      >
        <div className="mx-auto flex min-h-9 items-center gap-3 px-4 text-sm">
          <Info size={16} aria-hidden="true" className={`shrink-0 ${toast ? 'text-accent-text' : 'text-muted'}`} />
          <span key={toast?.id ?? 'ready'} className={`min-w-0 flex-1 truncate ${toast ? 'font-medium animate-bar-in' : 'text-muted'}`}>
            {toast ? toast.message : 'Ready'}
          </span>
          {toast?.actionLabel && (
            <button type="button" className="btn min-h-7 shrink-0 px-3 font-semibold lg:min-h-7" onClick={runAction}>
              {toast.actionLabel}
            </button>
          )}
          {toast && (
            <button type="button" className="btn btn-icon min-h-7 min-w-7 shrink-0 border-transparent lg:min-h-7 lg:min-w-7" onClick={clear} aria-label="Clear message">
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
