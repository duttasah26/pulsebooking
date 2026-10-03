import { useCallback } from 'react';
import { useRouter } from 'next/router';

// Page state kept in the URL (?key=value), so tabs, filters and sorting survive a reload, the back button and
// sharing a link. A value equal to its fallback (or empty) is left out of the URL.
//
// useQueryParams({ tab: 'upcoming', sort: 'check_in', dir: '' }) returns [values, set].
// set({ tab: 'past', dir: '' }) changes several values in ONE update. (Calling a setter per value in a row does not
// work: each one starts from the URL it saw when the page last rendered, so the last call undoes the earlier ones.)
// Pass the fallbacks object as a constant defined outside the component.
export function useQueryParams(fallbacks) {
  const router = useRouter();

  const values = {};
  for (const [key, fallback] of Object.entries(fallbacks)) {
    const raw = router.isReady ? router.query[key] : undefined;
    values[key] = typeof raw === 'string' ? raw : fallback;
  }

  const set = useCallback(
    (patch) => {
      const query = { ...router.query };
      for (const [key, value] of Object.entries(patch)) {
        if (value === fallbacks[key] || value === '' || value == null) delete query[key];
        else query[key] = value;
      }
      router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
    },
    [router, fallbacks],
  );

  return [values, set];
}

// One value: useQueryState('q', '') returns [value, setValue].
export function useQueryState(key, fallback) {
  const [values, set] = useQueryParams({ [key]: fallback });
  return [values[key], useCallback((next) => set({ [key]: next }), [set, key])];
}
