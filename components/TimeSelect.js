import { Clock } from '@phosphor-icons/react';
import FieldLabel from './FieldLabel';

const pad = (n) => String(n).padStart(2, '0');

// Every half hour, as "HH:MM" values.
const SLOTS = Array.from({ length: 48 }, (_, i) => `${pad(Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`);

// "14:30" -> "2:30 PM"
export function formatTime(value) {
  const [h, m] = value.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)}\u00a0${h >= 12 ? 'PM' : 'AM'}`;
}

/*
  A time chosen from a list. It is a native <select>, so phones show their own scroll wheel and desktops show a
  keyboard-friendly list, with a proper label. A time that is not on the half-hour grid (set earlier) stays selectable.
*/
export default function TimeSelect({ id, name, label, icon, value, onChange, hideLabel = false }) {
  const options = value && !SLOTS.includes(value) ? [value, ...SLOTS] : SLOTS;
  return (
    <div>
      {hideLabel ? <label htmlFor={id} className="sr-only">{label}</label> : <FieldLabel icon={icon} htmlFor={id}>{label}</FieldLabel>}
      {/* A time is a form field, not a toolbar button: white with a clock at its start and tabular numerals, so it reads as a time to fill in. */}
      <div className="relative">
        <Clock size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <select id={id} name={name ?? id} className="field pl-10 font-medium tabular-nums" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Not set</option>
          {options.map((t) => (
            <option key={t} value={t}>{formatTime(t)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
