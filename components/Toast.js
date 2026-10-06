import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowUUpLeft, WarningCircle, X } from '@phosphor-icons/react';

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
          <div className="pointer-events-auto flex min-h-11 max-w-full items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 py-1 pl-3 pr-1 text-sm shadow-lg">
            <WarningCircle size={18} weight="fill" aria-hidden="true" className="shrink-0 text-amber-500" />
            <span key={toast.id} className="min-w-0 animate-bar-in font-medium">{toast.message}</span>
            {toast.actionLabel && (
              <button type="button" className="btn btn-quiet min-h-8 shrink-0 px-3 font-semibold lg:min-h-8" onClick={() => { toast.onAction?.(); clear(); }}>
                <ArrowUUpLeft size={16} aria-hidden="true" /> {toast.actionLabel}
              </button>
            )}
            <button type="button" className="btn btn-icon min-h-8 min-w-8 shrink-0 border-transparent lg:min-h-8 lg:min-w-8" onClick={clear} aria-label="Clear message">
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
