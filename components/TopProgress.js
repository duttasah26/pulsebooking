import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

// A thin line along the top of the page while another page opens: it starts at once, creeps forward (never quite arriving) while the page loads,
// then runs to the end and fades. Black in light mode, the logo's gold in dark. It says "something is happening" the moment a link is pressed, before the new page has anything to show.
export default function TopProgress() {
  const router = useRouter();
  const [bar, setBar] = useState({ width: 0, show: false });
  const timer = useRef(null);

  useEffect(() => {
    const stop = () => clearInterval(timer.current);
    const start = (url) => {
      if (url === router.asPath) return; // the same page again: nothing to load
      stop();
      setBar({ width: 8, show: true });
      // Each tick covers a fraction of what is left, so it slows down as it nears the end.
      timer.current = setInterval(() => setBar((b) => ({ ...b, width: b.width + (92 - b.width) * 0.12 })), 200);
    };
    const done = () => {
      stop();
      setBar((b) => (b.show ? { width: 100, show: true } : b));
      // Run to the end, fade, then reset (the reset is not animated, so the next page's line starts from nothing).
      timer.current = setTimeout(() => {
        setBar({ width: 100, show: false });
        timer.current = setTimeout(() => setBar({ width: 0, show: false }), 300);
      }, 220);
    };
    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', done);
    router.events.on('routeChangeError', done);
    return () => {
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', done);
      router.events.off('routeChangeError', done);
      stop();
      clearTimeout(timer.current);
    };
  }, [router]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
      <div
        className="h-full rounded-r-full bg-current text-ink dark:text-[#d1ab4f]"
        style={{
          width: `${bar.width}%`,
          opacity: bar.show ? 1 : 0,
          transition: bar.width === 0 ? 'none' : 'width 200ms ease-out, opacity 200ms ease-out 80ms',
          boxShadow: '0 0 8px currentColor',
        }}
      />
    </div>
  );
}
