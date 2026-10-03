import { ArrowDown, ArrowUp, ArrowsDownUp, Clock, Funnel } from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';

/*
  The contents of a filter and sort dock: a list of filters (each with an icon), a "sort by" list and the direction.
  Used by the Bookings page (and the Guests page, with its own filters and sorts).
    filters: [{ key, label, Icon }]   sorts: [[value, label]]
    extra: more controls shown under the filters (the Bookings page puts its room and status choosers there)
    showHolds / onShowHolds: optional "show on-hold bookings" switch (leave out to hide it)
*/
export default function FilterSortPanel({ filters, filter, onFilter, extra, showHolds, onShowHolds, sorts, sort, onSort, direction, onDirection }) {
  return (
    <div className="space-y-4 pb-4">
      {filters && (
        <fieldset>
          <FieldLabel as="legend" icon={Funnel}>Show</FieldLabel>
          <div className="grid gap-1">
            {filters.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => onFilter(key)}
                className={`btn justify-start gap-2 border-transparent px-2.5 ${filter === key ? 'bg-accent text-accent-ink hover:bg-accent' : ''}`}
              >
                <Icon size={16} aria-hidden="true" className="shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {extra}

      {onShowHolds && (
        <label className="btn cursor-pointer justify-start gap-2 px-2.5 focus-within:outline-2 focus-within:outline-accent">
          <input type="checkbox" name="show-holds" className="size-4 accent-[var(--accent)]" checked={showHolds} onChange={(e) => onShowHolds(e.target.checked)} />
          <Clock size={16} aria-hidden="true" className="shrink-0" />
          Show On Hold
        </label>
      )}

      <div>
        <FieldLabel icon={ArrowsDownUp} htmlFor="sort-by">Sort by</FieldLabel>
        <select id="sort-by" name="sort" className="field" value={sort} onChange={(e) => onSort(e.target.value)}>
          {sorts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <div className="mt-2 grid grid-cols-2 gap-1" role="group" aria-label="Sort direction">
          {[['asc', 'Up', ArrowUp], ['desc', 'Down', ArrowDown]].map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={direction === value}
              onClick={() => onDirection(value)}
              className={`btn gap-1.5 px-2 ${direction === value ? 'border-accent bg-accent-soft' : ''}`}
            >
              <Icon size={16} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
