import { VIEWS } from './useCalendarParams';

// Month / Timeline / Occupancy / Day. The labels turn into icons when the calendar column is narrow.
export default function ViewTabs({ view, onChange }) {
  return (
    <div role="tablist" aria-label="Calendar view" className="no-scrollbar flex max-w-full shrink-0 gap-0.5 overflow-x-auto rounded-lg border border-line bg-surface p-0.5">
      {VIEWS.map((v) => (
        <button
          key={v.key}
          role="tab"
          type="button"
          title={v.label}
          aria-selected={view === v.key}
          onClick={() => onChange(v.key)}
          className={`btn min-h-8 shrink-0 gap-1.5 border-transparent px-2.5 lg:min-h-7 ${view === v.key ? 'bg-accent text-accent-ink hover:bg-accent' : ''}`}
        >
          <v.Icon size={16} aria-hidden="true" className="shrink-0" />
          <span className="sr-only @[52rem]:not-sr-only">{v.label}</span>
        </button>
      ))}
    </div>
  );
}
