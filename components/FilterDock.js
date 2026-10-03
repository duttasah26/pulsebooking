import { CaretDown, Funnel } from '@phosphor-icons/react';
import Dock from './Dock';

// Filters and sort as a dock: on wide screens a panel on the right that folds to a tab; on narrow screens a
// collapsible block (use it above the list). `summary` is a short reminder of what is chosen ("Upcoming, Check-in date").
export default function FilterDock({ wide, open, onToggle, summary, children }) {
  if (wide) {
    return (
      <Dock open={open} onToggle={onToggle} label="Filters and sort" title="Filter & Sort" tab="Filter & Sort">
        {children}
      </Dock>
    );
  }
  return (
    <details className="group rounded-lg border border-line bg-surface">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-medium">
        <span className="flex min-w-0 items-center gap-1.5">
          <Funnel size={16} aria-hidden="true" className="shrink-0" />
          Filter &amp; Sort
          <span className="truncate font-normal text-muted">{summary}</span>
        </span>
        <CaretDown size={16} aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-line p-3">{children}</div>
    </details>
  );
}
