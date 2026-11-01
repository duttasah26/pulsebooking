import { useSettings } from './SettingsProvider';
import { roomShade } from '../lib/colors';

// A room number as it appears in the booking forms: a chip in its floor's colour.
// shadeOf: take the colour of another room's floor (a chip that shows how many rooms are on that floor); label: the screen reader word.
export default function RoomNumber({ number, size = 'sm', shadeOf = number, label = 'Room ' }) {
  const { settings } = useSettings();
  const shade = roomShade({ number: shadeOf }, settings);
  return (
    <span
      className={`rounded-md font-mono font-semibold leading-snug text-ink ${size === 'lg' ? 'px-2.5 py-0.5 text-lg' : 'px-2 text-[0.9375rem]'}`}
      style={{ backgroundColor: shade.fill, boxShadow: `inset 0 0 0 1px ${shade.edge}` }}
    >
      {label && <span className="sr-only">{label}</span>}
      {number}
    </span>
  );
}
