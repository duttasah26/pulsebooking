import { MagnifyingGlassMinus, MagnifyingGlassPlus } from '@phosphor-icons/react';

const MIN = 0.6;
const MAX = 1.6;
export const clampZoom = (z) => Math.min(MAX, Math.max(MIN, Math.round(z * 10) / 10));

// The line under the grid: a hint on the left and the zoom slider on the right. Smaller shows more of the month at
// once; larger makes the cells easier to hit.
export default function ZoomBar({ zoom, onChange, quickHold, strip }) {
  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1">
      {strip ? (
        <div className="min-w-0 flex-1 basis-64">{strip}</div>
      ) : (
      <p className="min-w-0 flex-1 basis-64 text-sm text-muted">
        {quickHold ? (
          <>
            <span className="hidden sm:inline">Drag across free nights to place a hold. </span>
            <span className="sm:hidden">Tap one corner, then the opposite corner, to place a hold. </span>
            Drag a booking to move it, or its white end tabs to change check-in and check-out, then Save.
          </>
        ) : (
          'Drag a box over bookings to select them, or click one to open it. Turn on the pencil to place holds.'
        )}
      </p>
      )}
      <div className="flex shrink-0 items-center gap-1.5 text-muted">
        <button type="button" className="btn btn-icon border-transparent" aria-label="Zoom out" onClick={() => onChange(clampZoom(zoom - 0.1))}>
          <MagnifyingGlassMinus size={18} aria-hidden="true" />
        </button>
        <input
          type="range"
          name="zoom"
          min={MIN}
          max={MAX}
          step="0.1"
          value={zoom}
          onChange={(e) => onChange(clampZoom(Number(e.target.value)))}
          aria-label="Calendar zoom"
          className="w-24 accent-[var(--accent)]"
        />
        <button type="button" className="btn btn-icon border-transparent" aria-label="Zoom in" onClick={() => onChange(clampZoom(zoom + 0.1))}>
          <MagnifyingGlassPlus size={18} aria-hidden="true" />
        </button>
        <button type="button" className="btn min-w-14 border-transparent px-2 font-mono text-xs" onClick={() => onChange(1)} title="Reset zoom to 100%">
          {Math.round(zoom * 100)}%
        </button>
      </div>
    </div>
  );
}
