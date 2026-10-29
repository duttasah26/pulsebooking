import { Buildings, Check, Phone, X } from '@phosphor-icons/react';
import StatusBadge from '../StatusBadge';
import { useSettings } from '../SettingsProvider';
import { colorFor, roomShade } from '../../lib/colors';
import { fmtDateTime, fmtShort, nightsLabel } from '../../lib/dates';

// The columns a view can show or hide. The guest's name is always there.
export const BOOKING_COLUMNS = [
  ['contact', 'Contact'],
  ['organization', 'Organization'],
  ['room', 'Room'],
  ['dates', 'Dates'],
  ['status', 'Status'],
];

// One booking in the list: its colour as a small square before the name, guest and contact, room, dates and status (each can be switched off in a view).
// A deleted booking offers Restore; a hold offers Confirm and Cancel in one click. Checked-out and cancelled stays are faded.
export default function BookingRow({ b, onOpen, onRestore, onConfirm, onCancelHold, hidden = [], density = 'roomy' }) {
  const { settings } = useSettings();
  const isDeleted = Boolean(b.deleted_at);
  const finished = !isDeleted && (b.status === 'checked_out' || b.status === 'cancelled');
  const contact = b.guest_id ? b.phone || b.email : null;
  const show = (key) => !hidden.includes(key);
  const roomy = density !== 'compact';
  // Columns on a wide screen: the guest, then whichever of room, dates and status are on.
  // minmax(0, ...) lets the wide columns shrink and wrap their text instead of running into the next column; room and status
  // are sized to their content.
  const cols = ['minmax(0, 1.4fr)', show('room') && 'auto', show('dates') && 'minmax(0, 1.6fr)', show('status') && 'auto'].filter(Boolean).join(' ');
  const showLine2 = (show('organization') && b.organization) || show('contact');
  return (
    // content-visibility keeps long lists cheap: rows far off screen are not painted
    <li className={`flex items-stretch [content-visibility:auto] ${roomy ? '[contain-intrinsic-size:auto_4rem]' : '[contain-intrinsic-size:auto_2.5rem]'}`}>
      <button
        type="button"
        disabled={isDeleted}
        onClick={() => onOpen(b)}
        style={{ '--cols': cols }}
        className={`grid min-w-0 flex-1 grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 px-4 text-left transition-colors duration-150 enabled:hover:bg-surface-2 md:[grid-template-columns:var(--cols)] md:px-5 ${
          roomy ? 'min-h-[4.5rem] py-3' : 'min-h-11 py-1.5'
        } ${finished ? 'text-ink/75' : ''}`}
      >
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: colorFor(b, settings).bg, boxShadow: `inset 0 0 0 1.5px ${colorFor(b, settings).border}` }} />
            <span className={`truncate text-[1.0625rem] font-semibold ${isDeleted ? 'line-through' : ''}`}>{b.name}</span>
          </span>
          {showLine2 && (
            <span className="mt-0.5 flex min-w-0 items-center gap-3 pl-5 text-[0.9375rem] text-muted">
              {show('organization') && b.organization && (
                <span className="flex min-w-0 items-center gap-1">
                  <Buildings size={14} aria-hidden="true" className="shrink-0" />
                  <span className="truncate">{b.organization}</span>
                </span>
              )}
              {show('contact') && (
                <span className="flex min-w-0 items-center gap-1">
                  {contact && <Phone size={14} aria-hidden="true" className="shrink-0" />}
                  <span className="truncate">{b.guest_id ? contact || 'No phone or email' : 'No guest yet'}</span>
                </span>
              )}
            </span>
          )}
        </span>
        {show('room') && (
          <span className="flex items-center" title={`Room ${b.room_number}`}>
            <span className="sr-only">Room </span>
            <span className="rounded-md px-2 py-0.5 font-mono text-base font-semibold" style={{ backgroundColor: roomShade({ number: b.room_number }, settings).fill, boxShadow: `inset 0 0 0 1px ${roomShade({ number: b.room_number }, settings).edge}` }}>{b.room_number}</span>
          </span>
        )}
        {show('dates') && (
          <span className="col-span-2 flex min-w-0 items-start pl-5 text-[0.9375rem] md:col-span-1 md:pl-0">
            <span className="min-w-0">
              <span className="font-semibold text-accent-text">{fmtShort(b.check_in)}</span> to{' '}
              <span className="font-semibold text-danger">{fmtShort(b.check_out)}</span>
              <span className="text-muted">, {nightsLabel(b.nights)}</span>
            </span>
          </span>
        )}
        {show('status') && (
          <span className="col-span-2 min-w-0 pl-5 md:col-span-1 md:justify-self-start md:pl-0">
            {isDeleted ? (
              <StatusBadge deleted>{`Deleted ${fmtDateTime(b.deleted_at)}${b.deleted_by ? ` by ${b.deleted_by}` : ''}`}</StatusBadge>
            ) : (
              <StatusBadge status={b.status} />
            )}
          </span>
        )}
      </button>
      {!isDeleted && b.status === 'on_hold' && onConfirm && (
        <div className="flex shrink-0 items-center gap-2 pr-3">
          <button type="button" className="btn btn-sm" onClick={() => onConfirm(b)} aria-label={`Confirm hold, ${b.name}`}>
            <Check size={16} weight="bold" aria-hidden="true" /> <span className="hidden sm:inline">Confirm</span>
          </button>
          <button type="button" className="btn btn-sm btn-quiet" onClick={() => onCancelHold(b)} aria-label={`Cancel hold, ${b.name}`}>
            <X size={16} weight="bold" aria-hidden="true" /> <span className="hidden sm:inline">Cancel</span>
          </button>
        </div>
      )}
      {isDeleted && (
        <button type="button" className="btn btn-sm m-3 self-center" onClick={() => onRestore(b)}>
          Restore
        </button>
      )}
    </li>
  );
}
