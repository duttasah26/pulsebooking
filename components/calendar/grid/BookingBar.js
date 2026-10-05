import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Clock, SignIn, X } from '@phosphor-icons/react';
import { useSettings } from '../../SettingsProvider';
import { colorFor, roomShade } from '../../../lib/colors';
import { fmtShort } from '../../../lib/dates';
import { packInfo } from './barInfo';

// One size observer for every bar on the calendar (a busy month has hundreds), not one each.
const sizeWatchers = new WeakMap();
let sharedObserver = null;
function watchSize(el, onSize) {
  sharedObserver ??= new ResizeObserver((entries) => entries.forEach((e) => sizeWatchers.get(e.target)?.(e.contentRect)));
  sizeWatchers.set(el, onSize);
  sharedObserver.observe(el);
  return () => {
    sharedObserver.unobserve(el);
    sizeWatchers.delete(el);
  };
}

// A picked booking: its edge itself becomes a dashed line in the bar's own edge colour, the dashes drifting slowly round
// the bar (no solid border and no black outline while it is picked). The drift
// stops with reduced motion; the dashes stay.
function MarchingDashes({ color }) {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
      <rect x="1" y="1" rx="7" style={{ width: 'calc(100% - 2px)', height: 'calc(100% - 2px)' }} fill="none" stroke={color} strokeWidth="2" strokeDasharray="6 5" className="animate-march" />
    </svg>
  );
}

