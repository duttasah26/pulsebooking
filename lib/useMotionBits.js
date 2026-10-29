import { useEffect, useState } from 'react';

// The animated pieces (components/Motion.js) are loaded in the browser only, after the first paint. Until they arrive (and on the
// server) the plain version is drawn, so nothing waits for them and the calendar never renders them on the server, where they failed.
export function useMotionBits() {
  const [bits, setBits] = useState(null);
  useEffect(() => {
    let live = true;
    import('../components/Motion').then((m) => live && setBits(m));
    return () => {
      live = false;
    };
  }, []);
  return bits;
}
