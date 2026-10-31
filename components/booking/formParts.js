import { Minus, Plus } from '@phosphor-icons/react';
import TimeSelect from '../TimeSelect';

// The look shared by the new-booking form, the edit form and the booking details: plain sentence-case titles in dark ink,
// one card per group of related fields (never a box around every field), and big controls that are easy to read and hit.
// Card titles and the check-in / check-out ends carry a small icon, so the stacked cards of a form can be told apart at a glance.
// Field labels and buttons stay words alone.
export const TITLE = 'flex items-center gap-2 text-[1.0625rem] font-semibold leading-6 text-ink';

// A group of related fields under one title, as a card.
export function Card({ icon: Icon, title, children }) {
  return (
    <section className="card space-y-4">
      <h3 className={TITLE}>
        {Icon && <Icon size={20} aria-hidden="true" className="shrink-0 text-muted" />}
        {title}
      </h3>
      {children}
    </section>
  );
}

// One end of the stay (check-in or check-out): the title, the date (optional) and the time, as in the details.
export function Moment({ icon: Icon, tone, label, id, date, onDate, min, time, onTime }) {
  return (
    <div className="space-y-2 bg-surface p-4">
      <label htmlFor={`${id}-${date === undefined ? 'time' : 'date'}`} className={TITLE}>
        {Icon && <Icon size={20} aria-hidden="true" className={`shrink-0 ${tone ?? 'text-muted'}`} />}
        {label}
      </label>
      {date !== undefined && (
        <input id={`${id}-date`} name={`${id}-date`} type="date" className="field min-w-0 px-2 font-semibold [&::-webkit-calendar-picker-indicator]:ml-0 [&::-webkit-calendar-picker-indicator]:p-0" value={date} min={min} onChange={(e) => e.target.value && onDate(e.target.value)} />
      )}
      <TimeSelect id={`${id}-time`} name={`${id}-time`} label="Time" value={time} onChange={onTime} hideLabel />
    </div>
  );
}

// Two Moments side by side in one bordered block.
export function MomentPair({ children }) {
  return <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">{children}</div>;
}

// A number with big minus and plus buttons (adults, children): no typing needed. The number ticks when it changes.
export function Stepper({ label, value, onChange, min = 0 }) {
  const n = Number(value) || 0;
  return (
    <div className="space-y-2">
      <p className={TITLE}>{label}</p>
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="btn btn-lg btn-icon" onClick={() => onChange(Math.max(min, n - 1))} disabled={n <= min} aria-label={`One fewer ${label.toLowerCase()}`}>
          <Minus size={20} aria-hidden="true" />
        </button>
        <output key={n} className="min-w-10 text-center font-mono text-[1.75rem] font-semibold" aria-label={`${n} ${label.toLowerCase()}`}>{n}</output>
        <button type="button" className="btn btn-lg btn-icon" onClick={() => onChange(n + 1)} aria-label={`One more ${label.toLowerCase()}`}>
          <Plus size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// A few words to pick one from (booked via, rate plan): every choice is visible at once, so nothing hides in a dropdown.
// The chosen one turns soft green with a green edge. options: [value, label] pairs.
export function Choice({ label, options, value, onChange, id }) {
  return (
    <fieldset>
      <legend id={id} className="label">{label}</legend>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {options.map(([v, text]) => {
          const on = value === v;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(v)}
              className={`btn whitespace-normal px-4 py-2 text-left ${on ? 'chip-on' : ''}`}
            >
              {text}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
