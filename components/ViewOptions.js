import { Columns, Rows } from '@phosphor-icons/react';
import { ChipGroup, Segmented } from './FilterParts';

// How the list looks, not what it shows: which columns appear, and how tall the rows are. Part of a saved view.
//   columns: [[key, label]]   hidden: array of the keys switched off   density: 'roomy' | 'compact'
export default function ViewOptions({ columns, hidden, onToggleColumn, density, onDensity }) {
  const shown = columns.map(([k]) => k).filter((k) => !hidden.includes(k));
  return (
    <div className="space-y-4">
      <ChipGroup legend="Columns to show" icon={Columns} options={columns} value={shown} onToggle={onToggleColumn} />
      <Segmented
        legend="Row size"
        icon={Rows}
        options={[['roomy', 'Roomy'], ['compact', 'Compact']]}
        value={density}
        onChange={onDensity}
      />
    </div>
  );
}
