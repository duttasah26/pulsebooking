import { useState } from 'react';
import { ArrowUUpLeft, ArrowUUpRight, CalendarBlank, CaretLeft, CaretRight, CheckSquare, Cursor, Hand, PencilSimpleLine, Plus } from '@phosphor-icons/react';
import ToolButton from './ToolButton';
import ViewTabs from './ViewTabs';
import FloorToggle from './FloorToggle';
import { ZoomControl } from './ZoomBar';
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
// narrow screens the New booking button, the tools (Open, Select, Hold) and undo / redo sit here too; on wide screens they
// live in the pane on the left. A phone held sideways has no height to spare, so both rows become one: the second row
// scrolls sideways beside the first.
export default function CalendarToolbar({
  view, date, span, title, onStep, set, floorKeys, shownFloors, onToggleFloor,
  monthAligned, onHome, onResetView, wide, canTool, quickHold, drawing, touchSelect, hand, onToggleMouse, onToggleSelect, onToggleHold, onToggleHand, history, zoom, onZoom, onNew,
}) {
  const [rangeOpen, setRangeOpen] = useState(false);
  const show = ({ date: d, span: n }) => {
    setRangeOpen(false);
    onResetView();
    set(n === 1 ? { date: d } : { date: d, span: n, view: 'timeline' }); // one day just jumps; more opens the timeline for those days
  };
  return (
    <div className="space-y-2 short:flex short:items-center short:gap-1.5 short:space-y-0">
      <div className="flex flex-wrap items-center gap-1.5 short:shrink-0 short:flex-nowrap">
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
        <div className="mx-2 flex min-w-0 flex-1 basis-48 items-center gap-2 short:flex-none short:basis-auto">
          <h1 className="min-w-0 flex-1 text-xl font-semibold leading-tight tracking-tight @[44rem]:text-2xl short:max-w-36 short:truncate short:text-base">{title}</h1>
        </div>
      </div>

      {/* Row 2: what to look at. On a phone it is one line that scrolls sideways, so it never wraps into three. */}
      <div className="no-scrollbar flex flex-wrap items-center gap-1.5 max-md:flex-nowrap max-md:overflow-x-auto short:min-w-0 short:flex-1 short:flex-nowrap short:overflow-x-auto">
        <ViewTabs view={view} onChange={(v) => set({ view: v })} />
        <FloorToggle floorKeys={floorKeys} shownFloors={shownFloors} onToggle={onToggleFloor} />
        {view === 'timeline' && <RangeSelect span={span} monthAligned={monthAligned} set={set} onCustom={() => setRangeOpen(true)} onResetView={onResetView} />}
        {canTool && onZoom && <ZoomControl zoom={zoom} onChange={onZoom} />}
      </div>

      {/* Row 3 (phones and tablets; the desktop has the tool column): New Booking, the tools and Undo / Redo, in one line that
          scrolls sideways when it is wider than the screen. */}
      {!wide && (
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
          {onNew && (
            <Strip label="New">
              <ToolButton icon={Plus} tone="green" label="New Booking" title="New Booking: draw the stay on the calendar, or type the dates" on={drawing} onClick={onNew} />
            </Strip>
          )}
          {canTool && (
            <Strip label="Tools">
              <ToolButton icon={Cursor} tone="ink" label="Open" title="Open: tap a booking to see it" on={!quickHold && !touchSelect && !hand && !drawing} onClick={onToggleMouse} />
              <ToolButton icon={CheckSquare} tone="violet" label="Select" title="Select: tap bookings to pick several, then delete them together" on={touchSelect} onClick={onToggleSelect} />
              <ToolButton icon={PencilSimpleLine} tone="amber" label="On Hold" title="On Hold: tap the first and last free night to put a room on hold, or drag a booking to move it" on={quickHold} onClick={onToggleHold} />
              <ToolButton icon={Hand} tone="sky" label="Hand" title="Hand: drag the calendar to move around it" on={hand} onClick={onToggleHand} />
            </Strip>
          )}
          <Strip label="History">
            <ToolButton iconOnly icon={ArrowUUpLeft} label="Undo" title={history.canUndo ? `Undo: ${history.undoLabel} (Ctrl+Z)` : 'Nothing to undo'} disabled={!history.canUndo} onClick={history.undo} />
            <ToolButton iconOnly icon={ArrowUUpRight} label="Redo" title={history.canRedo ? `Redo: ${history.redoLabel} (Ctrl+Shift+Z)` : 'Nothing to redo'} disabled={!history.canRedo} onClick={history.redo} />
          </Strip>
        </div>
      )}
    </div>
  );
}
