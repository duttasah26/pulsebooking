import { useState } from 'react';
import { CaretDown, Warning } from '@phosphor-icons/react';

// Guests that may be the same person (Z B and ZB), found across the whole guest list. It only points them out: a Merge button
// opens the merge screen, where the person at the desk decides. Hidden when there is nothing to review.
//   groups: [{ key, guests: [{ id, name, phone, email, organization, stays }] }]
export default function DuplicatesPanel({ groups, onMerge }) {
  const [open, setOpen] = useState(false);
  if (!groups.length) return null;
  return (
    <section aria-label="Guests that may be the same person" className="animate-fade rounded-lg border border-line bg-surface">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left"
      >
        <Warning size={24} weight="fill" aria-hidden="true" className="shrink-0 text-ink" />
        <span className="min-w-0 flex-1 text-base font-semibold leading-snug">
          {groups.length === 1 ? '1 guest may be listed twice' : `${groups.length} guests may be listed twice`}
          <span className="t-footnote block font-normal">Same name once spaces and capitals are ignored, such as Z B and ZB. Nothing is merged unless you choose to.</span>
        </span>
        <CaretDown size={20} aria-hidden="true" className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
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
