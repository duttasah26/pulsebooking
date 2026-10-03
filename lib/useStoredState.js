import { useCallback, useEffect, useState } from 'react';

// State that is remembered on this device (localStorage). It starts as `fallback` (so the server and the first render
// agree), then picks up the saved value. parse(raw) returns the value, or undefined to ignore a bad saved value.
export function useStoredState(key, fallback, { parse = (raw) => raw, serialize = String } = {}) {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      const saved = raw === null ? undefined : parse(raw);
      if (saved !== undefined) setValue(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (next) => {
      setValue(next);
      try {
        localStorage.setItem(key, serialize(next));
      } catch {}
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return [value, set];
}
