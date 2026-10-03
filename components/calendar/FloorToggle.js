import { Stairs } from '@phosphor-icons/react';
import { floorLabel, floorShort } from './floors';

// 1st / 2nd / 3rd floor buttons: each one shows or hides the rooms on that floor.
export default function FloorToggle({ floorKeys, shownFloors, onToggle }) {
  if (floorKeys.length < 2) return null;
  return (
    <div role="group" aria-label="Floors" className="no-scrollbar flex max-w-full shrink-0 items-center gap-0.5 overflow-x-auto rounded-lg border border-line bg-surface p-0.5">
      <Stairs size={16} aria-hidden="true" className="mx-1.5 shrink-0 text-muted" />
      {floorKeys.map((f) => (
        <button
          key={f}
          type="button"
          title={floorLabel(f)}
          aria-label={floorLabel(f)}
          aria-pressed={shownFloors.includes(f)}
          onClick={() => onToggle(f)}
          className={`btn min-h-8 shrink-0 border-transparent px-2.5 lg:min-h-7 ${shownFloors.includes(f) ? 'bg-accent-soft' : 'text-muted'}`}
        >
          {floorShort(f)}
        </button>
      ))}
    </div>
  );
}
