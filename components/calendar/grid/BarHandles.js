// Pencil tool: the two extenders of one booking, drawn in the same grid area as its bar but on top of it. Each is a plain
// white tab (no icon) flush against an end of the bar and as tall as the bar:
//   start extender: drag to change check-in      end extender: drag to change check-out
// Moving a booking is done by dragging the bar itself (see BookingBar). The visible tab is 10px wide but its hit area
// is 24px (the invisible ::before), 46px on touch screens, and the wrapper ignores the pointer, so only the tabs take it. An extender is left
// out at an end where the bar runs off the screen. On the month sheet (days running down) they sit above and below.
export default function BarHandles({ b, g, rows, style: placement, onStart }) {
  const tab =
    "pointer-events-auto absolute z-[3] touch-none rounded-md border border-black/25 bg-white shadow-sm transition-colors hover:bg-surface-2 before:absolute before:content-['']";
  const side = rows
    ? 'top-1/2 h-[calc(100%-6px)] min-h-4 w-[10px] -translate-y-1/2 cursor-col-resize before:-inset-x-[7px] before:inset-y-0 [@media(pointer:coarse)]:w-[14px] [@media(pointer:coarse)]:before:-inset-x-[16px]'
    : 'left-1/2 h-[10px] w-[calc(100%-6px)] min-w-4 -translate-x-1/2 cursor-row-resize before:-inset-y-[7px] before:inset-x-0 [@media(pointer:coarse)]:h-[14px] [@media(pointer:coarse)]:before:-inset-y-[16px]';
  return (
    <div aria-hidden="true" className="pointer-events-none relative z-[3]" style={{ ...placement, ...g.margin }}>
      {!g.cutStart && (
        <span
          onPointerDown={(e) => onStart(e, b, 'start')}
          title="Drag to change check-in"
          className={`${tab} ${side} ${rows ? 'left-[-10px]' : 'top-[-10px]'}`}
        />
      )}
      {!g.cutEnd && (
        <span
          onPointerDown={(e) => onStart(e, b, 'end')}
          title="Drag to change check-out"
          className={`${tab} ${side} ${rows ? 'right-[-10px]' : 'bottom-[-10px]'}`}
        />
      )}
    </div>
  );
}
