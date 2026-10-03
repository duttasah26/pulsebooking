import { Bed } from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import { useSettings } from '../SettingsProvider';
import { floorColor } from '../../lib/colors';

// Rooms grouped by floor (the first digit of the number): one row of chips per floor.
function byFloor(rooms) {
  const floors = new Map();
  for (const r of rooms) {
    const floor = String(r.number)[0];
    floors.set(floor, [...(floors.get(floor) ?? []), r]);
  }
  return [...floors.entries()];
}

// Create mode: tick one or several rooms to book them together. A room already booked on the chosen dates is hatched.
export default function RoomPicker({ rooms, roomIds, roomTaken, onToggle }) {
  const { settings } = useSettings();
  return (
    <fieldset>
      <FieldLabel as="legend" icon={Bed}>
        Rooms {roomIds.length > 1 && <span className="font-normal text-muted">({roomIds.length} selected)</span>}
      </FieldLabel>
      <div className="space-y-1.5">
        {byFloor(rooms).map(([floor, list]) => (
          <div key={floor} className="flex flex-wrap gap-1.5">
            {list.map((r) => {
              const on = roomIds.includes(r.id);
              const taken = roomTaken(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={on}
                  disabled={taken && !on}
                  title={taken ? 'Booked on these dates' : `Room ${r.number}`}
                  onClick={() => onToggle(r.id)}
                  className={`btn gap-1.5 px-2.5 font-mono lg:min-h-6 lg:px-2 lg:text-xs ${on ? 'border-accent bg-accent text-accent-ink hover:bg-accent' : ''} ${taken && !on ? 'hatch' : ''}`}
                >
                  <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full border border-black/20" style={{ backgroundColor: floorColor(r, settings).border }} />
                  {r.number}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </fieldset>
  );
}
