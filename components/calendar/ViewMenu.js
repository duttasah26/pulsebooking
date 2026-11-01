import { useEffect, useRef, useState } from 'react';
import { Eye, EyeSlash, SlidersHorizontal } from '@phosphor-icons/react';
import FloorToggle from './FloorToggle';
import Switch from '../Switch';

// "View": what the calendar shows, in one menu instead of two more groups in the controls row. The floors to show and whether stays that have
// already checked out are drawn. A small number on the button says how many of those are switched off, so a hidden floor is never a surprise.
export default function ViewMenu({ floorKeys, shownFloors, onToggleFloor, showDone, onToggleDone }) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState({ top: 0, left: 0 }); // where the menu opens, from the button's place on screen (the controls row can scroll sideways, which would clip a menu inside it)
  const box = useRef(null);
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
  if (!hasFloors && !hasDone) return null;
  const off = (hasFloors ? floorKeys.length - shownFloors.length : 0) + (hasDone && !showDone ? 1 : 0);

  return (
    <div ref={box} className="relative shrink-0">
      <button type="button" className={`btn gap-2 px-3 ${open ? 'btn-on' : ''}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => {
        const r = box.current?.getBoundingClientRect();
        if (r) setAt({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - 296)) });
        setOpen((v) => !v);
      }}>
        <SlidersHorizontal size={18} aria-hidden="true" />
        View
        {off > 0 && <span className="grid min-w-5 place-items-center rounded bg-bar px-1 font-mono text-sm font-semibold leading-5 text-on-ink"><span className="sr-only">{off} hidden: </span>{off}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="View options" style={{ top: at.top, left: at.left }} className="animate-pop fixed z-40 w-72 max-w-[calc(100vw-1rem)] space-y-4 rounded-lg border border-line bg-surface p-4 shadow-lg">
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
