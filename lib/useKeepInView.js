import { useLayoutEffect } from 'react';

// Keeps a pop-up (a menu, a date picker, a filter panel) whole on screen: between the header and the phone tab bar.
// When it opens and runs past the bottom, the page scrolls up just enough to show it (never so far that its top goes under
// the header). If it still does not fit (a page that does not scroll, like the calendar, or a pop-up taller than the space),
// it is cut to the space left and scrolls inside itself. It checks again whenever the pop-up changes size (a filter panel that
// swaps its list for a field). `ref` is the pop-up, `open` whether it is showing.
export function useKeepInView(ref, open) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !el) return undefined;
    const fit = (scroll) => {
      el.style.maxHeight = '';
      const header = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
      const tabbar = document.querySelector('[data-tabbar]');
      const limit = (tabbar && tabbar.offsetHeight ? tabbar.getBoundingClientRect().top : window.innerHeight) - 8;
      let r = el.getBoundingClientRect();
      if (scroll && r.bottom > limit) {
        const by = Math.min(r.bottom - limit, r.top - header - 8);
        if (by > 0) {
          window.scrollBy(0, by);
          r = el.getBoundingClientRect();
        }
      }
      if (r.bottom > limit) {
        el.style.maxHeight = `${Math.max(160, Math.floor(limit - r.top))}px`;
        el.style.overflowY = 'auto';
        el.style.overscrollBehavior = 'contain';
      }
    };
    fit(true);
    let last = el.scrollHeight;
    const ro = new ResizeObserver(() => {
      if (el.scrollHeight === last) return; // its own cut changes the box, not what is in it
      last = el.scrollHeight;
      fit(true);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, open]);
}
