import { ArrowUUpLeft, ArrowUUpRight, ChatCircleDots, Cursor, PencilSimpleLine } from '@phosphor-icons/react';
import { OPEN_ASSISTANT } from '../Assistant';
import ToolButton from './ToolButton';

// The tools in a slim vertical pane on the left edge of the page (wide screens). Mouse (the default): click opens a
// booking, drag draws a box to pick several. Pencil places holds by dragging over free nights and stretches a booking
// when you drag its end. Undo and Redo.
export default function ToolRail({ canTool, quickHold, onToggleMouse, onToggleHold, history }) {
  return (
    <nav aria-label="Tools" className="sticky top-[4.5rem] flex flex-col gap-1 self-start rounded-lg border border-line bg-surface p-1">
      {canTool && (
        <>
          <ToolButton
            vertical
            icon={Cursor}
            tone="ink"
            label="Mouse"
            title="Mouse: click a booking to open it, drag a box to pick several. Once something is picked, click a booking to pick or unpick it. Double-click to see its whole group"
            on={!quickHold}
            onClick={onToggleMouse}
          />
          <ToolButton
            vertical
            icon={PencilSimpleLine}
            tone="amber"
            label="Pencil"
            title="Pencil: drag across free nights to place a hold, or drag the end of a booking to change its dates"
            on={quickHold}
            onClick={onToggleHold}
          />
          <hr className="my-0.5 border-line" />
        </>
      )}
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
      <ToolButton
        vertical
        icon={ChatCircleDots}
        tone="green"
        label="Ask"
        title="Ask the assistant about rooms, nights, guests and contacts"
        onClick={() => window.dispatchEvent(new Event(OPEN_ASSISTANT))}
      />
    </nav>
  );
}
