import { ArrowDown, ArrowUp, ArrowsDownUp, Clock, Funnel, Sliders, X } from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import { FoldSection } from '../FilterParts';
import { useSettings } from '../SettingsProvider';
import { colorFor } from '../../lib/colors';

/*
  The contents of a filter and sort dock: a list of filters (each with an icon), more filters, a "sort by" with an optional
  "then by", and the look of the list. Used by the Bookings page and the Guests page, each with its own choices.
    filters: [{ key, label, Icon }]   sorts: [[value, label]]
    extra: more controls shown under the filters (rooms, status, organization, dates ...)
    showHolds / onShowHolds: optional "show on-hold bookings" switch (leave out to hide it)
    sort2 / onSort2 / direction2 / onDirection2: the second sort, used to break ties ("" is none)
    look: the columns and row size controls (ViewOptions)    activeCount / onClearAll: how many filters are on, and a way to clear them
*/
function Direction({ value, onChange, label }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-1" role="group" aria-label={label}>
      {[['asc', 'Up', ArrowUp], ['desc', 'Down', ArrowDown]].map(([v, text, Icon]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`btn gap-1.5 px-2 ${value === v ? 'border-accent bg-accent-soft' : ''}`}
        >
          <Icon size={16} aria-hidden="true" /> {text}
        </button>
      ))}
    </div>
  );
}

export default function FilterSortPanel({
  filters, filter, onFilter, extra, showHolds, onShowHolds, sorts, sort, onSort, direction, onDirection,
  sort2, onSort2, direction2, onDirection2, look, activeCount = 0, onClearAll, foldId = 'list',
}) {
  const { settings } = useSettings();
  const hold = colorFor({ status: 'on_hold' }, settings);
  return (
    <div className="space-y-5 pb-4">
      {activeCount > 0 && onClearAll && (
        <button type="button" className="btn w-full justify-between gap-2 border-accent bg-accent-soft px-3 font-semibold text-accent-text" onClick={onClearAll}>
          <span>{activeCount} {activeCount === 1 ? 'filter' : 'filters'} on</span>
          <span className="flex items-center gap-1 text-ink"><X size={16} weight="bold" aria-hidden="true" /> Clear all</span>
        </button>
      )}

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
        <label
          className="btn cursor-pointer justify-start gap-2 px-2.5 focus-within:outline-2 focus-within:outline-accent"
          style={showHolds ? { backgroundColor: hold.bg, borderColor: 'var(--ink)', borderWidth: 2 } : { borderColor: hold.border }}
        >
          <input type="checkbox" name="show-holds" className="size-4 accent-[var(--accent)]" checked={showHolds} onChange={(e) => onShowHolds(e.target.checked)} />
          <Clock size={16} aria-hidden="true" className="shrink-0" />
          Show On Hold
        </label>
      )}

      <FoldSection id={`${foldId}-sort`} title="Sort" icon={ArrowsDownUp} defaultOpen badge={sort2 ? 1 : 0}>
        <div>
          <FieldLabel icon={ArrowsDownUp} htmlFor="sort-by">Sort by</FieldLabel>
          <select id="sort-by" name="sort" className="field" value={sort} onChange={(e) => onSort(e.target.value)}>
            {sorts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <Direction value={direction} onChange={onDirection} label="Sort direction" />
        </div>
        {onSort2 && (
          <div>
            <FieldLabel icon={ArrowsDownUp} htmlFor="sort-then">Then by</FieldLabel>
            <select id="sort-then" name="sort2" className="field" value={sort2} onChange={(e) => onSort2(e.target.value)}>
              <option value="">Nothing else</option>
              {sorts.filter(([v]) => v !== sort).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {sort2 && <Direction value={direction2} onChange={onDirection2} label="Second sort direction" />}
          </div>
        )}
      </FoldSection>

      {look && (
        <FoldSection id={`${foldId}-look`} title="How it looks" icon={Sliders}>
          {look}
        </FoldSection>
      )}
    </div>
  );
}
