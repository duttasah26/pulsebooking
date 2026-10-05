import { useCallback, useEffect, useRef, useState } from 'react';

// Play a leaving animation before something closes: `leaving` turns true at once (add the exit class), and `close` calls
// the real handler after `ms`. A second press while leaving does nothing.
export function useLeave(onClose, ms = 200) {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(null);
  const latest = useRef(onClose);
  latest.current = onClose;
  useEffect(() => () => clearTimeout(timer.current), []);
  const close = useCallback((...args) => {
    if (timer.current) return;
    setLeaving(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      latest.current?.(...args);
      setLeaving(false); // if the owner keeps this on screen, it comes back
    }, ms);
  }, [ms]);
  return [leaving, close];
}
