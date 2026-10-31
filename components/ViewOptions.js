import { Columns, Rows, Stack } from '@phosphor-icons/react';
import { ChipGroup } from './FilterParts';
import FieldLabel from './FieldLabel';
import Switch from './Switch';

// How the list looks, not what it shows. Part of a saved view. Kept small: one switch, two drop-downs, and the columns as chips.
//   columns: [[key, label]]   hidden: array of the keys switched off   density: 'roomy' | 'compact'
//   group, onGroup: how the rows are gathered under headings    apart, onApart: '1' = a stay's rooms on separate rows
//   (group and apart are passed by the Bookings list only)
const GROUPS = [['', 'Arrival'], ['guest', 'Guest'], ['org', 'Company'], ['status', 'Status'], ['none', 'None']];

function Pick({ id, icon, label, value, onChange, options }) {
  return (
    <div>
      <FieldLabel icon={icon} htmlFor={id}>{label}</FieldLabel>
      <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

export default function ViewOptions({ columns, hidden, onToggleColumn, density, onDensity, group, onGroup, apart, onApart }) {
  const shown = columns.map(([k]) => k).filter((k) => !hidden.includes(k));
  return (
    <div className="space-y-4">
      {onGroup && <Pick id="group-by" icon={Stack} label="Group by" value={group} onChange={onGroup} options={GROUPS} />}
      {onApart && (
        <label className="flex cursor-pointer items-center gap-3">
          <span className="min-w-0 flex-1 text-[0.9375rem] font-semibold leading-5">Group multi-room stays</span>
          <Switch size="sm" icons={false} checked={apart !== '1'} onChange={(on) => onApart(on ? '' : '1')} />
        </label>
      )}
      <Pick id="row-size" icon={Rows} label="Row size" value={density} onChange={onDensity} options={[['roomy', 'Roomy'], ['compact', 'Compact']]} />
      <ChipGroup legend="Columns" icon={Columns} options={columns} value={shown} onToggle={onToggleColumn} />
    </div>
  );
}
