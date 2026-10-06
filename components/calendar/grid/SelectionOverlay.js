import { Clock, X } from '@phosphor-icons/react';

// Live description of the selection being made, pinned to the top right of the grid.
export function SelectionSummary({ summary }) {
  if (!summary) return null;
  return (
    <p
      aria-live="polite"
      className="pointer-events-none absolute right-2 top-2 z-[4] max-w-[85%] rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-canvas shadow-lg short:hidden"
    >
      {summary}
    </p>
  );
}

// Touch: after the first tap, a bar offers to place the hold or cancel (a second tap on another cell extends it).
// Held sideways it moves up under the header, at the right, so the nights still to be tapped stay uncovered.
export function TouchBar({ summary, onCancel, onHold }) {
  return (
    <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 md:bottom-6 short:bottom-auto short:top-12 short:justify-end short:px-2">
      <div className="animate-fade flex w-full max-w-md items-center gap-2 short:max-w-lg rounded-lg border border-line bg-surface p-2 pl-4 shadow-lg">
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-medium">{summary}</span>
          <span className="block text-muted">Now tap the last night</span>
        </p>
        <button type="button" className="btn" onClick={onCancel}><X size={18} aria-hidden="true" /> Cancel</button>
        <button type="button" className="btn btn-primary" onClick={onHold}><Clock size={18} aria-hidden="true" /> Hold 1 Night</button>
      </div>
    </div>
  );
}
