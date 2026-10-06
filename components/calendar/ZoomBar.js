import { MagnifyingGlassMinus, MagnifyingGlassPlus, Question } from '@phosphor-icons/react';
import { MousePill, PencilPill } from './InlineIcons';

const MIN = 0.6;
const MAX = 1.6;
export const clampZoom = (z) => Math.min(MAX, Math.max(MIN, Math.round(z * 20) / 20)); // 5% steps, so pinching feels smooth

// The line under the grid: what to do with the tool you have picked, in large plain words with the tool's own icon, a
// "How to use" button for the full guide, and the zoom slider on the right. Smaller shows more at once; larger makes the
// cells easier to hit.
function ToolHint({ tool }) {
  // On Hold, Select, Hand and New Booking each have their own banner under the calendar, so only Open keeps this line.
  if (tool !== 'mouse') return null;
  return (
    <p>
      <MousePill /> Click a booking to see it. Drag a box over several to pick them. To hold a room, choose <PencilPill />.
    </p>
  );
}

// What a finger does with each tool (phones and tablets; the zoom buttons float over the grid there).
const TOUCH_HINT = {
  mouse: 'Tap a booking to open it. Pinch the calendar to zoom.',
  select: 'Tap each booking to pick it. Then delete them together.',
  hand: 'Drag the calendar to move around it.',
};

// Holding a room is two taps, drawn as two numbered steps. The second tap places the hold: there is nothing to confirm.
function HoldSteps() {
  const step = 'inline-flex items-center gap-1.5 whitespace-nowrap';
  const num = 'grid size-6 shrink-0 place-items-center rounded-full bg-accent font-mono text-sm font-semibold text-accent-ink';
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-medium" aria-label="How to reserve a room">
      <li className={step}><span className={num}>1</span> Tap the first night</li>
      <li aria-hidden="true" className="text-muted">then</li>
      <li className={step}><span className={num}>2</span> Tap the last night</li>
    </ol>
  );
}

// The zoom control, in the top toolbar beside the month: minus, a slider (wide screens), plus, and the percentage, which
// is also the way back to 100%. Smaller shows more of the calendar; larger makes the cells easier to hit.
export function ZoomControl({ zoom, onChange }) {
  const pct = Math.round(zoom * 100);
  const fill = ((zoom - MIN) / (MAX - MIN)) * 100;
  return (
    <div role="group" aria-label="Zoom" className="flex shrink-0 items-center gap-0.5 rounded-lg border border-chrome-line bg-chrome p-0.5">
      <button type="button" className="btn btn-icon border-transparent" aria-label="Zoom out, show more" title="Zoom out: show more" disabled={zoom <= MIN} onClick={() => onChange(clampZoom(zoom - 0.1))}>
        <MagnifyingGlassMinus size={20} aria-hidden="true" />
      </button>
      <input
        type="range"
        name="zoom"
        min={MIN}
        max={MAX}
        step="0.05"
        value={zoom}
        onChange={(e) => onChange(clampZoom(Number(e.target.value)))}
        aria-label="Calendar zoom"
        aria-valuetext={`${pct} percent`}
        className="zoom-range hidden w-28 lg:block"
        style={{ '--fill': `${fill}%` }}
      />
      <button type="button" className="btn btn-icon border-transparent" aria-label="Zoom in, make bigger" title="Zoom in: make bigger" disabled={zoom >= MAX} onClick={() => onChange(clampZoom(zoom + 0.1))}>
        <MagnifyingGlassPlus size={20} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`btn min-w-16 px-2 font-mono text-sm font-semibold tabular-nums ${pct === 100 ? 'border-transparent text-muted' : 'border-accent bg-accent-soft text-accent-text'}`}
        onClick={() => onChange(1)}
        aria-label={`Zoom is ${pct} percent. Press to go back to 100 percent`}
        title="Back to 100%"
      >
        {pct}%
      </button>
    </div>
  );
}

export default function ZoomBar({ tool = 'mouse', strip, onHelp, touch = false }) {
  return (
    <div data-below-grid className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1">
      {strip ? (
        <div className="min-w-0 flex-1 basis-64">{strip}</div>
      ) : touch ? (
        <div className="min-w-0 flex-1 basis-48 px-1 text-base leading-snug text-ink short:hidden">
          {tool === 'mouse' ? TOUCH_HINT.mouse : null}
        </div>
      ) : (
        <div className="min-w-0 flex-1 basis-72 text-base leading-snug text-ink/80">
          <ToolHint tool={tool} />
        </div>
      )}
      {onHelp && (
        <button type="button" className="btn min-h-9 shrink-0 gap-1.5 px-3 font-semibold lg:min-h-9" onClick={onHelp}>
          <Question size={18} weight="bold" aria-hidden="true" /> How to use
        </button>
      )}
    </div>
  );
}
