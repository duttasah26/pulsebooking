import { CaretRight, Bed, Buildings, CalendarBlank, Clock, ListBullets, Phone, Tag, TextAa, Users, X, Check, Trash } from '@phosphor-icons/react';
import StatusBadge from '../StatusBadge';
import HoldButton from '../HoldButton';
import RoomChips from '../RoomChips';
import { FoldSection } from '../FilterParts';
import PendingBanner from './PendingBanner';
import BulkEdit from './BulkEdit';
import { formatTime } from '../TimeSelect';
import { useSettings } from '../SettingsProvider';
import { colorFor } from '../../lib/colors';
import { partyOf, partyText } from '../../lib/party';
import { fmtShort, nightsLabel } from '../../lib/dates';

/*
  What you see when several bookings are picked in Select mode. It is built around one question, "What would you like to do?",
  and answers it with big plain buttons, one job each:
    Move dates / Rename / Times / Status and colour   each opens just that one job (the Edit button at the top opens all of them)
    the bookings themselves                           a card each, in the colour of its bar (tap one to open it alone)
    Confirm holds / Put on hold / Hold to Delete      docked at the bottom of the panel, Delete last because you cannot take it back lightly
  A change waiting for Save (from dragging) shows at the top.
    editing: false, true (everything) or the name of one job ('dates', 'names', 'times', 'more')
*/
const JOBS = [
  { key: 'dates', icon: CalendarBlank, title: 'Move dates', hint: 'Earlier, later, longer or shorter' },
  { key: 'names', icon: TextAa, title: 'Rename', hint: 'Change the names' },
  { key: 'times', icon: Clock, title: 'Times', hint: 'Check-in and check-out' },
  { key: 'more', icon: Tag, title: 'Status and colour', hint: 'Also notes and organization' },
];

export default function SelectionPanel({
  bookings, rooms, onOpen, onUnpick, onConfirmAll, onDeleteAll, pending, onSavePending, onCancelPending, editing, onEdit, onCancelEdit, onSaveNames,
  onEditMany, onHoldAll, onPreview,
}) {
  const { settings } = useSettings();
  const holds = bookings.filter((b) => b.status === 'on_hold');
  const holdable = bookings.filter((b) => b.status === 'confirmed' || b.status === 'checked_in'); // can go back on hold
  const numbers = [...new Set(bookings.map((b) => b.room_number))].sort();
  const party = partyOf(bookings);

  return (
    <div className="space-y-4 pb-4">
      {pending && <PendingBanner items={pending.items} rooms={rooms} onSave={onSavePending} onCancel={onCancelPending} />}

      {editing ? (
        <BulkEdit
          bookings={bookings}
          only={typeof editing === 'string' ? editing : undefined}
          onPreview={onPreview}
          onCancel={onCancelEdit}
          onApply={async (change, renames) => {
            await onSaveNames(renames); // names first (it ignores the ones that did not change), then the dates and details
            if (Object.keys(change).length) await onEditMany(change);
            onCancelEdit();
          }}
        />
      ) : (
        <>
          {/* Who is picked: the rooms as coloured chips, and the guests (rooms booked together count once). */}
          <RoomChips
            numbers={numbers}
            note={
              <p className="mt-2 flex flex-wrap items-center gap-x-2 text-base">
                <strong className="font-semibold">{bookings.length} bookings</strong>
                <span className="flex items-center gap-1 text-muted"><Users size={16} aria-hidden="true" /> {partyText(party)}</span>
              </p>
            }
          />

          <section aria-labelledby="sel-do" className="space-y-3">
            <h3 id="sel-do" className="t-headline">What would you like to do?</h3>
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
              {JOBS.map(({ key, icon: Icon, title, hint }) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => onEdit(key)}
                    className="flex min-h-16 w-full items-center gap-4 px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-2"
                  >
                    <Icon size={22} aria-hidden="true" className="shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[1.0625rem] font-semibold leading-6">{title}</span>
                      <span className="t-footnote block">{hint}</span>
                    </span>
                    <CaretRight size={18} aria-hidden="true" className="shrink-0 text-muted" />
                  </button>
                </li>
              ))}
            </ul>

          </section>

          <FoldSection id="selection-list" title={`The ${bookings.length} bookings`} icon={ListBullets} defaultOpen>
            <ul className="-m-1 space-y-2 p-1">
              {bookings.map((b) => {
                const c = colorFor(b, settings);
                const contact = [b.phone, b.email].filter(Boolean).join(', ');
                const times = [b.check_in_time && `in ${formatTime(b.check_in_time)}`, b.check_out_time && `out ${formatTime(b.check_out_time)}`].filter(Boolean).join(', ');
                return (
                  <li key={b.id} className="relative">
                    <button
                      type="button"
                      onClick={() => onOpen(b)}
                      className={`block w-full rounded-lg border p-4 pr-12 text-left ${b.status === 'on_hold' ? 'border-2 border-dashed' : ''}`}
                      style={{ backgroundColor: c.bg, borderColor: c.border }}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0 break-words text-[1.0625rem] font-semibold">{b.name}</span>
                        <StatusBadge status={b.status} />
                      </span>
                      <span className="mt-2 grid gap-1 text-[0.9375rem]">
                        <span className="flex items-center gap-2"><Bed size={16} aria-hidden="true" className="shrink-0 text-muted" />Room <span className="font-mono font-semibold">{b.room_number}</span></span>
                        <span className="flex items-start gap-2">
                          <CalendarBlank size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-muted" />
                          <span>
                            <span className="text-accent-text">{fmtShort(b.check_in)}</span> to <span className="text-danger">{fmtShort(b.check_out)}</span>
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
                      className="absolute right-2 top-2 grid size-10 place-items-center rounded-md bg-white/70 transition-colors duration-150 hover:bg-white"
                    >
                      <X size={14} weight="bold" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </FoldSection>

          {/* Docked at the bottom of the panel however far it is scrolled: the buttons that change the state of everything picked, then
              Delete last and apart, because it is the one you cannot take back lightly (real bookings need a hold; holds delete with a click). */}
          <div className="sticky bottom-0 -mx-5 grid grid-cols-2 gap-3 border-t border-line bg-surface px-5 py-3">

                {holds.length > 0 && (
                  <button type="button" className="btn btn-block btn-primary col-span-2" onClick={() => onConfirmAll(holds)}>
                    Confirm {holds.length === bookings.length ? 'All' : `${holds.length} Hold${holds.length === 1 ? '' : 's'}`}
                  </button>
                )}
                {onHoldAll && holdable.length > 0 && (
                  <button type="button" className="btn btn-block btn-hold" onClick={() => onHoldAll(holdable)}>
                    <Clock size={18} aria-hidden="true" /> Put {holdable.length === bookings.length ? 'All' : holdable.length} on Hold
                  </button>
                )}
              
            {bookings.some((b) => b.status !== 'on_hold') ? (
              <HoldButton className={`btn btn-block btn-danger ${onHoldAll && holdable.length > 0 ? '' : 'col-span-2'}`} onConfirm={onDeleteAll}>
                <Trash size={18} aria-hidden="true" /> Hold to Delete {bookings.length}
              </HoldButton>
            ) : (
              <button type="button" className="btn btn-block btn-danger col-span-2" onClick={onDeleteAll}>
                <Trash size={18} aria-hidden="true" /> Delete {bookings.length}
              </button>
            )}
          
          </div>
        </>
      )}
    </div>
  );
}
