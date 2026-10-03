import { MagnifyingGlass } from '@phosphor-icons/react';

// A search field with a magnifier. `label` is read by screen readers; `placeholder` should end with an ellipsis.
export default function SearchBox({ value, onChange, label, placeholder }) {
  return (
    <div className="relative">
      <MagnifyingGlass size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        type="search"
        name="q"
        className="field pl-10"
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
