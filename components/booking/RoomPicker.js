import { useSettings } from '../SettingsProvider';
import { roomShade } from '../../lib/colors';
import { useStoredState } from '../../lib/useStoredState';
import { ZoomControl } from '../calendar/ZoomBar';

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
// be tapped. The zoom control (the same as on the calendar) makes the room chips larger or smaller: larger means fewer to a row and
// bigger numbers, easier to hit; smaller shows more at once. It is remembered on this device.
export default function RoomPicker({ rooms, roomIds, roomTaken, onToggle }) {
  const { settings } = useSettings();
  const [zoom, setZoom] = useStoredState('pulse.roomZoom', 1, { parse: (raw) => { const z = Number(raw); return z >= 0.6 && z <= 1.6 ? z : undefined; } });
  const columns = Math.max(2, Math.round(6 / zoom));
  return (
    <div className="space-y-2" role="group" aria-label="Rooms">
      <div className="flex justify-end"><ZoomControl zoom={zoom} onChange={setZoom} /></div>
      {byFloor(rooms).map(([floor, list]) => (
        <div key={floor}>
          <p className="t-group mb-2">{FLOOR_NAME[floor] ?? `Floor ${floor}`}</p>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
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
                  className={`inline-flex min-w-0 items-center justify-center gap-0.5 rounded-lg border px-0 font-mono font-semibold transition-shadow duration-150 disabled:cursor-not-allowed ${busy ? 'hatch text-muted opacity-60' : ''} ${on ? 'ring-2 ring-ink ring-offset-2' : ''}`}
                  style={{ minHeight: `${2.75 * zoom}rem`, fontSize: `${zoom}rem`, ...(busy ? {} : { backgroundColor: shade.fill, borderColor: shade.edge }) }}
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
