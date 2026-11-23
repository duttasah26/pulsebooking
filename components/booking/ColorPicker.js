import { Eyedropper, Palette } from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import { BOOKING_SWATCHES, COLORS, isCustomColor } from '../../lib/colors';

/*
  A colour choice kept deliberately small: a "none" button (null: the app picks, for example by status), four quick
  swatches, and a custom colour from the native picker. The chosen swatch shows a tick, so the choice never depends on
  colour alone. A colour saved earlier that is not one of the four is still shown, selected, so nothing is lost.
  id must be unique on the page; label and autoLabel reword it for guests, floors and statuses.
*/
export default function ColorPicker({
  color, onChange, id = 'color-label', label = 'Colour', autoLabel = 'Auto', swatches = BOOKING_SWATCHES, hint, hideLabel = false,
}) {
  const custom = isCustomColor(color);
  const keys = color && !custom && !swatches.includes(color) ? [...swatches, color] : swatches;
  const list = keys.map((k) => COLORS.find((c) => c.key === k)).filter(Boolean);

  return (
    <div>
      <FieldLabel as="span" icon={Palette} id={id} hidden={hideLabel}>{label}</FieldLabel>
      <div role="group" aria-labelledby={id} className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={color === null}
          onClick={() => onChange(null)}
          className={`btn px-3 sm:px-4 ${color === null ? 'font-semibold ring-2 ring-ink ring-offset-2' : ''}`}
        >
          {autoLabel}
        </button>
        {/* The swatches stay together; on a phone they are one row under Default and Custom that shrinks to fit (44px at most), so the rows never break unevenly. */}
        <div className="flex flex-wrap gap-2 max-sm:order-last max-sm:grid max-sm:w-full max-sm:gap-1.5" style={{ gridTemplateColumns: `repeat(${list.length}, minmax(0, 2.75rem))` }}>
        {list.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-label={c.name}
            title={c.name}
            aria-pressed={color === c.key}
            onClick={() => onChange(c.key)}
            className={`cell grid aspect-square w-full place-items-center rounded-lg border transition-shadow duration-150 sm:size-11 ${color === c.key ? 'ring-2 ring-ink ring-offset-2' : ''}`}
            style={{ backgroundColor: c.bg, borderColor: c.border }}
          >
          </button>
        ))}
        </div>
        {/* Any colour: the native colour picker sits invisibly over this swatch. */}
        <label
          title="Pick any colour"
          className={`cell relative flex h-11 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-base font-medium focus-within:outline-2 focus-within:outline-accent ${custom ? 'border-transparent ring-2 ring-ink ring-offset-2' : 'border-transparent bg-tint'}`}
          style={custom ? { backgroundColor: `color-mix(in srgb, ${color} calc(28% + (100% - var(--tone-light, 100%)) * -0.06), var(--surface))` } : undefined}
        >
          <Eyedropper size={16} aria-hidden="true" />
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
      {hint && <p className="t-footnote mt-2">{hint}</p>}
    </div>
  );
}
