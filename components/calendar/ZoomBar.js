import { MagnifyingGlassMinus, MagnifyingGlassPlus, Question } from '@phosphor-icons/react';
import { MousePill, PencilPill, SavePill } from './InlineIcons';

const MIN = 0.6;
const MAX = 1.6;
export const clampZoom = (z) => Math.min(MAX, Math.max(MIN, Math.round(z * 20) / 20)); // 5% steps, so pinching feels smooth

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

// What a finger does with each tool (phones and tablets; the zoom buttons float over the grid there).
const TOUCH_HINT = {
  mouse: 'Tap a booking to open it. Pinch the calendar to zoom.',
  select: 'Tap each booking to pick it. Then delete them together.',
  pencil: 'Tap the first night, then the last night, to hold a room. To move a booking, drag it, then press Save.',
};

export default function ZoomBar({ zoom, onChange, tool = 'mouse', strip, onHelp, touch = false }) {
  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1">
      {strip ? (
        <div className="min-w-0 flex-1 basis-64">{strip}</div>
      ) : onHelp ? (
        <div className="min-w-0 flex-1 basis-72 text-base leading-snug text-ink/80">
          <ToolHint tool={tool} />
        </div>
      ) : (
        <p className="min-w-0 flex-1 text-sm leading-snug text-ink/80">{TOUCH_HINT[tool]}</p>
      )}
      {onHelp && (
        <button type="button" className="btn min-h-9 shrink-0 gap-1.5 px-3 font-semibold lg:min-h-9" onClick={onHelp}>
          <Question size={18} weight="bold" aria-hidden="true" /> How to use
        </button>
      )}
      {!touch && (
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
      )}
    </div>
  );
}
