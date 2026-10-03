import { Bed, Buildings, CalendarBlank, Check, Phone, Trash, Users } from '@phosphor-icons/react';
import StatusBadge from '../StatusBadge';
import HoldButton from '../HoldButton';
import RoomChips from '../RoomChips';
import { partyOf, partyText } from '../../lib/party';
import { formatTime } from '../TimeSelect';
import { useSettings } from '../SettingsProvider';
import { colorFor } from '../../lib/colors';
import { fmtShort, nightsLabel } from '../../lib/dates';

// The details of every booking picked in select mode, one card each (in the colour of its bar). Tap a card to open
// that booking on its own. The buttons act on the whole selection: confirm every hold in it, or delete all of it.
export default function SelectionPanel({ bookings, onOpen, onConfirmAll, onDeleteAll }) {
  const { settings } = useSettings();
  const holds = bookings.filter((b) => b.status === 'on_hold');
  const rooms = [...new Set(bookings.map((b) => b.room_number))].sort();
  const party = partyOf(bookings);

  return (
    <div className="space-y-3 pb-4">
      {/* Every room that was picked, at once, as coloured chips in large type. */}
      <RoomChips numbers={rooms} note={<p className="mt-2 text-xs text-muted">{bookings.length} bookings selected</p>} />

      {/* Everyone in the selection: rooms booked together count once. */}
      <div className="rounded-lg border border-line bg-surface p-3">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
          <Users size={14} aria-hidden="true" /> Guests
        </p>
        <p className="mt-1 text-lg font-semibold leading-tight">{partyText(party)}</p>
      </div>

      <ul className="space-y-2">
        {bookings.map((b) => {
          const c = colorFor(b, settings);
          const contact = [b.phone, b.email].filter(Boolean).join(', ');
          const times = [b.check_in_time && `in ${formatTime(b.check_in_time)}`, b.check_out_time && `out ${formatTime(b.check_out_time)}`].filter(Boolean).join(', ');
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onOpen(b)}
                className={`block w-full rounded-lg border p-3 text-left transition-transform active:scale-[0.99] ${b.status === 'on_hold' ? 'border-dashed' : ''}`}
                style={{ backgroundColor: c.bg, borderColor: c.border }}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0 break-words font-medium">{b.name}</span>
                  <StatusBadge status={b.status} />
                </span>
                <span className="mt-1.5 grid gap-1 text-sm">
                  <span className="flex items-center gap-2"><Bed size={15} aria-hidden="true" className="shrink-0 text-muted" />Room {b.room_number}</span>
                  <span className="flex items-start gap-2">
                    <CalendarBlank size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-muted" />
                    <span>
                      {fmtShort(b.check_in)} to {fmtShort(b.check_out)}
                      <span className="text-muted">, {nightsLabel(b.nights)}{times ? `, ${times}` : ''}</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2"><Users size={15} aria-hidden="true" className="shrink-0 text-muted" />{b.adults} adult{b.adults === 1 ? '' : 's'}{b.children > 0 ? `, ${b.children} child${b.children === 1 ? '' : 'ren'}` : ''}</span>
                  {contact && <span className="flex items-center gap-2"><Phone size={15} aria-hidden="true" className="shrink-0 text-muted" />{contact}</span>}
                  {b.organization && <span className="flex items-center gap-2"><Buildings size={15} aria-hidden="true" className="shrink-0 text-muted" />{b.organization}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex gap-2">
        {holds.length > 0 && (
          <button type="button" className="btn btn-primary flex-1" onClick={() => onConfirmAll(holds)}>
            <Check size={18} aria-hidden="true" /> Confirm {holds.length === bookings.length ? 'All' : `${holds.length} Hold${holds.length === 1 ? '' : 's'}`}
          </button>
        )}
        {/* Real bookings need a hold to delete (a slip is costly); a selection of holds only deletes with a click. */}
        {bookings.some((b) => b.status !== 'on_hold') ? (
          <HoldButton className={`btn btn-danger ${holds.length > 0 ? 'flex-1' : ''}`} onConfirm={onDeleteAll}>
            <Trash size={18} aria-hidden="true" /> Hold to Delete {bookings.length}
          </HoldButton>
        ) : (
          <button type="button" className={`btn btn-danger ${holds.length > 0 ? 'flex-1' : ''}`} onClick={onDeleteAll}>
            <Trash size={18} aria-hidden="true" /> Delete {bookings.length}
          </button>
        )}
      </div>
    </div>
  );
}
