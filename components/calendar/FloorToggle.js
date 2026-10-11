import { Stairs } from '@phosphor-icons/react';
import { floorLabel, floorShort } from './floors';
import { useSettings } from '../SettingsProvider';
import { roomShade } from '../../lib/colors';

// 1st / 2nd / 3rd floor buttons: each one shows or hides the rooms on that floor, and wears that floor's room colour
// (a filled square when the floor is showing, an empty one when it is hidden), so they match the room numbers in the grid.
export default function FloorToggle({ floorKeys, shownFloors, onToggle }) {
  const { settings } = useSettings();
  if (floorKeys.length < 2) return null;
  return (
    <div role="group" aria-label="Floors" className="seg no-scrollbar max-w-full overflow-x-auto">
      <Stairs size={18} aria-hidden="true" className="mx-2 shrink-0 text-muted" />
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
            className={`seg-item shrink-0 ${on ? '' : 'text-muted'}`}
          >
            <span aria-hidden="true" className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: on ? shade.edge : 'transparent', boxShadow: `inset 0 0 0 2px ${shade.edge}` }} />
            {floorShort(f)}
          </button>
        );
      })}
    </div>
  );
}
