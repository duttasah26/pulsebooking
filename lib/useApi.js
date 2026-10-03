import { useCallback, useEffect, useRef, useState } from 'react';

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (res.status === 401 && typeof window !== 'undefined' && window.location.pathname !== '/login') {
    // The session ended (or never started): back to the login screen, and return to this page afterwards.
    window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

// GET a path. Keeps the previous data on screen while a new request is loading.
// `loading` is true while data for a NEW path is coming; reload() refreshes quietly (loading stays false,
// refreshing is true) so a screen does not dim or flicker after every save. Pass null to skip the request.
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path), refreshing: false });
  const [tick, setTick] = useState(0);
  const lastPath = useRef(null); // null on purpose: the very first request is a load, not a reload

  useEffect(() => {
    if (!path) {
      setState({ data: null, error: null, loading: false, refreshing: false });
      return;
    }
    const isReload = lastPath.current === path;
    lastPath.current = path;
    let live = true;
    // No data yet means a load, not a refresh (in development React runs this effect twice, and the second run would
    // otherwise look like a refresh and show an empty page for a moment).
    setState((s) => ({ ...s, loading: !isReload || s.data === null, refreshing: isReload && s.data !== null, error: null }));
    api(path)
      .then((data) => live && setState({ data, error: null, loading: false, refreshing: false }))
      .catch((error) => live && setState((s) => ({ ...s, error, loading: false, refreshing: false })));
    return () => {
      live = false;
    };
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

export function useDebounced(value, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
