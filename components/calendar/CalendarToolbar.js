import { useState } from 'react';
import { ArrowUUpLeft, ArrowUUpRight, CalendarBlank, CaretLeft, CaretRight, Cursor, PencilSimpleLine, Selection } from '@phosphor-icons/react';
import ToolButton from './ToolButton';
import ViewTabs from './ViewTabs';
import FloorToggle from './FloorToggle';
import RangePopover from './RangePopover';
import { SPANS } from './useCalendarParams';
import { daysInMonth, monthStart, today } from '../../lib/dates';

// A small group of tool buttons in one outlined strip.
function Strip({ label, children }) {
  return (
    <div role="group" aria-label={label} className="flex shrink-0 items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5">
      {children}
    </div>
  );
}

// Timeline length: 7, 14 or 30 days, or a custom range (which opens the same panel as Go to).
function RangeSelect({ span, monthAligned, onCustom, set, onResetView }) {
  const preset = SPANS.includes(span);
  // Choosing a length starts from the default view for it: the days fill the screen again, from the first day.
  const choose = (value) => {
    if (value === 'custom') return onCustom();
    if (value === 'month') {
      const first = monthStart(today()); // this calendar month, 1st to last day
      set({ date: first, span: daysInMonth(first) });
      return onResetView();
    }
    set({ span: Number(value) });
    onResetView();
  };
  return (
    <select aria-label="Days shown" className="field !w-auto shrink-0" value={monthAligned ? 'month' : span} onChange={(e) => choose(e.target.value)}>
      {SPANS.map((n) => <option key={n} value={n}>{n} days</option>)}
      <option value="month">Month</option>
      {!preset && !monthAligned && <option value={span}>{span} days (custom)</option>}
      <option value="custom">Custom range…</option>
    </select>
  );
}

// Top row: step buttons, Today, Go to, and the heading in large type. Second row: the view tabs, floors and range. On
// narrow screens the tools (pencil, select) and undo / redo sit here too; on wide screens they live in the pane on the right.
export default function CalendarToolbar({
  view, date, span, title, onStep, set, floorKeys, shownFloors, onToggleFloor,
  monthAligned, onHome, onResetView, wide, canTool, quickHold, onToggleMouse, onToggleHold, selectMode, onToggleSelect, history,
}) {
  const [rangeOpen, setRangeOpen] = useState(false);
  const show = ({ date: d, span: n }) => {
    setRangeOpen(false);
    onResetView();
    set(n === 1 ? { date: d } : { date: d, span: n, view: 'timeline' }); // one day just jumps; more opens the timeline for those days
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className="btn btn-icon shrink-0" onClick={() => onStep(-1)} aria-label="Previous">
          <CaretLeft size={18} />
        </button>
        <button type="button" className="btn btn-icon shrink-0" onClick={() => onStep(1)} aria-label="Next">
          <CaretRight size={18} />
        </button>
        <button type="button" className="btn shrink-0 px-3" onClick={() => { set({ date: today() }); onHome(); }}>Today</button>
        <div className="relative shrink-0">
          <button
            type="button"
            className={`btn gap-1.5 px-3 ${rangeOpen ? 'bg-surface-2' : ''}`}
            title="Go to a date, or choose a range of days"
            aria-expanded={rangeOpen}
            onPointerDown={(e) => e.stopPropagation()} // so the panel's click-outside close does not fight this button
            onClick={() => setRangeOpen((o) => !o)}
          >
            <CalendarBlank size={16} aria-hidden="true" />
            <span className="sr-only @[44rem]:not-sr-only">Go to</span>
          </button>
          {rangeOpen && <RangePopover date={date} span={span} onShow={show} onClose={() => setRangeOpen(false)} />}
        </div>
        <h1 className="mx-2 min-w-0 flex-1 basis-48 text-xl font-semibold leading-tight tracking-tight @[44rem]:text-2xl">{title}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <ViewTabs view={view} onChange={(v) => set({ view: v })} />
        <FloorToggle floorKeys={floorKeys} shownFloors={shownFloors} onToggle={onToggleFloor} />
        {view === 'timeline' && <RangeSelect span={span} monthAligned={monthAligned} set={set} onCustom={() => setRangeOpen(true)} onResetView={onResetView} />}

        {!wide && canTool && (
          <Strip label="Tools">
            <ToolButton
              icon={Cursor}
              tone="ink"
              label="Mouse"
              title="Mouse: click a booking to open it, drag a box to select several"
              on={!quickHold && !selectMode}
              onClick={onToggleMouse}
            />
            <ToolButton
              icon={PencilSimpleLine}
              tone="amber"
              label="Quick Hold"
              title="Quick hold: drag across free nights to place a hold"
              on={quickHold && !selectMode}
              onClick={onToggleHold}
            />
            <ToolButton
              icon={Selection}
              tone="sky"
              label="Select"
              title="Select: drag a box or tap bookings to view or delete several at once"
              on={selectMode}
              onClick={onToggleSelect}
            />
          </Strip>
        )}

        {!wide && (
        <Strip label="History">
          <ToolButton icon={ArrowUUpLeft} label="Undo" title={history.canUndo ? `Undo: ${history.undoLabel} (Ctrl+Z)` : 'Nothing to undo'} disabled={!history.canUndo} onClick={history.undo} />
          <ToolButton icon={ArrowUUpRight} label="Redo" title={history.canRedo ? `Redo: ${history.redoLabel} (Ctrl+Shift+Z)` : 'Nothing to redo'} disabled={!history.canRedo} onClick={history.redo} />
        </Strip>
        )}
      </div>
    </div>
  );
}
