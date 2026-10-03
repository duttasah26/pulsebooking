import { Bed } from '@phosphor-icons/react';
import { useSettings } from './SettingsProvider';
import { roomShade } from '../lib/colors';

// "Rooms" in large type: each room number is a chip in its floor's colour (a solid shade, distinct from the pastel
// Confirmed and On hold colours). Used by the booking details and the selection panel. `note` is a small line under it.
export default function RoomChips({ numbers, note }) {
  const { settings } = useSettings();
  const list = [...new Set(numbers)].sort();
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
        <Bed size={14} aria-hidden="true" /> {list.length === 1 ? 'Room' : 'Rooms'}
      </p>
      <p className="mt-1.5 flex flex-wrap gap-1.5">
        {list.map((n) => {
          const shade = roomShade({ number: n }, settings);
          return (
            <span
              key={n}
              className="rounded-md px-2.5 py-0.5 font-mono text-lg font-semibold leading-snug text-ink"
              style={{ backgroundColor: shade.fill, boxShadow: `inset 0 0 0 1px ${shade.edge}` }}
            >
              {n}
            </span>
          );
        })}
      </p>
      {note}
    </div>
  );
}
