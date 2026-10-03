import { MagnifyingGlassMinus, MagnifyingGlassPlus, Question } from '@phosphor-icons/react';
import { MousePill, PencilPill, SavePill } from './InlineIcons';

const MIN = 0.6;
const MAX = 1.6;
export const clampZoom = (z) => Math.min(MAX, Math.max(MIN, Math.round(z * 10) / 10));

// The line under the grid: what to do with the tool you have picked, in large plain words with the tool's own icon, a
// "How to use" button for the full guide, and the zoom slider on the right. Smaller shows more at once; larger makes the
// cells easier to hit.
function ToolHint({ tool }) {
  if (tool === 'pencil') {
    return (
      <p>
        <PencilPill /> To book a room, drag across empty days. To change a booking, drag it, or drag the white tab on its end, then press <SavePill />.
      </p>
    );
  }
  return (
    <p>
      <MousePill /> Click a booking to see it. Drag a box over several to pick them. Click an empty spot to unpick. To book a room, choose the <PencilPill /> on the left.
    </p>
  );
}

export default function ZoomBar({ zoom, onChange, tool = 'mouse', strip, onHelp }) {
  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1">
      {strip ? (
        <div className="min-w-0 flex-1 basis-64">{strip}</div>
      ) : onHelp ? (
        <div className="min-w-0 flex-1 basis-72 text-base leading-snug text-ink/80">
          <ToolHint tool={tool} />
        </div>
      ) : (
        <div className="flex-1" /> // phones: the controls differ, so no desktop instructions here
      )}
      {onHelp && (
        <button type="button" className="btn min-h-9 shrink-0 gap-1.5 px-3 font-semibold lg:min-h-9" onClick={onHelp}>
          <Question size={18} weight="bold" aria-hidden="true" /> How to use
        </button>
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
