import { Check, Palette } from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import { COLORS, isCustomColor } from '../../lib/colors';

// A colour choice: Auto (null: whatever the app picks, for example the status colour), 20 pastels, or any colour from the
// native picker. The selected swatch shows a tick, so the choice never depends on colour alone.
// id must be unique on the page; label, autoLabel and hint reword it for guests, floors and statuses.
export default function ColorPicker({ color, onChange, id = 'color-label', label = 'Colour', autoLabel = 'Auto', hint = 'Auto uses the status colour (yellow on hold, green confirmed). The last swatch picks any colour.' }) {
  const custom = isCustomColor(color);
  return (
    <div>
      <FieldLabel as="span" icon={Palette} id={id}>{label}</FieldLabel>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={color === null} onClick={() => onChange(null)} className={`btn px-3 ${color === null ? 'border-ink' : ''}`}>
          {autoLabel}
        </button>
        {COLORS.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-label={c.name}
            title={c.name}
            aria-pressed={color === c.key}
            onClick={() => onChange(c.key)}
            className={`cell flex size-10 items-center justify-center rounded-lg border-2 transition-transform active:scale-95 lg:size-7 ${color === c.key ? 'border-ink' : ''}`}
            style={{ backgroundColor: c.bg, borderColor: color === c.key ? undefined : c.border }}
          >
            {color === c.key && <Check size={16} weight="bold" />}
          </button>
        ))}
        {/* Any colour you like: the native colour picker sits invisibly over this swatch. */}
        <label
          title="Pick any colour"
          className={`cell relative flex size-10 cursor-pointer items-center justify-center rounded-lg border-2 transition-transform active:scale-95 focus-within:outline-2 focus-within:outline-accent lg:size-7 ${custom ? 'border-ink' : 'border-line'}`}
          style={{
            background: custom
              ? `color-mix(in srgb, ${color} 28%, white)`
              : 'conic-gradient(from 0deg, #f87171, #fbbf24, #4ade80, #22d3ee, #818cf8, #e879f9, #f87171)',
          }}
        >
          {custom && <Check size={16} weight="bold" />}
          <span className="sr-only">Custom colour</span>
          <input
            type="color"
            aria-label="Custom colour"
            value={custom ? color : '#8b9bd6'}
            onChange={(e) => onChange(e.target.value.toLowerCase())}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
      </div>
      {hint && <p className="mt-1.5 text-sm text-muted">{hint}</p>}
    </div>
  );
}
