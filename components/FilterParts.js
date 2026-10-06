// Building blocks for the filter and sort panels: choices drawn as large chips, so every option is visible at once and
// nothing hides inside a drop-down. Each chip is at least 44px tall on touch screens.
import { CaretDown, Check } from '@phosphor-icons/react';
import FieldLabel from './FieldLabel';
import { useStoredState } from '../lib/useStoredState';

// An option may carry a tone { fill, edge } (a room's floor colour, a status colour, check-in green, check-out red). Off, the
// chip is white with a dot and an edge in that colour; on, it is filled with the colour, has a dark edge and a tick. So the
// colour tells what the choice is, and filled tells it is on.
export const chip = (on, tone) =>
  `btn min-h-11 gap-1.5 px-3 lg:min-h-9 ${tone ? (on ? 'font-semibold' : '') : on ? 'border-accent bg-accent-soft font-semibold text-accent-text' : ''}`;
export const toneStyle = (on, tone) => (tone ? (on ? { backgroundColor: tone.fill, borderColor: 'var(--ink)', borderWidth: 2 } : { borderColor: tone.edge }) : undefined);
export function Mark({ on, tone }) {
  if (!tone) return null;
  return on ? <Check size={14} weight="bold" aria-hidden="true" className="shrink-0" /> : <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ backgroundColor: tone.edge }} />;
}

// Pick any number of options. options: [[value, label]], value: array of the chosen values.
export function ChipGroup({ legend, icon, options, value, onToggle, empty, legendHidden = false }) {
  return (
    <fieldset>
      <FieldLabel icon={icon} as="legend" hidden={legendHidden}>{legend}</FieldLabel>
      {options.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map(([v, label, tone]) => (
            <button key={v} type="button" aria-pressed={value.includes(v)} onClick={() => onToggle(v)} className={chip(value.includes(v), tone)} style={toneStyle(value.includes(v), tone)}>
              <Mark on={value.includes(v)} tone={tone} />
              {label}
            </button>
          ))}
        </div>
      )}
    </fieldset>
  );
}

// Pick exactly one option, drawn as a joined row. options: [[value, label]].
export function Segmented({ legend, icon, options, value, onChange, legendHidden = false }) {
  return (
    <fieldset>
      <FieldLabel icon={icon} as="legend" hidden={legendHidden}>{legend}</FieldLabel>
      {/* As many per row as fit (at least 7rem each), the rest on the next row, and a long label wraps inside its button: nothing runs into its neighbour. */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(7rem, 1fr))' }}>
        {options.map(([v, label, tone]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className={`${chip(value === v, tone)} h-auto justify-center !whitespace-normal px-2 py-1.5 text-center text-sm leading-tight`} style={toneStyle(value === v, tone)}>
            <Mark on={value === v} tone={tone} />
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

// A from and a to number (stay length, number of stays).
export function NumberRange({ legend, icon, from, to, onFrom, onTo, unit }) {
  return (
    <fieldset>
      <FieldLabel icon={icon} as="legend">{legend}</FieldLabel>
      <div className="grid grid-cols-2 gap-2">
        <input type="number" inputMode="numeric" min="0" name={`${legend}-min`} aria-label={`${legend}, at least`} placeholder="At least" className="field min-w-0 px-2" value={from} onChange={(e) => onFrom(e.target.value.replace(/\D/g, ''))} />
        <input type="number" inputMode="numeric" min="0" name={`${legend}-max`} aria-label={`${legend}, at most`} placeholder="At most" className="field min-w-0 px-2" value={to} onChange={(e) => onTo(e.target.value.replace(/\D/g, ''))} />
      </div>
      {unit && <p className="mt-1 text-sm text-muted">{unit}</p>}
    </fieldset>
  );
}

// A section of the panel that folds away, so the panel shows only what you open. The title says what is inside and a
// green number says how many choices are on in it. Whether it is open is remembered on this device.
export function FoldSection({ id, title, icon: Icon, badge = 0, defaultOpen = false, children }) {
  const [open, setOpen] = useStoredState(`pulse.fold.${id}`, defaultOpen, { parse: (raw) => raw === '1', serialize: (v) => (v ? '1' : '0') });
  return (
    <section className="rounded-lg border border-line bg-surface">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`fold-${id}`}
          onClick={() => setOpen(!open)}
          className="flex min-h-12 w-full items-center gap-2 px-3 text-left text-base font-semibold transition-colors duration-150 hover:bg-surface-2 lg:min-h-11"
        >
          {Icon && <Icon size={18} aria-hidden="true" className="shrink-0 text-muted" />}
          <span className="min-w-0 flex-1 truncate">{title}</span>
          {badge > 0 && <span className="grid min-w-6 place-items-center rounded bg-accent px-1.5 font-mono text-sm font-semibold text-accent-ink"><span className="sr-only">{badge} on: </span>{badge}</span>}
          <CaretDown size={18} aria-hidden="true" className={`shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      </h3>
      {open && <div id={`fold-${id}`} className="animate-fade space-y-4 border-t border-line p-3">{children}</div>}
    </section>
  );
}
