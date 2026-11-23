import { useState } from 'react';
import { CaretDown, Warning, X } from '@phosphor-icons/react';
import { useStoredState } from '../../lib/useStoredState';

// Guests that may be the same person (Z B and ZB), found across the whole guest list. It only points them out: a Merge button
// opens the merge screen, where the person at the desk decides. Hidden when there is nothing to review, and after its X on this
// device until the set of possible duplicates changes (a new pair shows it again).
//   groups: [{ key, guests: [{ id, name, phone, email, organization, stays }] }]
export default function DuplicatesPanel({ groups, onMerge }) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useStoredState('pulse.dupesHidden', '');
  const seen = groups.map((g) => g.key).sort().join('|');
  if (!groups.length || hidden === seen) return null;
  return (
    <section aria-label="Guests that may be the same person" className="animate-fade rounded-lg border border-line bg-surface">
      <div className="flex items-center pr-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 pl-4 pr-2 text-left"
        >
          <Warning size={22} weight="fill" aria-hidden="true" className="shrink-0 text-ink" />
          <span className="min-w-0 flex-1 text-base font-semibold">{groups.length === 1 ? '1 possible duplicate' : `${groups.length} possible duplicates`}</span>
          <CaretDown size={20} aria-hidden="true" className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
        <button type="button" className="btn btn-quiet btn-icon shrink-0" aria-label="Hide possible duplicates" title="Hide" onClick={() => setHidden(seen)}>
          <X size={18} weight="bold" aria-hidden="true" />
        </button>
      </div>
      {open && (
        <ul className="divide-y divide-line border-t border-line">
          {groups.map((group) => (
            <li key={group.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3">
              <span className="min-w-0 flex-1 basis-60 text-base">
                {group.guests.map((g, i) => (
                  <span key={g.id}>
                    {i > 0 && <span className="text-muted"> and </span>}
                    <strong className="font-semibold">{g.name}</strong>
                    <span className="text-sm text-muted"> ({g.stays} {Number(g.stays) === 1 ? 'stay' : 'stays'}{g.phone ? `, ${g.phone}` : ''})</span>
                  </span>
                ))}
              </span>
              <button type="button" className="btn btn-sm shrink-0" onClick={() => onMerge(group.guests[0].id, group.guests[1].id)}>
                Review and Merge
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
