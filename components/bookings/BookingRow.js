import { ArrowUUpLeft, Bed, Buildings, CalendarBlank, Phone } from '@phosphor-icons/react';
import StatusBadge from '../StatusBadge';
import { useSettings } from '../SettingsProvider';
import { colorFor } from '../../lib/colors';
import { fmtDateTime, fmtShort, nightsLabel } from '../../lib/dates';

// One booking in the list: colour stripe, guest and contact, room, dates and status. A deleted booking offers Restore.
export default function BookingRow({ b, onOpen, onRestore }) {
  const { settings } = useSettings();
  const isDeleted = Boolean(b.deleted_at);
  const contact = b.guest_id ? b.phone || b.email : null;
  return (
    // content-visibility keeps long lists cheap: rows far off screen are not painted
    <li className="flex items-stretch [contain-intrinsic-size:auto_3rem] [content-visibility:auto]">
      <span className="w-1.5 shrink-0" style={{ backgroundColor: colorFor(b, settings).border }} aria-hidden="true" />
      <button
        type="button"
        disabled={isDeleted}
        onClick={() => onOpen(b)}
        className="grid min-h-12 min-w-0 flex-1 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 px-3 py-2 text-left enabled:hover:bg-surface-2 md:grid-cols-[1.4fr_0.6fr_1.4fr_0.8fr]"
      >
        <span className="min-w-0">
          <span className={`block truncate font-medium ${isDeleted ? 'line-through' : ''}`}>{b.name}</span>
          <span className="flex min-w-0 items-center gap-2 text-sm text-muted">
            {b.organization && (
              <span className="flex min-w-0 items-center gap-1">
                <Buildings size={14} aria-hidden="true" className="shrink-0" />
                <span className="truncate">{b.organization}</span>
              </span>
            )}
            <span className="flex min-w-0 items-center gap-1">
              {contact && <Phone size={14} aria-hidden="true" className="shrink-0" />}
              <span className="truncate">{b.guest_id ? contact || 'No contact saved' : 'No guest yet'}</span>
            </span>
          </span>
        </span>
        <span className="flex items-center gap-1.5 font-mono text-sm font-semibold">
          <Bed size={16} aria-hidden="true" className="shrink-0 text-muted" />
          {b.room_number}
        </span>
        <span className="col-span-2 flex items-center gap-1.5 text-sm md:col-span-1">
          <CalendarBlank size={16} aria-hidden="true" className="shrink-0 text-muted" />
          <span>
            {fmtShort(b.check_in)}{b.check_in_time ? ` ${b.check_in_time}` : ''} to {fmtShort(b.check_out)}{b.check_out_time ? ` ${b.check_out_time}` : ''}
            <span className="text-muted">, {nightsLabel(b.nights)}</span>
          </span>
        </span>
        <span className="col-span-2 md:col-span-1">
          {isDeleted ? (
            <StatusBadge deleted>{`Deleted ${fmtDateTime(b.deleted_at)}${b.deleted_by ? ` by ${b.deleted_by}` : ''}`}</StatusBadge>
          ) : (
            <StatusBadge status={b.status} />
          )}
        </span>
      </button>
      {isDeleted && (
        <button type="button" className="btn m-2 self-center" onClick={() => onRestore(b)}>
          <ArrowUUpLeft size={18} aria-hidden="true" /> Restore
        </button>
      )}
    </li>
  );
}
