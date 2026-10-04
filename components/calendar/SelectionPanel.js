import { useEffect, useRef, useState } from 'react';
import { Bed, Buildings, CalendarBlank, Check, Phone, Trash, Users, X } from '@phosphor-icons/react';
import StatusBadge from '../StatusBadge';
import HoldButton from '../HoldButton';
import RoomChips from '../RoomChips';
import PendingBanner from './PendingBanner';
import { formatTime } from '../TimeSelect';
import { useSettings } from '../SettingsProvider';
import { colorFor, roomShade } from '../../lib/colors';
import { partyOf, partyText } from '../../lib/party';
import { fmtShort, nightsLabel } from '../../lib/dates';

// Every booking has its own name cell, so one room of a group can be renamed on its own.
const nameKey = (b) => `b${b.id}`;

// The details of everything picked in select mode: the rooms, the total guests, and a card for each booking (in the
// colour of its bar). Tap a card to open that booking on its own. Edit turns the names into cells you can type in, like a
// spreadsheet (Enter moves down, Tab across), and Save names applies them. The buttons act on the whole selection:
// confirm every hold in it, or delete all of it. A change waiting for Save (from dragging) shows at the top.
export default function SelectionPanel({
  bookings, rooms, onOpen, onUnpick, onConfirmAll, onDeleteAll, pending, onSavePending, onCancelPending, editing, onCancelEdit, onSaveNames,
}) {
  const { settings } = useSettings();
  const holds = bookings.filter((b) => b.status === 'on_hold');
  const numbers = [...new Set(bookings.map((b) => b.room_number))].sort();
  const party = partyOf(bookings);

  const [names, setNames] = useState({});
  const cells = useRef([]);
  useEffect(() => {
    if (editing) setNames(Object.fromEntries(bookings.map((b) => [nameKey(b), b.name])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);
  const save = (e) => {
    e.preventDefault();
    onSaveNames(bookings.map((b) => ({ booking: b, name: names[nameKey(b)] ?? b.name })));
  };

  return (
    <div className="space-y-3 pb-4">
      {pending && <PendingBanner items={pending.items} rooms={rooms} onSave={onSavePending} onCancel={onCancelPending} />}

      {/* Every room that was picked, at once, as coloured chips in large type. */}
      <RoomChips numbers={numbers} note={<p className="mt-2 text-sm text-muted lg:text-xs">{bookings.length} bookings selected</p>} />

      {/* Everyone in the selection: rooms booked together count once. */}
      <div className="rounded-lg border border-line bg-surface p-3">
        <p className="flex items-center gap-1.5 text-sm font-medium uppercase tracking-wide text-muted lg:text-xs">
          <Users size={14} aria-hidden="true" /> Total guests
        </p>
        <p className="mt-1 text-lg font-semibold leading-tight">{partyText(party)}</p>
      </div>

      {editing ? (
        <form onSubmit={save} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Names</p>
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
            {bookings.map((b, i) => {
              const shade = roomShade({ number: b.room_number }, settings);
              return (
                <li key={b.id} className="flex items-center gap-2 bg-surface px-2 py-1.5">
                  <span className="w-12 shrink-0 rounded px-1.5 py-0.5 text-center font-mono text-sm font-semibold" style={{ backgroundColor: shade.fill, boxShadow: `inset 0 0 0 1px ${shade.edge}` }}>
                    {b.room_number}
                  </span>
                  <input
                    ref={(el) => { cells.current[i] = el; }}
                    name={`name-${b.id}`}
                    aria-label={`Name for room ${b.room_number}`}
                    className="field"
                    value={names[nameKey(b)] ?? ''}
                    onChange={(e) => setNames({ ...names, [nameKey(b)]: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && i < bookings.length - 1) {
                        e.preventDefault();
                        cells.current[i + 1]?.focus();
                      }
                    }}
                    autoComplete="off"
                  />
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted">Only the bookings you change are renamed. Give every booking of one guest the same new name to rename the guest itself.</p>
          <div className="flex gap-2">
            <button type="button" className="btn flex-1" onClick={onCancelEdit}>
              <X size={16} aria-hidden="true" /> Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              <Check size={16} weight="bold" aria-hidden="true" /> Save Names
            </button>
          </div>
        </form>
      ) : (
        <>
          <ul className="space-y-2">
            {bookings.map((b) => {
              const c = colorFor(b, settings);
              const contact = [b.phone, b.email].filter(Boolean).join(', ');
              const times = [b.check_in_time && `in ${formatTime(b.check_in_time)}`, b.check_out_time && `out ${formatTime(b.check_out_time)}`].filter(Boolean).join(', ');
              return (
                <li key={b.id} className="relative">
                  <button
                    type="button"
                    onClick={() => onOpen(b)}
                    className={`block w-full rounded-lg border p-3 pr-11 text-left transition-transform active:scale-[0.99] ${b.status === 'on_hold' ? 'border-dashed' : ''}`}
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
                      <span className="flex items-center gap-2"><Users size={15} aria-hidden="true" className="shrink-0 text-muted" />{partyText(partyOf([b]))}</span>
                      {contact && <span className="flex items-center gap-2"><Phone size={15} aria-hidden="true" className="shrink-0 text-muted" />{contact}</span>}
                      {b.organization && <span className="flex items-center gap-2"><Buildings size={15} aria-hidden="true" className="shrink-0 text-muted" />{b.organization}</span>}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUnpick(b)}
                    aria-label={`Take ${b.name}, room ${b.room_number}, out of the selection`}
                    title="Take this one out of the selection"
                    className="absolute right-2 top-2 grid size-7 place-items-center rounded-md bg-white/70 hover:bg-white"
                  >
                    <X size={14} weight="bold" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="grid gap-2">
            {holds.length > 0 && (
              <button type="button" className="btn btn-primary w-full" onClick={() => onConfirmAll(holds)}>
                <Check size={18} aria-hidden="true" /> Confirm {holds.length === bookings.length ? 'All' : `${holds.length} Hold${holds.length === 1 ? '' : 's'}`}
              </button>
            )}
            {/* Real bookings need a hold to delete (a slip is costly); a selection of holds only deletes with a click. */}
            {bookings.some((b) => b.status !== 'on_hold') ? (
              <HoldButton className={`btn min-h-12 border-2 border-danger bg-red-50 text-base font-semibold text-danger hover:bg-red-100 w-full`} onConfirm={onDeleteAll}>
                <Trash size={18} aria-hidden="true" /> Hold to Delete {bookings.length}
              </HoldButton>
            ) : (
              <button type="button" className="btn btn-danger min-h-12 w-full border-2 border-danger bg-red-50 text-base font-semibold hover:bg-red-100" onClick={onDeleteAll}>
                <Trash size={18} aria-hidden="true" /> Delete {bookings.length}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
