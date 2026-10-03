const pad = (n) => String(n).padStart(2, '0');

// Every half hour, as "HH:MM" values.
const SLOTS = Array.from({ length: 48 }, (_, i) => `${pad(Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`);

// "14:30" -> "2:30 PM"
export function formatTime(value) {
  const [h, m] = value.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
}

/*
  A time chosen from a list. It is a native <select>, so phones show their own scroll wheel and desktops show a
  keyboard-friendly list, with a proper label. A time that is not on the half-hour grid (set earlier) stays selectable.
*/
export default function TimeSelect({ id, label, value, onChange }) {
  const options = value && !SLOTS.includes(value) ? [value, ...SLOTS] : SLOTS;
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Not set</option>
        {options.map((t) => (
          <option key={t} value={t}>{formatTime(t)}</option>
        ))}
      </select>
    </div>
  );
}
