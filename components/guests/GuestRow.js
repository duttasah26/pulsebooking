import { Buildings, Envelope, Phone, UserCircle } from '@phosphor-icons/react';
import { fmtDayMonthYear } from '../../lib/dates';

// One guest in the list: name, contact lines, and how many stays (with the last one) so same-name guests can be told apart.
export default function GuestRow({ g, onOpen }) {
  const noContact = !g.phone && !g.email && !g.organization;
  return (
    <li className="[contain-intrinsic-size:auto_3rem] [content-visibility:auto]">
      <button type="button" onClick={() => onOpen(g.id)} className="flex min-h-12 w-full items-center gap-3 px-3 py-1.5 text-left hover:bg-surface-2">
        <UserCircle size={32} aria-hidden="true" className="shrink-0 text-muted" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{g.name}</span>
          <span className="flex min-w-0 flex-wrap items-center gap-x-3 text-sm text-muted">
            {g.phone && <span className="flex items-center gap-1"><Phone size={14} aria-hidden="true" />{g.phone}</span>}
            {g.email && <span className="flex min-w-0 items-center gap-1"><Envelope size={14} aria-hidden="true" className="shrink-0" /><span className="truncate">{g.email}</span></span>}
            {g.organization && <span className="flex min-w-0 items-center gap-1"><Buildings size={14} aria-hidden="true" className="shrink-0" /><span className="truncate">{g.organization}</span></span>}
            {noContact && <span>No contact saved</span>}
          </span>
        </span>
        <span className="shrink-0 text-right text-sm">
          <span className="block font-mono font-semibold">{g.stays} {Number(g.stays) === 1 ? 'stay' : 'stays'}</span>
          {g.last_check_in && <span className="block text-muted">last {fmtDayMonthYear(g.last_check_in)}</span>}
        </span>
      </button>
    </li>
  );
}
