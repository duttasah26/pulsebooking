import { Check, Tag } from '@phosphor-icons/react';
import FieldLabel from '../FieldLabel';
import { STATUS_ICON } from '../StatusBadge';
import { useSettings } from '../SettingsProvider';
import { statusColor } from '../../lib/colors';
import { STATUS_OPTIONS } from '../../lib/status';

// The booking status as coloured buttons: each wears the colour that status has on the calendar (confirmed green,
// on hold yellow with a dashed edge, finished or cancelled grey). The chosen one shows a tick.
// hideLabel: the form already has a heading that says Status (it stays for screen readers).
export default function StatusPicker({ value, onChange, hideLabel = false }) {
  const { settings } = useSettings();
  return (
    <fieldset>
      {hideLabel ? <legend className="sr-only">Status</legend> : <FieldLabel as="legend" icon={Tag}>Status</FieldLabel>}
      <div className="grid grid-cols-2 gap-1.5">
        {STATUS_OPTIONS.map(([key, label]) => {
          const c = statusColor(key, settings);
          const on = value === key;
          const Icon = on ? Check : STATUS_ICON[key];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(key)}
              className={`btn min-h-11 justify-start gap-2 border-2 px-2.5 lg:min-h-8 ${key === 'on_hold' ? 'border-dashed' : ''} ${on ? 'font-semibold' : ''}`}
              style={{ backgroundColor: c.bg, borderColor: on ? 'var(--ink)' : c.border }}
            >
              <Icon size={15} weight="bold" aria-hidden="true" className="shrink-0" />
              {label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
