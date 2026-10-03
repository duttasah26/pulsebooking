// Live description of the selection being made, pinned to the top right of the grid.
export function SelectionSummary({ summary }) {
  if (!summary) return null;
  return (
    <p
      aria-live="polite"
      className="pointer-events-none absolute right-2 top-2 z-[4] max-w-[85%] rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-canvas shadow-lg"
    >
      {summary}
    </p>
  );
}

// Touch: after the first tap, a bar offers to place the hold or cancel (a second tap on another cell extends it).
export function TouchBar({ summary, onCancel, onHold }) {
  return (
    <div className="fixed inset-x-0 bottom-28 z-30 flex justify-center px-4 md:bottom-14">
      <div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-line bg-surface p-2 pl-4 shadow-lg">
        <p className="flex-1 text-sm">
          <span className="font-medium">{summary}</span>
          <span className="block text-muted">Tap the opposite corner to extend</span>
        </p>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={onHold}>Hold</button>
      </div>
    </div>
  );
}
