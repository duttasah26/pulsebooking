import { useRef, useState } from 'react';
import { ArrowUUpLeft, ArrowUUpRight, ChatCircleDots, CheckSquare, Clock, Cursor, Hand, Plus, Question } from '@phosphor-icons/react';
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
// The name beside a tool wears the tool's colour: New green (a booking), On Hold straw with a dashed edge (a hold), the rest ink.
const TIP = {
  green: 'border-accent bg-accent text-accent-ink',
  amber: 'border-dashed border-hold-edge bg-hold text-hold-ink',
  ink: 'border-ink bg-ink text-white',
};

export default function ToolRail({ canTool, quickHold, drawing, hand, touch, touchSelect, onToggleMouse, onToggleSelect, onToggleHold, onToggleHand, history, onNew, onHelp }) {
  const openOn = !quickHold && !touchSelect && !hand && !drawing;
  // With a pointer (touch is false) the tools are icons alone and their names slide in beside them: one label that glides to the
  // button under the pointer or keyboard focus. On a phone held sideways the name stays under the symbol, as there is no hover.
  const v = touch ? { vertical: true } : { vertical: true, side: true };
  const nav = useRef(null);
  // The label keeps its last place when it fades out, so it never travels from the top of the screen: it appears right beside the
  // button (fading in), and only slides when it moves from one button to the next.
  const [tip, setTip] = useState(null); // { label, key, tone, y, x }
  const [on, setOn] = useState(false);
  const wasOn = useRef(false);
  const [glide, setGlide] = useState(false);
  const hide = () => {
    wasOn.current = false;
    setOn(false);
  };
  const show = (e) => {
    const b = e.target.closest?.('button[data-tip]');
    if (!b || !nav.current) return hide();
    const r = b.getBoundingClientRect();
    setGlide(wasOn.current);
    wasOn.current = true;
    setOn(true);
    setTip({ label: b.dataset.tip, key: b.dataset.key, tone: b.dataset.tone, y: r.top + r.height / 2, x: nav.current.getBoundingClientRect().right + 10 });
  };
  return (
    <>
    <nav ref={nav} onMouseOver={show} onFocus={show} onMouseLeave={hide} onBlur={hide} onScroll={hide} aria-label="Tools" className="no-scrollbar sticky top-[4.75rem] flex max-h-[calc(100dvh-5.25rem)] flex-col gap-1 self-start overflow-y-auto rounded-lg border border-line bg-surface p-2 short:top-12 short:max-h-[calc(100dvh-3.5rem)]">
      {/* Book: start a booking, or reserve nights. */}
      {onNew && (
        <ToolButton {...v} keyHint="N" tip="New Booking" icon={Plus} tone="green" label="New" title="New Booking: open an empty form, then draw the stay on the calendar" on={drawing} onClick={onNew} />
      )}
      {canTool && (
        <>
          <ToolButton
            {...v}
            icon={Clock}
            tone="amber"
            label="On Hold"
            title="On Hold: drag across free nights to put a room on hold, or drag a hold to change its dates"
            on={quickHold}
            onClick={onToggleHold}
          />
          <hr className="mx-2 my-1 border-line" />
          {/* Look: open, pick, or move around. */}
          <ToolButton
            {...v}
            icon={Cursor}
            tone="ink"
            label="Open"
            title={touch ? 'Open: tap a booking to see it' : 'Open: click a booking to see it, or drag a box to pick several. Double-click to see its whole group'}
            on={openOn}
            onClick={onToggleMouse}
          />
          <ToolButton {...v} icon={CheckSquare} label="Select" title={touch ? 'Select: tap bookings to pick several, then delete them together' : 'Select: click bookings to pick several, no Ctrl needed. Move them, stretch them or delete them together'} on={touchSelect} onClick={onToggleSelect} />
          <ToolButton {...v} icon={Hand} label="Hand" title="Hand: drag the calendar to move around it" on={hand} onClick={onToggleHand} />
          <hr className="mx-2 my-1 border-line" />
        </>
      )}
      {/* Fix: undo and redo. */}
      <ToolButton
        {...v}
        icon={ArrowUUpLeft}
        label="Undo"
        title={history.canUndo ? `Undo: ${history.undoLabel} (Ctrl+Z)` : 'Nothing to undo'}
        disabled={!history.canUndo}
        onClick={history.undo}
      />
      <ToolButton
        {...v}
        icon={ArrowUUpRight}
        label="Redo"
        title={history.canRedo ? `Redo: ${history.redoLabel} (Ctrl+Shift+Z)` : 'Nothing to redo'}
        disabled={!history.canRedo}
        onClick={history.redo}
      />
      <hr className="mx-2 my-1 border-line" />
      {onHelp && <ToolButton {...v} icon={Question} label="Help" title="How to use the calendar" onClick={onHelp} />}
      {!touch && (
        <ToolButton
          {...v}
          icon={ChatCircleDots}
          label="Assistant"
          title="Ask the assistant about rooms, nights, guests and contacts"
          onClick={() => window.dispatchEvent(new Event(OPEN_ASSISTANT))}
        />
      )}
    </nav>
    {!touch && (
      // Two layers: the outer one only travels from button to button (a long, soft ease); the inner one is the label itself, which
      // fades in with a small step out from the dock, and changes colour smoothly when the tool under the pointer changes.
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', left: tip?.x ?? -999, top: 0, willChange: 'transform',
          transform: `translateY(${(tip?.y ?? 0) - 18}px)`,
          transition: glide ? 'transform 260ms cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
        }}
        className="pointer-events-none z-30"
      >
        <div
          style={{
            opacity: on ? 1 : 0,
            transform: on ? 'none' : 'translateX(-8px)',
            transition: 'opacity 180ms ease-out, transform 220ms cubic-bezier(0.32, 0.72, 0, 1), background-color 180ms ease-out, border-color 180ms ease-out, color 180ms ease-out',
          }}
          className={`flex items-center gap-2 whitespace-nowrap rounded-md border px-3 py-1.5 text-[0.9375rem] font-semibold shadow-lg ${TIP[tip?.tone] ?? TIP.ink}`}
        >
          {tip?.label}
          {tip?.key && <kbd className="rounded border border-current/40 px-1.5 font-mono text-sm leading-5">{tip.key}</kbd>}
        </div>
      </div>
    )}
    </>
  );
}
