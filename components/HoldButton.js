import { useEffect, useRef, useState } from 'react';
import { useToast } from './Toast';

/*
  A button you must press and HOLD to use (for deleting). While it is held, a red fill grows across it; letting go
  early cancels, and holding for `duration` ms runs onConfirm. A quick tap shows a short reminder instead.
  Works with a mouse, a finger, and the keyboard (hold Space or Enter). Pass the same props as a button
  (className, title, aria-label, disabled) and the label or icon as children.
*/
export default function HoldButton({ onConfirm, duration = 700, className = '', children, title = 'Hold to delete', reminder = 'Hold the button to delete', disabled, ...rest }) {
  const toast = useToast();
  const [holding, setHolding] = useState(false);
  const timer = useRef(null);
  const startedAt = useRef(0);

  const cancel = () => {
    if (timer.current === null) return;
    clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
    if (Date.now() - startedAt.current < 250) toast({ message: reminder, important: true }); // a tap, not a hold
  };
  const start = () => {
    if (disabled || timer.current !== null) return;
    startedAt.current = Date.now();
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      onConfirm();
    }, duration);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

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
        className="pointer-events-none absolute inset-0 origin-left bg-danger/30"
        style={{ transform: holding ? 'scaleX(1)' : 'scaleX(0)', transition: holding ? `transform ${duration}ms linear` : 'transform 150ms ease-out' }}
      />
      <span className="relative inline-flex items-center justify-center gap-2">{children}</span>
    </button>
  );
}
