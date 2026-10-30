// Pencil tool: the two extenders of one booking, drawn in the same grid area as its bar but on top of it. Each is a white dot
// (no icon) sitting on an end of the bar, centred on its edge:
//   start dot: drag to change check-in      end dot: drag to change check-out
// Moving a booking is done by dragging the bar itself (see BookingBar). The visible dot is 12px wide but its hit area is 24px
// (the invisible ::before), 46px on touch screens, and the wrapper ignores the pointer, so only the dots take it. A dot is left
// out at an end where the bar runs off the screen. On the month sheet (days running down) they sit above and below.
export default function BarHandles({ b, g, rows, style: placement, onStart }) {
  const tab =
    "pointer-events-auto absolute z-[3] size-3 touch-none rounded-full border border-black/30 bg-white shadow-sm transition-colors hover:bg-surface-2 before:absolute before:content-[''] [@media(pointer:coarse)]:size-4";
  const side = rows
    ? 'top-1/2 -translate-y-1/2 cursor-col-resize before:-inset-[7px] [@media(pointer:coarse)]:before:-inset-[16px]'
    : 'left-1/2 -translate-x-1/2 cursor-row-resize before:-inset-[7px] [@media(pointer:coarse)]:before:-inset-[16px]';
  return (
    <div aria-hidden="true" className="pointer-events-none relative z-[3]" style={{ ...placement, ...g.margin }}>
      {!g.cutStart && (
        <span
          onPointerDown={(e) => onStart(e, b, 'start')}
          title="Drag to change check-in"
          className={`${tab} ${side} ${rows ? '-left-1.5' : '-top-1.5'}`}
        />
      )}
      {!g.cutEnd && (
        <span
          onPointerDown={(e) => onStart(e, b, 'end')}
          title="Drag to change check-out"
          className={`${tab} ${side} ${rows ? '-right-1.5' : '-bottom-1.5'}`}
        />
      )}
    </div>
  );
}
