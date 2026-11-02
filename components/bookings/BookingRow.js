import { useState } from 'react';
import Count from '../Count';
import { Buildings, CalendarBlank, CaretDown, CaretRight, Check, Phone, PushPin, X } from '@phosphor-icons/react';
import { usePinned } from '../../lib/pinned';
import StatusBadge from '../StatusBadge';
import { shownStatus } from '../../lib/status';
import RoomNumber from '../RoomNumber';
import { useSettings } from '../SettingsProvider';
import { colorFor, roomShade } from '../../lib/colors';
import { fmtDateTime, fmtShort } from '../../lib/dates';

// The columns a view can show or hide. The guest's name is always there.
export const BOOKING_COLUMNS = [
  ['contact', 'Contact'],
  ['organization', 'Organization'],
  ['room', 'Room'],
  ['dates', 'Dates'],
  ['status', 'Status'],
];

// One booking in the list, in two lines: its colour and the guest's name with the status, then a row of small facts, each with its icon
// (room, dates, nights, guests, organization, contact; each can be switched off in a view). A chevron at the end says the row opens.
// minimal: the quiet form for a narrow list (the Overview): the name, then room, dates, nights and guests in small plain text, no badge or chip.
// A deleted booking offers Restore; a hold offers Confirm and Cancel in one click. Checked-out and cancelled stays are faded.
export default function BookingRow({ b, index = 0, onOpen, onRestore, onConfirm, onCancelHold, hidden = [], density = 'roomy', minimal = false }) {
  const { settings } = useSettings();
  const isDeleted = Boolean(b.deleted_at);
  const finished = !isDeleted && (b.status === 'checked_out' || b.status === 'cancelled');
  const contact = b.guest_id ? b.phone || b.email : null;
  const show = (key) => !hidden.includes(key);
  const rooms = [...new Set(b.rooms ?? [b.room_number])].sort();
  const members = b.members?.length > 1 ? b.members : null; // the rooms of one stay, gathered on this row
  const [open, setOpen] = useState(false);
  const { ids: pinnedIds } = usePinned();
  const pinned = pinnedIds.includes(b.id) || Boolean(members?.some((m) => pinnedIds.includes(m.id))); // a pin beside the name, so a pinned booking is known without opening it
  const roomy = density !== 'compact';
  const chevron = !isDeleted && !members && b.status !== 'on_hold'; // its arrow sits in the same 3.5rem slot as the rooms caret, so they line up
  return (
    // content-visibility keeps long lists cheap: rows far off screen are not painted
    <li style={{ '--i': index }} className={`row-in [content-visibility:auto] ${roomy ? '[contain-intrinsic-size:auto_4rem]' : '[contain-intrinsic-size:auto_2.5rem]'}`}>
      <div className={`flex items-stretch transition-colors duration-150 ${isDeleted ? '' : 'hover:bg-surface-2'}`}>
      <button
        type="button"
        disabled={isDeleted}
        onClick={() => onOpen(b, members)}
        className={`flex min-w-0 flex-1 items-center gap-3 pl-4 text-left ${chevron ? 'pr-0' : 'pr-4'} ${minimal ? 'min-h-14 py-2.5' : `md:pl-5 ${chevron ? '' : 'md:pr-5'} ${roomy ? 'min-h-[4.5rem] py-3' : 'min-h-11 py-1'}`} ${finished ? 'text-ink/75' : ''}`}
      >
        <span aria-hidden="true" className={`shrink-0 rounded-md ${minimal ? 'size-3.5' : 'size-4'}`} style={{ backgroundColor: colorFor(b, settings).bg, boxShadow: `inset 0 0 0 1.5px ${colorFor(b, settings).border}` }} />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`truncate ${minimal ? 'text-[0.9375rem]' : 'text-[1.0625rem]'} font-semibold ${isDeleted ? 'line-through' : ''}`}>{b.name}</span>
            {pinned && !isDeleted && <PushPin size={14} weight="fill" aria-label="Pinned" className="shrink-0 text-muted" />}
            {show('status') && (
              isDeleted ? (
                <StatusBadge deleted>{`Deleted ${fmtDateTime(b.deleted_at)}${b.deleted_by ? ` by ${b.deleted_by}` : ''}`}</StatusBadge>
              ) : (
                <StatusBadge status={shownStatus(b)} />
              )
            )}
          </span>
          <span className={`mt-1 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 ${minimal ? 'text-[0.8125rem]' : 'text-[0.9375rem]'} text-muted`}>
            {show('room') && (
              <span className="flex flex-wrap items-center gap-1.5" title={`Rooms ${rooms.join(', ')}`}>
                {rooms.length > 1 ? (
                  <>
                    <span className="font-semibold text-ink">{rooms.length} rooms</span>
                    {Object.entries(rooms.reduce((acc, n) => ({ ...acc, [String(n)[0]]: (acc[String(n)[0]] ?? 0) + 1 }), {})).map(([f, count]) => (
                      <RoomNumber key={f} number={count} shadeOf={`${f}01`} label="" />
                    ))}
                  </>
                ) : (
                  <RoomNumber number={rooms[0]} />
                )}
              </span>
            )}
            {show('dates') && (
              <span className="flex items-center gap-1.5">
                <CalendarBlank size={minimal ? 14 : 16} aria-hidden="true" className="shrink-0" />
                <span>
                  <span className={minimal ? '' : 'font-semibold text-ink'}>{fmtShort(b.check_in)}</span> to <span className={minimal ? '' : 'font-semibold text-ink'}>{fmtShort(b.check_out)}</span>
                </span>
              </span>
            )}
            <span className="flex items-center gap-4">
            {show('dates') && (
              <Count kind="nights" n={b.nights} size={minimal ? 14 : 16} />
            )}
            {b.adults != null && (
              <Count kind="guests" n={b.adults + (b.children ?? 0)} size={minimal ? 14 : 16} title={`${b.adults} adult${b.adults === 1 ? '' : 's'}${b.children ? `, ${b.children} child${b.children === 1 ? '' : 'ren'}` : ''}`} />
            )}
            </span>
            {show('organization') && b.organization && (
              <span className="flex min-w-0 items-center gap-1.5">
                <Buildings size={16} aria-hidden="true" className="shrink-0" />
                <span className="truncate">{b.organization}</span>
              </span>
            )}
            {show('contact') && (
              <span className="flex min-w-0 items-center gap-1.5">
                {contact && <Phone size={16} aria-hidden="true" className="shrink-0" />}
                <span className="truncate">{b.guest_id ? contact || 'No phone or email' : 'No guest yet'}</span>
              </span>
            )}
          </span>
        </span>
        {chevron && <span className="flex w-14 shrink-0 justify-center"><CaretRight size={18} aria-hidden="true" className="text-muted" /></span>}
      </button>
      {!isDeleted && b.status === 'on_hold' && onConfirm && (
        <div className="flex shrink-0 items-center gap-3 pr-3 sm:gap-2">
          <button type="button" className="btn btn-sm" onClick={() => onConfirm(b)} aria-label={`Confirm hold, ${b.name}`}>
            <Check size={16} weight="bold" aria-hidden="true" /> <span className="hidden sm:inline">Confirm</span>
          </button>
          <button type="button" className="btn btn-sm btn-quiet" onClick={() => onCancelHold(b)} aria-label={`Cancel hold, ${b.name}`}>
            <X size={16} weight="bold" aria-hidden="true" /> <span className="hidden sm:inline">Cancel</span>
          </button>
        </div>
      )}
      {members && !isDeleted && (
        <span className="flex w-14 shrink-0 items-center justify-center">
          <button type="button" className="btn btn-icon btn-quiet" aria-expanded={open} aria-label={`${open ? 'Hide' : 'Show'} the ${members.length} rooms of ${b.name}`} onClick={() => setOpen((v) => !v)}>
            <CaretDown size={18} aria-hidden="true" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
        </span>
      )}
      {isDeleted && (
        <button type="button" className="btn btn-sm m-3 self-center" onClick={() => onRestore(b)}>
          Restore
        </button>
      )}
      </div>
      {members && open && (
        <ul aria-label={`Rooms of ${b.name}`} className="tray-in flex flex-wrap gap-2 bg-surface-2/60 px-4 py-3 pl-9 md:px-5 md:pl-10">
          {[...members].sort((x, y) => String(x.room_number).localeCompare(String(y.room_number))).map((m, mi) => {
            const shade = roomShade({ number: m.room_number }, settings);
            return (
              <li key={m.id} className="chip-in" style={{ '--i': mi }}>
                <button type="button" className="rounded-md px-3 py-1 font-mono text-base font-semibold transition-[filter] duration-150 hover:brightness-95" style={{ backgroundColor: shade.fill, boxShadow: `inset 0 0 0 1px ${shade.edge}` }} onClick={() => onOpen(m, members)}>
                  <span className="sr-only">Room </span>{m.room_number}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
