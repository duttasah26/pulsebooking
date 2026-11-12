import { useId, useState } from 'react';
import { Buildings, MagnifyingGlass, Plus } from '@phosphor-icons/react';

// The Company or group field, working like the Contacts search: type and the companies already known appear in a list under the field
// (name, guests and bookings); tap one, or use the arrow keys and Enter, to take it. A name that is not in the list gets an "Add as a new
// company" row at the end of the list (there is no separate company record: the company exists once it is typed on a guest or a booking).
// `companies` is [{ name, guests, stays }] from /api/companies. The list closes when a company is taken or the field loses focus.
const norm = (text) => String(text ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

export default function CompanyPicker({ id = 'b-org', value, onChange, companies = [], placeholder = 'Search or type a company…' }) {
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const typed = norm(value);
  const matches = companies.filter((c) => (typed ? norm(c.name).includes(typed) : true) && norm(c.name) !== typed).slice(0, 8);
  const exact = companies.some((c) => norm(c.name) === typed);
  const canAdd = typed !== '' && !exact;
  const rows = matches.length + (canAdd ? 1 : 0);
  const open = focused && rows > 0;

  const take = (name) => {
    onChange(name);
    setActive(-1);
    setFocused(false);
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % rows);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a <= 0 ? rows - 1 : a - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      take(active < matches.length ? matches[active].name : String(value).trim().replace(/\s+/g, ' '));
    } else if (e.key === 'Escape') {
      setFocused(false);
    }
  };

  return (
    <div
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}
    >
      <div className="relative">
        <MagnifyingGlass size={20} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          id={id}
          name="organization"
          type="text"
          role="combobox"
          aria-label="Company or group"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          spellCheck={false}
          autoComplete="off"
          className="field pl-11"
          placeholder={placeholder}
          value={value}
          onFocus={() => setFocused(true)}
          onChange={(e) => { onChange(e.target.value); setActive(-1); setFocused(true); }}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && (
        <ul id={listId} role="listbox" aria-label="Companies" className="popover-in mt-2 max-h-60 divide-y divide-line overflow-y-auto overscroll-contain rounded-lg border border-line bg-surface">
          {matches.map((c, i) => (
            <li key={c.name} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => take(c.name)}
                className={`flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2 ${i === active ? 'bg-surface-2' : ''}`}
              >
                <Buildings size={20} aria-hidden="true" className="shrink-0 text-muted" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{c.name}</span>
                  <span className="block text-[0.9375rem] text-muted">{c.guests} {c.guests === 1 ? 'guest' : 'guests'}, {c.stays} {c.stays === 1 ? 'booking' : 'bookings'}</span>
                </span>
              </button>
            </li>
          ))}
          {canAdd && (
            <li id={`${listId}-${matches.length}`} role="option" aria-selected={active === matches.length}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => take(String(value).trim().replace(/\s+/g, ' '))}
                className={`flex min-h-14 w-full items-center gap-3 bg-accent-soft px-4 py-2.5 text-left font-semibold text-accent-strong hover:bg-accent-soft/60 ${active === matches.length ? 'bg-accent-soft/60' : ''}`}
              >
                <Plus className="ico-turn" size={18} weight="bold" aria-hidden="true" />
                <span className="min-w-0 truncate">Add &ldquo;{String(value).trim()}&rdquo; as a new company</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
