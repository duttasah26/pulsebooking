// A preview of a booking that is still being filled in: a see-through bar with a dashed outline in the colour it will
// have. It never takes clicks, so the real calendar underneath keeps working.
export default function GhostBar({ g, rows, style: placement, tone, name }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-bar-in @container pointer-events-none relative z-[1] flex min-w-0 items-center overflow-hidden rounded-lg border-2 border-dashed px-2 text-xs font-medium text-ink ${
        g.cutStart ? (rows ? 'rounded-l-none border-l-0' : 'rounded-t-none border-t-0') : ''
      } ${g.cutEnd ? (rows ? 'rounded-r-none border-r-0' : 'rounded-b-none border-b-0') : ''}`}
      style={{
        ...placement,
        ...g.margin,
        backgroundColor: `color-mix(in srgb, ${tone.border} 18%, transparent)`,
        borderColor: tone.border,
      }}
    >
      <span className={`truncate opacity-70 ${rows ? '' : '[writing-mode:vertical-rl] @min-[84px]:[writing-mode:horizontal-tb]'}`}>{name || 'New booking'}</span>
    </div>
  );
}
