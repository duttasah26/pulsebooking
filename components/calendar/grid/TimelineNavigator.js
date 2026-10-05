// A navigator bar under the timeline, in the style of an editing timeline's scroll and zoom bar, drawn like an ordinary
// scrollbar. The track stands for every loaded day; the thumb is the part you are looking at.
//   drag the block:        scrolls along the days
//   drag its right end:    makes the days narrower or wider, keeping the first visible day where it is
//   drag its left end:     the same, keeping the last visible day where it is
//   click the track:       jumps there
// Wider days means fewer days in view, so the block shrinks as you widen them.
export default function TimelineNavigator({ scrollRef, n, dayPx, first, inView, span, minScale, maxScale, onScale }) {
  const pct = (days) => `${Math.max(0, Math.min(100, (days / n) * 100))}%`;
  // inView days at this scale: span / scale, so the limits in days are span / maxScale and span / minScale.
  const clampView = (v) => Math.max(span / maxScale, Math.min(span / minScale, v));

  const drag = (e, mode) => {
    e.stopPropagation();
    e.preventDefault();
    const track = e.currentTarget.closest('[data-track]');
    const perPx = n / track.clientWidth; // days per pixel of the track
    const x0 = e.clientX;
    const start = { first, inView, right: first + inView };
    const move = (ev) => {
      const d = (ev.clientX - x0) * perPx;
      if (mode === 'move') {
        scrollRef.current.scrollLeft = Math.max(0, (start.first + d) * dayPx);
      } else if (mode === 'right') {
        const v = clampView(start.inView + d);
        onScale(span / v, start.first);
      } else {
        const v = clampView(start.inView - d);
        onScale(span / v, Math.max(0, start.right - v));
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
    const day = ((e.clientX - rect.left) / rect.width) * n - inView / 2;
    scrollRef.current.scrollLeft = Math.max(0, day * dayPx);
  };

  return (
    <div
      data-track
      aria-hidden="true"
      onPointerDown={jump}
      className="relative h-4 touch-none select-none overflow-hidden rounded-lg border border-line bg-surface-2"
    >
      <div
        onPointerDown={(e) => drag(e, 'move')}
        title="Drag to scroll through the days"
        className="group/thumb absolute inset-y-px cursor-grab rounded-full bg-[color-mix(in_srgb,var(--muted)_55%,transparent)] hover:bg-muted active:cursor-grabbing"
        style={{ left: pct(first), width: pct(inView), minWidth: 28 }}
      >
        <span
          onPointerDown={(e) => drag(e, 'left')}
          title="Drag to change the day width"
          className="absolute inset-y-0 left-0 flex w-3 cursor-ew-resize items-center justify-center"
        >
          <span className="h-2 w-px rounded-full bg-white/80" />
        </span>
        <span
          onPointerDown={(e) => drag(e, 'right')}
          title="Drag to change the day width"
          className="absolute inset-y-0 right-0 flex w-3 cursor-ew-resize items-center justify-center"
        >
          <span className="h-2 w-px rounded-full bg-white/80" />
        </span>
      </div>
    </div>
  );
}
