import { ArrowUUpLeft, Bed, Buildings, CalendarBlank, Check, Phone, X } from '@phosphor-icons/react';
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

// One booking in the list: colour stripe, guest and contact, room, dates and status (each can be switched off in a view).
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
      <span className="w-1.5 shrink-0" style={{ backgroundColor: colorFor(b, settings).border }} aria-hidden="true" />
      <button
        type="button"
        disabled={isDeleted}
        onClick={() => onOpen(b)}
        style={{ '--cols': cols }}
        className={`grid min-w-0 flex-1 grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-3 text-left transition-colors duration-150 enabled:hover:bg-surface-2 md:[grid-template-columns:var(--cols)] ${
          roomy ? 'min-h-16 py-3' : 'min-h-10 py-1'
        } ${finished ? 'text-ink/75' : ''}`}
      >
        <span className="min-w-0">
          <span className={`block truncate font-medium ${isDeleted ? 'line-through' : ''}`}>{b.name}</span>
          {showLine2 && (
            <span className="flex min-w-0 items-center gap-2 text-sm text-muted">
              {show('organization') && b.organization && (
                <span className="flex min-w-0 items-center gap-1">
                  <Buildings size={14} aria-hidden="true" className="shrink-0" />
                  <span className="truncate">{b.organization}</span>
                </span>
              )}
              {show('contact') && (
                <span className="flex min-w-0 items-center gap-1">
                  {contact && <Phone size={14} aria-hidden="true" className="shrink-0" />}
                  <span className="truncate">{b.guest_id ? contact || 'No contact saved' : 'No guest yet'}</span>
                </span>
              )}
            </span>
          )}
        </span>
        {show('room') && (
          <span className="flex items-center gap-1.5 font-mono text-sm font-semibold">
            <Bed size={16} aria-hidden="true" className="shrink-0 text-muted" />
            <span className="rounded px-1.5 py-0.5" style={{ backgroundColor: roomShade({ number: b.room_number }, settings).fill }}>{b.room_number}</span>
          </span>
        )}
        {show('dates') && (
          <span className="col-span-2 flex min-w-0 items-start gap-1.5 text-sm md:col-span-1">
            <CalendarBlank size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-muted" />
            <span className="min-w-0">
              <span className="text-accent-text">{fmtShort(b.check_in)}{b.check_in_time ? ` ${b.check_in_time}` : ''}</span> to{' '}
              <span className="text-danger">{fmtShort(b.check_out)}{b.check_out_time ? ` ${b.check_out_time}` : ''}</span>
              <span className="text-muted">, {nightsLabel(b.nights)}</span>
            </span>
          </span>
        )}
        {show('status') && (
          <span className="col-span-2 min-w-0 md:col-span-1 md:justify-self-start">
            {isDeleted ? (
              <StatusBadge deleted>{`Deleted ${fmtDateTime(b.deleted_at)}${b.deleted_by ? ` by ${b.deleted_by}` : ''}`}</StatusBadge>
            ) : (
              <StatusBadge status={b.status} />
            )}
          </span>
        )}
      </button>
      {!isDeleted && b.status === 'on_hold' && onConfirm && (
        <div className="flex shrink-0 items-center gap-1.5 pr-2">
          <button type="button" className="btn btn-primary px-3" onClick={() => onConfirm(b)} aria-label={`Confirm hold, ${b.name}`}>
            <Check size={16} weight="bold" aria-hidden="true" /> <span className="hidden sm:inline">Confirm</span>
          </button>
          <button type="button" className="btn px-3" onClick={() => onCancelHold(b)} aria-label={`Cancel hold, ${b.name}`}>
            <X size={16} weight="bold" aria-hidden="true" /> <span className="hidden sm:inline">Cancel</span>
          </button>
        </div>
      )}
      {isDeleted && (
        <button type="button" className="btn m-2 self-center" onClick={() => onRestore(b)}>
          <ArrowUUpLeft size={18} aria-hidden="true" /> Restore
        </button>
      )}
    </li>
  );
}
