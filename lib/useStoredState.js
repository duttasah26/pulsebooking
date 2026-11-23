import { useCallback, useEffect, useState } from 'react';

const STORED_CHANGE = 'pulse:stored-change';

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
    // Two parts of one page can use the same stored choice (the theme button in the header and the Theme setting): a change in
    // one reaches the other at once.
    const onChange = (e) => {
      if (e.detail?.key !== key) return;
      const saved = parse(e.detail.raw);
      if (saved !== undefined) setValue(saved);
    };
    window.addEventListener(STORED_CHANGE, onChange);
    return () => window.removeEventListener(STORED_CHANGE, onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (next) => {
      setValue(next);
      try {
        localStorage.setItem(key, serialize(next));
      } catch {}
      window.dispatchEvent(new CustomEvent(STORED_CHANGE, { detail: { key, raw: serialize(next) } }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return [value, set];
}
