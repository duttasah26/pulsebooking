import { Check, Eyedropper, Palette } from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import { BOOKING_SWATCHES, COLORS, isCustomColor } from '../../lib/colors';

/*
  A colour choice kept deliberately small: a "none" button (null: the app picks, for example by status), four quick
  swatches, and a custom colour from the native picker. The chosen swatch shows a tick, so the choice never depends on
  colour alone. A colour saved earlier that is not one of the four is still shown, selected, so nothing is lost.
  id must be unique on the page; label and autoLabel reword it for guests, floors and statuses.
*/
export default function ColorPicker({
  color, onChange, id = 'color-label', label = 'Colour', autoLabel = 'Auto', swatches = BOOKING_SWATCHES, hint,
}) {
  const custom = isCustomColor(color);
  const keys = color && !custom && !swatches.includes(color) ? [...swatches, color] : swatches;
  const list = keys.map((k) => COLORS.find((c) => c.key === k)).filter(Boolean);

  return (
    <div>
      <FieldLabel as="span" icon={Palette} id={id}>{label}</FieldLabel>
      <div role="group" aria-labelledby={id} className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={color === null}
          onClick={() => onChange(null)}
          className={`btn min-h-9 px-3 lg:min-h-8 ${color === null ? 'border-ink bg-surface-2' : ''}`}
        >
          {autoLabel}
        </button>
        {list.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-label={c.name}
            title={c.name}
            aria-pressed={color === c.key}
            onClick={() => onChange(c.key)}
            className={`cell grid size-9 place-items-center rounded-lg border-2 transition-transform active:scale-95 lg:size-8 ${color === c.key ? 'border-ink' : ''}`}
            style={{ backgroundColor: c.bg, borderColor: color === c.key ? undefined : c.border }}
          >
            {color === c.key && <Check size={16} weight="bold" />}
          </button>
        ))}
        {/* Any colour: the native colour picker sits invisibly over this swatch. */}
        <label
          title="Pick any colour"
          className={`cell relative flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-2 px-2.5 text-sm font-medium transition-transform active:scale-95 focus-within:outline-2 focus-within:outline-accent lg:h-8 ${custom ? 'border-ink' : 'border-line bg-surface'}`}
          style={custom ? { backgroundColor: `color-mix(in srgb, ${color} 28%, white)` } : undefined}
        >
          {custom ? <Check size={16} weight="bold" /> : <Eyedropper size={16} />}
          Custom
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
