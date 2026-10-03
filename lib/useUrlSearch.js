import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useDebounced } from './useApi';
import { useQueryState } from './useQueryState';

// A search box whose text is kept in the URL (?q=...). Typing stays instant; the URL and the returned `search`
// follow a moment later. `ready` is false until the router has read the URL, so a page does not search twice.
export function useUrlSearch() {
  const router = useRouter();
  const [urlQ, setUrlQ] = useQueryState('q', '');
  const [q, setQ] = useState('');
  const seeded = useRef(false);

  useEffect(() => {
    if (router.isReady && !seeded.current) {
      seeded.current = true;
      setQ(urlQ);
    }
  }, [router.isReady, urlQ]);

  const search = useDebounced(q.trim());
  useEffect(() => {
    if (seeded.current) setUrlQ(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return { q, setQ, search, ready: router.isReady };
}
