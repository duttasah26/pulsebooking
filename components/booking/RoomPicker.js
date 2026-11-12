import { useSettings } from '../SettingsProvider';
import { roomShade } from '../../lib/colors';

// Rooms grouped by floor (the first digit of the number): one row of chips per floor.
function byFloor(rooms) {
  const floors = new Map();
  for (const r of rooms) {
    const floor = String(r.number)[0];
    floors.set(floor, [...(floors.get(floor) ?? []), r]);
  }
  return [...floors.entries()];
}

const FLOOR_NAME = { 1: '1st floor', 2: '2nd floor', 3: '3rd floor' };

// Create mode: tap one or several rooms to book them together. Each room is a chip in its floor's colour, the same as on
// the calendar; a chosen room has a dark ring and a tick; a room already booked on the chosen days is hatched and cannot
// be tapped. Pointing at a free room makes its chip grow a little (not with reduced motion).
export default function RoomPicker({ rooms, roomIds, roomTaken, onToggle }) {
  const { settings } = useSettings();
  return (
    <div className="space-y-2" role="group" aria-label="Rooms">
      {byFloor(rooms).map(([floor, list]) => (
        <div key={floor}>
          <p className="t-group mb-2">{FLOOR_NAME[floor] ?? `Floor ${floor}`}</p>
          <div className="grid grid-cols-6 gap-2">
            {list.map((r) => {
              const on = roomIds.includes(r.id);
              const taken = roomTaken(r.id);
              const busy = taken && !on;
              const shade = roomShade(r, settings);
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={on}
                  disabled={busy}
                  title={busy ? `Room ${r.number} is booked on these days` : `Room ${r.number}`}
                  onClick={() => onToggle(r.id)}
                  className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-0.5 rounded-lg border px-0 font-mono text-base font-semibold transition-[box-shadow,transform] duration-200 ease-out enabled:hover:scale-110 enabled:hover:z-10 motion-reduce:enabled:hover:scale-100 disabled:cursor-not-allowed ${busy ? 'hatch text-muted opacity-60' : ''} ${on ? 'ring-2 ring-ink ring-offset-2' : ''}`}
                  style={busy ? undefined : { backgroundColor: shade.fill, borderColor: shade.edge }}
                >
                  {r.number}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
