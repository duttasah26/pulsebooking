import { VIEWS } from './useCalendarParams';

// Month / Timeline / Occupancy / Day. The labels turn into icons when the calendar column is narrow.
export default function ViewTabs({ view, onChange }) {
  return (
    <div role="tablist" aria-label="Calendar view" className="seg no-scrollbar max-w-full overflow-x-auto">
      {VIEWS.map((v) => (
        <button
          key={v.key}
          role="tab"
          type="button"
          title={v.label}
          aria-selected={view === v.key}
          onClick={() => onChange(v.key)}
          className="seg-item shrink-0"
        >
          <v.Icon size={18} weight={view === v.key ? 'fill' : 'bold'} aria-hidden="true" className="shrink-0" />
          <span className="sr-only @[52rem]:not-sr-only">{v.label}</span>
        </button>
      ))}
    </div>
  );
}
