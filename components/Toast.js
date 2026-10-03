import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

// show({ message, actionLabel?, onAction?, duration? })
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef();

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback((next) => {
    clearTimeout(timer.current);
    setToast(next);
    timer.current = setTimeout(() => setToast(null), next.duration ?? 8000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-6"
      >
        {toast && (
          <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-lg bg-ink py-2 pl-4 pr-2 text-sm text-canvas shadow-lg">
            <span className="py-1">{toast.message}</span>
            {toast.actionLabel && (
              <button
                type="button"
                className="min-h-11 rounded-lg px-3 font-semibold underline underline-offset-2"
                onClick={async () => {
                  dismiss();
                  try {
                    await toast.onAction?.();
                  } catch (err) {
                    show({ message: err.message || 'Something went wrong', duration: 4000 });
                  }
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
