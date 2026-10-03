import { Minus, Plus } from '@phosphor-icons/react';
import TimeSelect from '../TimeSelect';

// The look shared by the new-booking form, the edit form and the booking details: bordered cards, each with a small
// uppercase title and an icon, and big controls that are easy to read and hit.
export const TITLE = 'flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted';

export function Card({ icon: Icon, title, children }) {
  return (
    <section className="space-y-2.5 rounded-lg border border-line bg-surface p-3">
      <h3 className={TITLE}>
        <Icon size={14} aria-hidden="true" /> {title}
      </h3>
      {children}
    </section>
  );
}

// One end of the stay (check-in or check-out): the title, the date (optional) and the time, as in the details.
export function Moment({ icon: Icon, label, id, date, onDate, min, time, onTime }) {
  return (
    <div className="space-y-2 bg-surface p-3">
      <label htmlFor={`${id}-${date === undefined ? 'time' : 'date'}`} className={TITLE}>
        <Icon size={14} aria-hidden="true" /> {label}
      </label>
      {date !== undefined && (
        <input id={`${id}-date`} name={`${id}-date`} type="date" className="field min-w-0 px-2 text-sm font-semibold [&::-webkit-calendar-picker-indicator]:ml-0 [&::-webkit-calendar-picker-indicator]:p-0" value={date} min={min} onChange={(e) => e.target.value && onDate(e.target.value)} />
      )}
      <TimeSelect id={`${id}-time`} name={`${id}-time`} label="Time" value={time} onChange={onTime} />
    </div>
  );
}

// Two Moments side by side in one bordered block.
export function MomentPair({ children }) {
  return <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">{children}</div>;
}

// A number with big minus and plus buttons (adults, children): no typing needed.
export function Stepper({ icon: Icon, label, value, onChange, min = 0 }) {
  const n = Number(value) || 0;
  return (
    <div className="space-y-1.5">
      <p className={TITLE}>
        <Icon size={14} aria-hidden="true" /> {label}
      </p>
      <div className="flex items-center justify-between gap-1 rounded-lg border border-line px-1 py-1">
        <button type="button" className="btn btn-icon min-h-11 min-w-11 border-transparent lg:min-h-11 lg:min-w-11" onClick={() => onChange(Math.max(min, n - 1))} disabled={n <= min} aria-label={`One fewer ${label.toLowerCase()}`}>
          <Minus size={20} weight="bold" aria-hidden="true" />
        </button>
        <output className="min-w-8 text-center font-mono text-2xl font-semibold" aria-label={`${n} ${label.toLowerCase()}`}>{n}</output>
        <button type="button" className="btn btn-icon min-h-11 min-w-11 border-transparent lg:min-h-11 lg:min-w-11" onClick={() => onChange(n + 1)} aria-label={`One more ${label.toLowerCase()}`}>
          <Plus size={20} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
