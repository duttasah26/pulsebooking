import { Buildings, Envelope, GitMerge, Phone } from '@phosphor-icons/react';
import { fmtDayMonthYear } from '../../lib/dates';

// The columns a view can show or hide. The guest's name is always there.
export const GUEST_COLUMNS = [
  ['phone', 'Phone'],
  ['email', 'Email'],
  ['organization', 'Organization'],
  ['stays', 'Stays'],
];

// One guest in the list: name, contact lines, and how many stays (with the last one) so same-name guests can be told apart.
// A guest that looks like another one (same name once spaces and capitals are ignored) is marked, with a Merge button that
// only opens the merge screen: nothing is merged until the person at the desk says so there.
// Up to two initials, the way a contact card shows a person with no photo.
const initials = (name = '') => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

export default function GuestRow({ g, onOpen, hidden = [], density = 'roomy', duplicate = false, onMerge }) {
  const show = (key) => !hidden.includes(key);
  const roomy = density !== 'compact';
  const noContact = !g.phone && !g.email && !g.organization;
  const anyLine = (show('phone') && g.phone) || (show('email') && g.email) || (show('organization') && g.organization) || noContact;
  return (
    <li className={`flex items-stretch [content-visibility:auto] ${roomy ? '[contain-intrinsic-size:auto_4rem]' : '[contain-intrinsic-size:auto_2.5rem]'}`}>
      <button
        type="button"
        onClick={() => onOpen(g.id)}
        className={`flex min-w-0 flex-1 items-center gap-4 px-4 text-left transition-colors duration-150 hover:bg-surface-2 md:px-5 ${roomy ? 'min-h-[4.5rem] py-3' : 'min-h-11 py-1'}`}
      >
        <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-md bg-surface-2 font-semibold text-muted ${roomy ? 'size-10 text-base' : 'size-7 text-sm'}`}>{initials(g.name)}</span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[1.0625rem] font-semibold">{g.name}</span>
            {duplicate && (
              <span className="shrink-0 rounded-md bg-ink px-2 text-sm font-semibold text-white">Same person?</span>
            )}
          </span>
          {anyLine && (
            <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-4 text-[0.9375rem] text-muted">
              {show('phone') && g.phone && <span className="flex items-center gap-1 whitespace-nowrap"><Phone size={14} aria-hidden="true" />{g.phone}</span>}
              {show('email') && g.email && <span className="flex min-w-0 items-center gap-1"><Envelope size={14} aria-hidden="true" className="shrink-0" /><span className="truncate">{g.email}</span></span>}
              {show('organization') && g.organization && <span className="flex min-w-0 items-center gap-1"><Buildings size={14} aria-hidden="true" className="shrink-0" /><span className="truncate">{g.organization}</span></span>}
              {noContact && <span>No phone or email</span>}
            </span>
          )}
        </span>
        {show('stays') && (
          <span className="shrink-0 text-right text-[0.9375rem]">
            <span className="block"><span className="font-mono font-semibold">{g.stays}</span> {Number(g.stays) === 1 ? 'stay' : 'stays'}</span>
            {g.last_check_in && <span className="block text-muted">last {fmtDayMonthYear(g.last_check_in)}</span>}
          </span>
        )}
      </button>
      {duplicate && onMerge && (
        <button type="button" className="btn btn-sm m-3 shrink-0 self-center" onClick={() => onMerge(g)} aria-label={`Merge ${g.name} with the guest that looks the same`}>
          <GitMerge size={16} aria-hidden="true" /> <span className="hidden sm:inline">Merge</span>
        </button>
      )}
    </li>
  );
}
