import { ArrowUUpLeft, ArrowUUpRight, ChatCircleDots, CheckSquare, Cursor, Hand, PencilSimpleLine, Plus, Question } from '@phosphor-icons/react';
import { OPEN_ASSISTANT } from '../Assistant';
import ToolButton from './ToolButton';

// The tools in a slim vertical pane on the left edge of the page: on wide screens, and on a phone held sideways (where
// the page has width to spare but no height). One button each, icon over a one word label:
//   New     opens an empty booking form
//   Open    click a booking to open it, or drag a box to pick several
//   Select  click bookings to tick them, with no Ctrl key (also on touch screens)
//   On Hold drag across free nights to place a hold, or drag a hold to change it
//   Hand    drag the calendar to move around it
// then Undo and Redo (zoom lives in the top toolbar, beside the month). The pane scrolls if the screen is too short for all of it.
export default function ToolRail({ canTool, quickHold, drawing, hand, touch, touchSelect, onToggleMouse, onToggleSelect, onToggleHold, onToggleHand, history, onNew, onHelp }) {
  const openOn = !quickHold && !touchSelect && !hand && !drawing;
  return (
    <nav aria-label="Tools" className="no-scrollbar sticky top-[4.5rem] flex max-h-[calc(100dvh-5rem)] flex-col gap-1 self-start overflow-y-auto rounded-lg border border-line bg-surface p-1 short:top-12 short:max-h-[calc(100dvh-3.5rem)]">
      {/* Book: start a booking, or reserve nights. */}
      {onNew && (
        <ToolButton vertical icon={Plus} tone="green" label="New" title="New Booking: open an empty form, then draw the stay on the calendar" on={drawing} onClick={onNew} />
      )}
      {canTool && (
        <>
          <ToolButton
            vertical
            icon={PencilSimpleLine}
            tone="amber"
            label="On Hold"
            title="On Hold: drag across free nights to put a room on hold, or drag a hold to change its dates"
            on={quickHold}
            onClick={onToggleHold}
          />
          <hr className="my-0.5 border-line" />
          {/* Look: open, pick, or move around. */}
          <ToolButton
            vertical
            icon={Cursor}
            tone="ink"
            label="Open"
            title={touch ? 'Open: tap a booking to see it' : 'Open: click a booking to see it, or drag a box to pick several. Double-click to see its whole group'}
            on={openOn}
            onClick={onToggleMouse}
          />
          <ToolButton vertical icon={CheckSquare} tone="violet" label="Select" title={touch ? 'Select: tap bookings to pick several, then delete them together' : 'Select: click bookings to pick several, no Ctrl needed. Move them, stretch them or delete them together'} on={touchSelect} onClick={onToggleSelect} />
          <ToolButton vertical icon={Hand} tone="sky" label="Hand" title="Hand: drag the calendar to move around it" on={hand} onClick={onToggleHand} />
          <hr className="my-0.5 border-line" />
        </>
      )}
      {/* Fix: undo and redo. */}
      <ToolButton
        vertical
        icon={ArrowUUpLeft}
        label="Undo"
        title={history.canUndo ? `Undo: ${history.undoLabel} (Ctrl+Z)` : 'Nothing to undo'}
        disabled={!history.canUndo}
        onClick={history.undo}
      />
      <ToolButton
        vertical
        icon={ArrowUUpRight}
        label="Redo"
        title={history.canRedo ? `Redo: ${history.redoLabel} (Ctrl+Shift+Z)` : 'Nothing to redo'}
        disabled={!history.canRedo}
        onClick={history.redo}
      />
      <hr className="my-0.5 border-line" />
      {onHelp && <ToolButton vertical icon={Question} tone="sky" label="Help" title="How to use the calendar" onClick={onHelp} />}
      {!touch && (
        <ToolButton
          vertical
          icon={ChatCircleDots}
          tone="green"
          label="Ask"
          title="Ask the assistant about rooms, nights, guests and contacts"
          onClick={() => window.dispatchEvent(new Event(OPEN_ASSISTANT))}
        />
      )}
    </nav>
  );
}
