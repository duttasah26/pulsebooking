import { useState } from 'react';
import { CaretUp, Funnel } from '@phosphor-icons/react';
import Dock from './Dock';
import Sheet from './Sheet';

// Filters and sort as a dock: on wide screens a panel on the right that folds to a tab. On narrow screens a row above the list
// that says what is chosen and opens the filters in a sheet (rising from the bottom on a phone, like a booking's details),
// closed with its X, a tap outside or Escape. `summary` is a short reminder of what is chosen ("Upcoming, Check-in date").
export default function FilterDock({ wide, open, onToggle, summary, children }) {
  const [sheet, setSheet] = useState(false);
  if (wide) {
    return (
      <Dock open={open} onToggle={onToggle} label="Filters and sort" title="Filter & Sort" tab="Filter & Sort">
        {children}
      </Dock>
    );
  }
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={sheet}
        onClick={() => setSheet(true)}
        className="flex min-h-12 w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-left text-base font-semibold transition-colors duration-150 hover:bg-surface-2"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Funnel size={18} aria-hidden="true" className="shrink-0" />
          <span className="shrink-0 whitespace-nowrap">Filter &amp; Sort</span>
          <span className="min-w-0 font-normal leading-snug text-muted">{summary}</span>
        </span>
        <CaretUp size={16} aria-hidden="true" className="shrink-0" />
      </button>
      {sheet && (
        <Sheet title="Filter & Sort" onClose={() => setSheet(false)}>
          <div className="rounded-lg border border-line bg-surface p-4">{children}</div>
        </Sheet>
      )}
    </>
  );
}
