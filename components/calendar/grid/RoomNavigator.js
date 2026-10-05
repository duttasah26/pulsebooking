// The vertical twin of TimelineNavigator: a scroll and zoom bar beside the timeline, for the rooms.
// The track stands for every room (in floor order); the block is the rooms you are looking at.
//   drag the block:        scrolls through the rooms
//   drag its top end:      makes the rows taller or shorter, keeping the last visible room where it is
//   drag its bottom end:   the same, keeping the first visible room where it is
//   click the track:       jumps there
// A fixed width, like the bar under the grid. What the rows say about each booking (dates, nights, status, times) is drawn on
// the booking bars themselves (see BookingBar), not here.
export const NAV_WIDTH = 16;

export default function RoomNavigator({ scrollRef, rooms, first, inView, width, height, minView, maxView, onView, rowPx }) {
  const n = rooms.length;
  const pct = (rows) => `${Math.max(0, Math.min(100, (rows / n) * 100))}%`;
  const clampView = (v) => Math.max(minView, Math.min(maxView, v));

  const drag = (e, mode) => {
    e.stopPropagation();
    e.preventDefault();
    const track = e.currentTarget.closest('[data-track]');
    const perPx = n / track.clientHeight; // rooms per pixel of the track
    const y0 = e.clientY;
    const start = { first, inView, bottom: first + inView };
    const move = (ev) => {
      const d = (ev.clientY - y0) * perPx;
      if (mode === 'move') {
        scrollRef.current.scrollTop = Math.max(0, (start.first + d) * rowPx);
      } else if (mode === 'bottom') {
        onView(clampView(start.inView + d), start.first);
      } else {
        const next = clampView(start.inView - d);
        onView(next, Math.max(0, start.bottom - next));
      }
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('blur', end);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('blur', end);
  };

  const jump = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const room = ((e.clientY - rect.top) / rect.height) * n - inView / 2;
    scrollRef.current.scrollTop = Math.max(0, room * rowPx);
  };

  return (
    <div
      data-track
      aria-hidden="true"
      onPointerDown={jump}
      className="relative shrink-0 touch-none select-none overflow-hidden rounded-lg border border-line bg-surface-2"
      style={{ width, height }}
    >
      <div
        onPointerDown={(e) => drag(e, 'move')}
        title="Drag to scroll through the rooms"
        className="absolute inset-x-px cursor-grab rounded-full bg-[color-mix(in_srgb,var(--muted)_55%,transparent)] hover:bg-muted active:cursor-grabbing"
        style={{ top: pct(first), height: pct(inView), minHeight: 28 }}
      >
        <span
          onPointerDown={(e) => drag(e, 'top')}
          title="Drag to change the row height"
          className="absolute inset-x-0 top-0 flex h-3 cursor-ns-resize items-center justify-center"
        >
          <span className="h-px w-2 rounded-full bg-white/80" />
        </span>
        <span
          onPointerDown={(e) => drag(e, 'bottom')}
          title="Drag to change the row height"
          className="absolute inset-x-0 bottom-0 flex h-3 cursor-ns-resize items-center justify-center"
        >
          <span className="h-px w-2 rounded-full bg-white/80" />
        </span>
      </div>
    </div>
  );
}
