import { useEffect, useRef, useState } from 'react';
import Router from 'next/router';

// A thin line along the top of the page while another page opens: it starts at once, creeps forward (never quite arriving) while the page loads,
// then runs to the end and fades. The logo's gold, in both themes, with no glow. It says "something is happening" the moment a link is pressed, before the new page has anything to show.
export default function TopProgress() {
  const [bar, setBar] = useState({ width: 0, show: false });
  const timer = useRef(null);

  useEffect(() => {
    const stop = () => clearInterval(timer.current);
    const start = (url) => {
      if (url === Router.asPath) return; // the same page again: nothing to load
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
    Router.events.on('routeChangeStart', start);
    Router.events.on('routeChangeComplete', done);
    Router.events.on('routeChangeError', done);
    return () => {
      Router.events.off('routeChangeStart', start);
      Router.events.off('routeChangeComplete', done);
      Router.events.off('routeChangeError', done);
      stop();
      clearTimeout(timer.current);
    };
  }, []); // once: the router's events are stable, while the router object changes after each page and would cut the timers that finish the line

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
      <div
        className="h-full rounded-r-full bg-[#b8923a]"
        style={{
          width: `${bar.width}%`,
          opacity: bar.show ? 1 : 0,
          transition: bar.width === 0 ? 'none' : 'width 200ms ease-out, opacity 200ms ease-out 80ms',
        }}
      />
    </div>
  );
}
