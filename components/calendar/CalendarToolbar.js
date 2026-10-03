import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react';
import ViewTabs from './ViewTabs';
import FloorToggle from './FloorToggle';
import { SPANS } from './useCalendarParams';
import { isDate, today } from '../../lib/dates';

// One slim row: previous / next / today / go to a date, the heading, the view tabs, the floor toggle and (timeline) the
// number of days. Labels turn into icons when the column is narrow, so nothing is squeezed or hidden.
export default function CalendarToolbar({ view, date, span, title, onStep, set, floorKeys, shownFloors, onToggleFloor }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" className="btn btn-icon shrink-0" onClick={() => onStep(-1)} aria-label="Previous">
        <CaretLeft size={18} />
      </button>
      <button type="button" className="btn btn-icon shrink-0" onClick={() => onStep(1)} aria-label="Next">
        <CaretRight size={18} />
      </button>
      <button type="button" className="btn shrink-0 px-3" onClick={() => set({ date: today() })}>Today</button>
      <label className="btn relative shrink-0 cursor-pointer gap-1.5 px-2.5 focus-within:outline-2 focus-within:outline-accent" title="Go to a date">
        <CalendarBlank size={16} />
        <span className="sr-only @[44rem]:not-sr-only">Go to</span>
        <input
          type="date"
          aria-label="Jump to date"
          value={date}
          onChange={(e) => isDate(e.target.value) && set({ date: e.target.value })}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <h1 className="mx-1 min-w-0 flex-1 basis-32 truncate text-base font-semibold">{title}</h1>

      <ViewTabs view={view} onChange={(v) => set({ view: v })} />
      <FloorToggle floorKeys={floorKeys} shownFloors={shownFloors} onToggle={onToggleFloor} />
      {view === 'timeline' && (
        <select aria-label="Days shown" className="field !w-auto shrink-0" value={span} onChange={(e) => set({ span: Number(e.target.value) })}>
          {SPANS.map((n) => <option key={n} value={n}>{n} days</option>)}
        </select>
      )}
    </div>
  );
}
