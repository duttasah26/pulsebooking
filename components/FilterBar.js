import { useEffect, useRef, useState } from 'react';
import { CaretLeft, Plus, X } from '@phosphor-icons/react';

/*
  A row of filters, one chip each, with a "+ Filter" button to add another.
    fields: [{ key, label, Icon, on, operator, value, clear, render }]
      on        the filter is applied (its params are set)
      operator  the small word between the name and the value ("is", "is any of", "contains", "between")
      value     what the filter is set to, as text
      clear()   takes the filter away
      render()  the editor shown in the pop-up: the choices for this filter
  The filters themselves live in the page's URL, so a filter chip is just a view of those params: nothing here keeps its own state
  except which pop-up is open.
*/

// A small pop-up under its button: closes on Escape and on a click outside.
function Pop({ button, children, open, onToggle, align = 'left' }) {
  const root = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => !root.current?.contains(e.target) && onToggle(false);
    const esc = (e) => e.key === 'Escape' && onToggle(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open, onToggle]);
  return (
    <div ref={root} className="relative flex">
      {button}
      {open && (
        <div
          role="dialog"
          className={`animate-pop absolute top-full z-40 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface p-3 shadow-lg ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

const SEG = 'inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap bg-tint px-2.5 text-[0.9375rem] lg:min-h-8';

function Chip({ field, open, setOpen }) {
  const { Icon } = field;
  return (
    <div className="flex items-stretch gap-px text-ink">
      <span className={`${SEG} rounded-l-md font-medium`}>
        {Icon && <Icon size={16} aria-hidden="true" className="shrink-0 text-muted" />}
        {field.label}
      </span>
      <span className={`${SEG} text-muted`}>{field.operator}</span>
      <Pop
        open={open}
        onToggle={setOpen}
        button={
          <button type="button" aria-expanded={open} aria-label={`${field.label} ${field.operator} ${field.value}. Change`} onClick={() => setOpen(!open)} className={`${SEG} font-semibold hover:bg-ink/10`}>
            <span className="max-w-[14rem] truncate">{field.value || 'Any'}</span>
          </button>
        }
      >
        {field.render({ close: () => setOpen(false) })}
      </Pop>
      <button type="button" aria-label={`Remove the ${field.label} filter`} onClick={field.clear} className={`${SEG} justify-center rounded-r-md px-2 text-muted hover:bg-ink/10 hover:text-ink`}>
        <X size={14} weight="bold" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function FilterBar({ fields, onClearAll, search }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(null); // the key of the filter being added
  const [editing, setEditing] = useState(null); // the key of the chip whose pop-up is open: it stays while its value is emptied to retype
  const on = fields.filter((f) => f.on || f.key === editing);
  const off = fields.filter((f) => !on.includes(f));
  const field = off.find((f) => f.key === adding) ?? fields.find((f) => f.key === adding);
  const toggle = (next) => {
    setOpen(next);
    if (!next) setAdding(null);
  };

  // The search box and the + Filter button share one row (search first); the applied filters take a row below only when there are some.
  return (
    <div className="space-y-3" role="group" aria-label="Search and filters">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">{search}</div>
        {(off.length > 0 || adding) && (
          <Pop
            open={open}
            onToggle={toggle}
            align="right"
            button={
              <button type="button" aria-expanded={open} className="btn min-h-12 shrink-0 gap-2 px-4 lg:min-h-11" onClick={() => toggle(!open)}>
                <Plus size={18} aria-hidden="true" /> Filter
              </button>
            }
          >
            {field ? (
              <div className="space-y-3">
                <button type="button" className="btn btn-quiet btn-sm -ml-2" onClick={() => setAdding(null)}>
                  <CaretLeft size={16} aria-hidden="true" /> {field.label}
                </button>
                {field.render({ close: () => toggle(false) })}
              </div>
            ) : (
              <ul className="grid gap-0.5">
                {off.map((f) => (
                  <li key={f.key}>
                    <button type="button" className="btn btn-quiet w-full justify-start gap-3 px-3" onClick={() => setAdding(f.key)}>
                      {f.Icon && <f.Icon size={18} aria-hidden="true" className="shrink-0 text-muted" />}
                      {f.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Pop>
        )}
      </div>
      {on.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {on.map((f) => <Chip key={f.key} field={f} open={editing === f.key} setOpen={(next) => setEditing(next ? f.key : null)} />)}
          {on.length > 1 && onClearAll && <button type="button" className="btn btn-quiet btn-sm" onClick={onClearAll}>Clear</button>}
        </div>
      )}
    </div>
  );
}