// One booking drawn over the grid. Colour: the booking's own, else its guest's, else its status (on hold yellow,
// confirmed green). A hold is hatched with a dashed border and carries its own remove button, so it is a group of two
// buttons (the second, an X, cancels it); any other booking is a single button. In select mode every bar is one button that ticks it for bulk delete.
// The timeline bar says more the room it really has (measured, see barInfo.js): dates, status, nights, room and times are
// packed into lines like words, and whatever does not fit is left out rather than cut in half.
// Bars adapt to the width they get (container queries): icons appear from 70px, and in the month sheet a narrow
// bar runs the name down its tall side instead of cutting it to three letters.
export default function BookingBar({ b, g, rows, style: placement, active, selectMode, picked, onOpen, onPick, onView, onOpenGroup, onDelete, resizing, movable, onMoveStart }) {
  const { settings } = useSettings();
  const c = colorFor(b, settings);
  const hold = b.status === 'on_hold';
  const finished = b.status === 'checked_out';
  // A finger has no Ctrl key: on phones the Select tool makes a tap pick a booking; pressing and holding one for half a
  // second also picks it (then taps pick or unpick). With the Hold tool a finger drags the bar (touch-none stops the page scrolling instead).
  const press = useRef({ timer: null, fired: false });
  const pressStart = (e) => {
    if (e.pointerType !== 'touch') return;
    press.current.fired = false;
    clearTimeout(press.current.timer);
    press.current.timer = setTimeout(() => {
      press.current.fired = true;
      onPick(b);
    }, 500);
  };
  const pressEnd = () => clearTimeout(press.current.timer);
  const pressProps = {
    onPointerDown: (e) => (movable ? onMoveStart(e, b, 'move') : pressStart(e)),
    onPointerUp: pressEnd,
    onPointerLeave: pressEnd,
    onPointerCancel: pressEnd,
    onClickCapture: (e) => {
      if (press.current.fired) {
        e.stopPropagation(); // the click that ends a long press must not also open the booking
        e.preventDefault();
        press.current.fired = false;
      }
    },
    onContextMenu: (e) => e.preventDefault(),
  };
  // The bar's real size, so the details can be fitted to it.
  const rootRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!rows || !el) return undefined;
    return watchSize(el, ({ width, height }) => {
      setSize((prev) => (Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1 ? prev : { w: width, h: height }));
    });
  }, [rows, hold, selectMode]); // the bar is a different element as a hold, and in select mode
  const roomTone = roomShade({ number: b.room_number }, settings);
  const times = [b.check_in_time && `in ${b.check_in_time}`, b.check_out_time && `out ${b.check_out_time}`].filter(Boolean).join(', ');
  const label = `${b.name}, Room ${b.room_number}, ${fmtShort(b.check_in)} to ${fmtShort(b.check_out)}${times ? `, ${times}` : ''}`;

  const shape = `animate-bar-in @container relative z-[1] flex min-w-0 items-center gap-1 overflow-hidden rounded-lg border text-left text-sm font-medium lg:text-xs ${finished ? 'text-ink/75 saturate-[0.6]' : 'text-ink'} ${
    hold ? 'border-dashed' : ''
  } ${
    g.cutStart ? (rows ? 'rounded-l-none border-l-0' : 'rounded-t-none border-t-0') : ''
  } ${g.cutEnd ? (rows ? 'rounded-r-none border-r-0' : 'rounded-b-none border-b-0') : ''}`;

  const style = {
    ...placement,
    ...g.margin,
    // A finished stay is clearly faded: its colour washed toward the page, less saturated, its text at 75% (still above 5:1).
    backgroundColor: finished ? `color-mix(in srgb, ${c.bg} 35%, var(--surface))` : c.bg,
    borderColor: picked ? 'transparent' : finished ? `color-mix(in srgb, ${c.border} 40%, var(--surface))` : c.border, // a picked bar's edge is the moving dashes
    boxShadow: '0 0 0 1.5px var(--surface)',
    ...(active && !picked ? { outline: '2px solid var(--ink)', outlineOffset: '1px' } : {}),
    ...(resizing ? { outline: '3px solid var(--accent)', outlineOffset: '1px' } : {}),
    ...(hold ? { backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 5px, rgb(255 255 255 / 0.55) 5px 7px)' } : {}),
  };

  // Room for text beside the bar's own padding, icons, room chip and (on a hold) the remove button.
  const beside = (b.status === 'checked_in' || hold ? 18 : 0) + (hold && size.w >= 96 ? 40 : 0) + (hold ? 28 : 0);
  const lines = useMemo(
    () => (rows ? packInfo(b, roomTone, hold, size.w - 4 - beside, size.h, typeof window !== 'undefined' && window.innerWidth < 1024) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, b, roomTone.fill, roomTone.edge, hold, size.w, size.h, beside],
  );

  const content = (
    <>
      {picked && <MarchingDashes color={c.border} />}
      {b.status === 'checked_in' && <SignIn size={14} weight="bold" className="hidden shrink-0 @min-[70px]:block" />}
      {hold && <Clock size={14} className="hidden shrink-0 @min-[70px]:block" />}
      {hold && (
        <span
          className="hidden shrink-0 rounded px-1 font-mono text-xs font-semibold leading-4 @min-[96px]:inline-block"
          style={{ backgroundColor: roomTone.fill, boxShadow: `inset 0 0 0 1px ${roomTone.edge}` }}
        >
          {b.room_number}
        </span>
      )}
      {lines.length === 0 ? (
        <span className={`truncate ${rows ? '' : 'max-h-full min-h-0 [writing-mode:vertical-rl] @min-[84px]:[writing-mode:horizontal-tb]'}`}>
          {b.name}
        </span>
      ) : (
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-px leading-4">
          <span className="truncate font-semibold">{b.name}</span>
          {lines.map((line) => (
            <span key={line.nodes[0].key} className="flex min-w-0 items-center gap-1 overflow-hidden font-normal">
              {line.nodes.map((n) => <span key={n.key} className="flex shrink-0 items-center gap-1">{n.node}</span>)}
            </span>
          ))}
        </span>
      )}
    </>
  );

  if (!hold || selectMode) {
    return (
      <button
        type="button"
        data-bid={b.id}
        onClick={(e) => (selectMode || e.ctrlKey || e.shiftKey || e.metaKey ? onPick(b) : onOpen(b))}
        onDoubleClick={() => onOpenGroup?.(b)}
        aria-pressed={selectMode ? Boolean(picked) : undefined}
        title={label}
        aria-label={`${label}, ${b.status.replace('_', ' ')}`}
        {...pressProps}
        ref={rootRef}
        className={`${shape} px-1.5 transition-[transform,filter] duration-150 hover:brightness-[0.97] @min-[70px]:px-2 ${movable ? 'cursor-grab touch-none active:cursor-grabbing' : 'active:scale-[0.98]'}`}
        style={style}
      >
        {content}
        </button>
    );
  }

  return (
    <div ref={rootRef} role="group" data-bid={b.id} aria-label={`${label}, on hold`} className={`${shape} pl-1.5 pr-0.5 @min-[70px]:pl-2`} style={style}>
      <button
        type="button"
        onClick={(e) => (e.ctrlKey || e.shiftKey || e.metaKey ? onPick(b) : onOpen(b))}
        onDoubleClick={() => onOpenGroup?.(b)}
        {...pressProps}
        title={label}
        className={`flex min-w-0 flex-1 items-center gap-1 self-stretch text-left ${movable ? 'cursor-grab touch-none active:cursor-grabbing' : ''}`}
      >
        {content}
      </button>
      <button
        type="button"
        aria-label={`Cancel hold, ${label}`}
        title="Cancel this hold (Undo brings it back)"
        onClick={() => onDelete?.(b)}
        className="relative grid size-5 shrink-0 place-items-center rounded-lg before:absolute before:-inset-x-2 before:-inset-y-1 before:content-[''] hover:bg-white/70 active:scale-90 @min-[70px]:size-6 [@media(pointer:coarse)]:before:-inset-x-3"
      >
        <X size={14} weight="bold" />
      </button>
    </div>
  );
}
