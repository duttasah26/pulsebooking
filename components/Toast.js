import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { WarningCircle, X } from '@phosphor-icons/react';

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

const SHOW_FOR = 8000; // a message stays this long, or until it is cleared with its X

// show({ message, actionLabel?, onAction?, duration?, important? })
//
// The screen already shows what you did (a hold appears, a booking changes colour), so plain confirmations like "Hold placed"
// are NOT shown. What is shown, in one small pill at the bottom left (clear of the right-hand panel's buttons):
//   - problems (a call with no duration and no action, which is how every error is sent),
//   - messages marked important: the ones that explain why nothing happened ("Room 104 is already booked on those dates"), and
//   - messages with an Undo (an actionLabel), EXCEPT where Undo is already on screen: the calendar page with its tool pane (a wide
//     screen, or a phone held sideways), which also has Ctrl+Z. On every other page, and on an upright phone (which has no tool
//     pane), the Undo message is the only way back, so it is shown.
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const { pathname } = useRouter();
  const path = useRef(pathname);
  path.current = pathname;
  const stamp = useRef(0);
  const timer = useRef();

  const clear = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);
  const show = useCallback((next) => {
    const undoOnScreen = path.current === '/' && typeof window !== 'undefined' && (window.matchMedia('(min-width: 1024px)').matches || window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches);
    const worthShowing = next.important || (next.actionLabel ? !undoOnScreen : next.duration === undefined);
    if (!worthShowing) return;
    stamp.current += 1;
    clearTimeout(timer.current);
    setToast({ ...next, id: stamp.current });
    timer.current = setTimeout(() => setToast(null), SHOW_FOR);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-16 left-3 right-3 z-50 flex justify-start md:bottom-4 lg:left-24 lg:right-[26rem]">
        {toast && (
          <div className="pointer-events-auto flex min-h-12 max-w-full items-center gap-3 rounded-lg bg-ink py-1.5 pl-4 pr-1.5 text-[0.9375rem] text-white shadow-lg">
            {!toast.actionLabel && <WarningCircle size={20} weight="fill" aria-hidden="true" className="shrink-0 text-[#f0d27a]" />}
            <span key={toast.id} className="min-w-0 animate-bar-in">{toast.message}</span>
            {toast.actionLabel && (
              <button type="button" className="btn btn-sm btn-inverse btn-quiet shrink-0 font-semibold text-[#8fd3b4]" onClick={() => { toast.onAction?.(); clear(); }}>
                {toast.actionLabel}
              </button>
            )}
            <button type="button" className="btn btn-sm btn-icon btn-inverse btn-quiet shrink-0" onClick={clear} aria-label="Clear message">
              <X size={16} weight="bold" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
