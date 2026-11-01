import { useEffect, useRef, useState } from 'react';
import { useToast } from './Toast';

/*
  A button you must press and HOLD to use (for deleting). While it is held, a red fill grows across it; letting go
  early eases it back from wherever it had got to, and holding for `duration` ms runs onConfirm. The fill then stays
  full and firms up while the action runs, instead of draining as if it had been cancelled; it only empties again once
  the action has finished (or failed) and the button is still there. A quick tap shows a short reminder instead.
  Works with a mouse, a finger, and the keyboard (hold Space or Enter). Pass the same props as a button
  (className, title, aria-label, disabled) and the label or icon as children.
*/
export default function HoldButton({ onConfirm, duration = 700, className = '', children, title = 'Hold to delete', reminder = 'Hold the button to delete', disabled, ...rest }) {
  const toast = useToast();
  const [phase, setPhase] = useState('idle'); // idle, holding, or done (confirmed, action running)
  const timer = useRef(null);
  const startedAt = useRef(0);
  const alive = useRef(true);

  const cancel = () => {
    if (timer.current === null) return;
    clearTimeout(timer.current);
    timer.current = null;
    setPhase('idle');
    if (Date.now() - startedAt.current < 250) toast({ message: reminder, important: true }); // a tap, not a hold
  };
  const start = () => {
    if (disabled || timer.current !== null || phase === 'done') return;
    startedAt.current = Date.now();
    setPhase('holding');
    timer.current = setTimeout(async () => {
      timer.current = null;
      setPhase('done');
      try {
        await onConfirm();
      } finally {
        if (alive.current) setTimeout(() => alive.current && setPhase('idle'), 500); // still here: let go of the fill
      }
    }, duration);
  };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  const isKey = (e) => e.key === ' ' || e.key === 'Enter';
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onPointerDown={(e) => e.button === 0 && start()}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => {
        if (!isKey(e)) return;
        e.preventDefault();
        if (!e.repeat) start();
      }}
      onKeyUp={(e) => isKey(e) && cancel()}
      onBlur={cancel}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative select-none overflow-hidden [-webkit-touch-callout:none] ${className}`}
      {...rest}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 origin-left ${phase === 'done' ? 'bg-danger/45' : 'bg-danger/30'}`}
        style={{
          transform: phase === 'idle' ? 'scaleX(0)' : 'scaleX(1)',
          // growing is steady; letting go eases back from the current width; a finished hold never drains while its action runs
          transition: `transform ${phase === 'holding' ? `${duration}ms linear` : phase === 'done' ? '0ms' : '350ms cubic-bezier(0.22, 1, 0.36, 1)'}, background-color 200ms`,
        }}
      />
      <span className="relative inline-flex items-center justify-center gap-2">
        {children}
        {/* Once the hold completes, the same spinner as the sign-in button turns while the action runs. */}
        {phase === 'done' && <span role="status" aria-label="Working" className="spinner size-4 shrink-0 rounded-full border-2 border-current border-t-transparent" />}
      </span>
    </button>
  );
}
