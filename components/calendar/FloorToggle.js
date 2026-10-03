import { Stairs } from '@phosphor-icons/react';
import { floorLabel, floorShort } from './floors';
import { useSettings } from '../SettingsProvider';
import { roomShade } from '../../lib/colors';

// 1st / 2nd / 3rd floor buttons: each one shows or hides the rooms on that floor, and wears that floor's room colour
// (filled when the floor is showing, a coloured dot when it is hidden), so they match the room numbers in the grid.
export default function FloorToggle({ floorKeys, shownFloors, onToggle }) {
  const { settings } = useSettings();
  if (floorKeys.length < 2) return null;
  return (
    <div role="group" aria-label="Floors" className="no-scrollbar flex max-w-full shrink-0 items-center gap-0.5 overflow-x-auto rounded-lg border border-line bg-surface p-0.5">
      <Stairs size={16} aria-hidden="true" className="mx-1.5 shrink-0 text-muted" />
      {floorKeys.map((f) => {
        const on = shownFloors.includes(f);
        const shade = roomShade({ number: `${f}01` }, settings);
        return (
          <button
            key={f}
            type="button"
            title={floorLabel(f)}
            aria-label={floorLabel(f)}
            aria-pressed={on}
            onClick={() => onToggle(f)}
            className={`btn min-h-8 shrink-0 gap-1.5 px-2.5 lg:min-h-7 ${on ? 'font-semibold' : 'border-transparent text-muted'}`}
            style={on ? { backgroundColor: shade.fill, borderColor: shade.edge } : undefined}
          >
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: shade.edge }} />
            {floorShort(f)}
          </button>
        );
      })}
    </div>
  );
}
