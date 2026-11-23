import { useEffect, useRef, useState } from 'react';
import { Eye, EyeSlash, SlidersHorizontal } from '@phosphor-icons/react';
import FloorToggle from './FloorToggle';
import Switch from '../Switch';
import { useKeepInView } from '../../lib/useKeepInView';

// "View": what the calendar shows, in one menu instead of two more groups in the controls row. The floors to show and whether stays that have
// already checked out are drawn. A small number on the button says how many of those are switched off, so a hidden floor is never a surprise.
export default function ViewMenu({ compact = false, floorKeys, shownFloors, onToggleFloor, showDone, onToggleDone, days = null }) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState({ top: 0, left: 0 }); // where the menu opens, from the button's place on screen (the controls row can scroll sideways, which would clip a menu inside it)
  const box = useRef(null);
  const panel = useRef(null);
  useKeepInView(panel, open); // clear of the phone tab bar, not only the bottom of the screen
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => !box.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const hasFloors = floorKeys.length >= 2;
  const hasDone = Boolean(onToggleDone);
  if (!hasFloors && !hasDone && !days) return null;
  const off = (hasFloors ? floorKeys.length - shownFloors.length : 0) + (hasDone && !showDone ? 1 : 0);

  return (
    <div ref={box} className="relative shrink-0">
      <button type="button" className={`btn gap-2 px-3 ${open ? 'btn-on' : 'bg-chrome hover:bg-surface-3'}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => {
        const r = box.current?.getBoundingClientRect();
        // the page's own width (without a scrollbar), so the menu's right edge stays 8px inside the screen
        if (r) setAt({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, document.documentElement.clientWidth - Math.min(288, document.documentElement.clientWidth - 16) - 8)) });
        setOpen((v) => !v);
      }}>
        <SlidersHorizontal size={18} aria-hidden="true" />
        <span className={compact ? 'sr-only' : undefined}>View</span>
        {off > 0 && <span className="grid min-w-5 place-items-center rounded bg-bar px-1 font-mono text-sm font-semibold leading-5 text-on-ink"><span className="sr-only">{off} hidden: </span>{off}</span>}
      </button>
      {open && (
        <div ref={panel} role="dialog" aria-label="View options" style={{ top: at.top, left: at.left }} className="animate-pop fixed z-40 overflow-y-auto overscroll-contain w-[min(18rem,calc(100%-1rem))] space-y-4 rounded-lg border border-line bg-surface p-4 shadow-lg">
          {days && (
            <div>
              <p className="t-group mb-2">Days shown</p>
              {days}
            </div>
          )}
          {hasFloors && (
            <div>
              <p className="t-group mb-2">Floors</p>
              <FloorToggle floorKeys={floorKeys} shownFloors={shownFloors} onToggle={onToggleFloor} />
            </div>
          )}
          {hasDone && (
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-base font-medium">
              Checked-out stays
              <Switch size="sm" icons OnIcon={Eye} OffIcon={EyeSlash} checked={showDone} onChange={() => onToggleDone()} />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
