import { useEffect, useState } from 'react';

// The timeline's scroll position, handed to the two navigator bars without re-rendering the grid.
// The grid scrolls 60 times a second; if its own state held the position, every cell and bar would be redrawn each frame.
// Instead the scroll handler calls bus.emit({ left, top }), and only the small bar components that subscribe re-render.
export function createScrollBus() {
  const listeners = new Set();
  return { listeners, emit: (pos) => listeners.forEach((fn) => fn(pos)) };
}

export function useScrollPos(bus, scrollRef) {
  const [pos, setPos] = useState({ left: 0, top: 0 });
  useEffect(() => {
    const el = scrollRef.current;
    if (el) setPos({ left: el.scrollLeft, top: el.scrollTop });
    bus.listeners.add(setPos);
    return () => bus.listeners.delete(setPos);
  }, [bus, scrollRef]);
  return pos;
}
