import { Bed, Buildings, Check, Clock, Envelope, Megaphone, Note, Phone, Receipt, SignIn, SignOut, Users, Stack, Trash, PencilSimple, User } from '@phosphor-icons/react';
import StatusBadge from '../StatusBadge';
import HoldButton from '../HoldButton';
import PendingBanner from '../calendar/PendingBanner';
import { partyOf, partyText } from '../../lib/party';
import { useSettings } from '../SettingsProvider';
import { useRemoveBooking } from './useRemoveBooking';
import { formatTime } from '../TimeSelect';
import { colorFor, roomShade } from '../../lib/colors';
import { fmtBooked, fmtShort, nightsLabel } from '../../lib/dates';
import { displayName } from '../../lib/staff';

// One end of the stay: the date and the time, in large type. With no time of its own it shows the default time.
// Its title carries the check-in (green) or check-out (brick) symbol, as in the forms.
function Moment({ icon: Icon, tone, label, date, time, fallback }) {
  const shown = time || fallback;
  return (
    <div className="bg-surface p-4">
      <p className="t-group flex items-center gap-2">
        {Icon && <Icon size={20} aria-hidden="true" className={`shrink-0 ${tone ?? 'text-muted'}`} />}
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold leading-tight tabular-nums">{fmtShort(date)}</p>
      <p className="font-mono text-base tabular-nums">{shown ? formatTime(shown) : 'No time set'}</p>
    </div>
  );
}

function Line({ icon: Icon, children }) {
  return (
    <li className="flex items-start gap-2">
      <Icon size={16} aria-hidden="true" className="mt-1 shrink-0 text-muted" />
      <span className="min-w-0 break-words">{children}</span>
    </li>
  );
}

// A booking as plain details. The contact card takes the booking's colour, so it matches its bar on the calendar.
// The pencil in the panel header switches to the form.
export default function BookingDetails({
  booking: b, group, rooms = [], onRemove, onSaved, onDone, onRemoved, onConfirm, onPutOnHold, groupCount = 0, onShowGroup, pending, onSavePending, onCancelPending,
}) {
  const targets = group && group.length > 1 ? group : [b];
  const { remove, removing } = useRemoveBooking({ booking: b, targets, onRemove, onSaved, onDone: onRemoved ?? onDone });
  const { settings } = useSettings();
  const c = colorFor(b, settings);
  // Edited = changed more than a minute after it was made (a booking's updated_at starts out equal to created_at).
  const edited = b.updated_at && b.created_at && new Date(b.updated_at) - new Date(b.created_at) > 60000;

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* A change made by dragging waits here for Save. */}
      {pending?.items.some((i) => i.original.id === b.id) && (
        <PendingBanner items={pending.items} rooms={rooms} onSave={onSavePending} onCancel={onCancelPending} />
      )}

      {/* Who and where, in the booking's own colour (it matches its bar on the calendar): the status as a tag (dashed
          when on hold, so it reads without colour), the name, how to reach them, and the room or rooms as key tags. */}
      <section aria-label="Guest and room" className="rounded-lg border p-4" style={{ backgroundColor: c.bg, borderColor: c.border }}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusBadge status={b.status} />
          {b.status === 'on_hold' && <span className="text-[0.9375rem]">Not confirmed yet</span>}
        </div>
        <p className="t-title mt-3 flex min-w-0 items-center gap-2 break-words">
          <User size={20} aria-hidden="true" className="shrink-0 text-muted" />
          {b.name}
        </p>
        <ul className="mt-3 space-y-2 text-base">
          {b.phone && <Line icon={Phone}><a href={`tel:${b.phone.replace(/[^+\d]/g, '')}`} className="underline decoration-ink/30 underline-offset-2 hover:decoration-ink">{b.phone}</a></Line>}
          {b.email && <Line icon={Envelope}><a href={`mailto:${b.email}`} className="break-all underline decoration-ink/30 underline-offset-2 hover:decoration-ink">{b.email}</a></Line>}
          {b.organization && <Line icon={Buildings}>{b.organization}</Line>}
          {!b.guest_id && <li>No guest name yet</li>}
          <Line icon={Users}>{partyText(partyOf(targets))}</Line>
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-3">
          <Bed size={20} aria-hidden="true" className="shrink-0 text-muted" />
          <span className="sr-only">{targets.length > 1 ? 'Rooms' : 'Room'}</span>
          {[...new Set(targets.length > 1 ? targets.map((t) => t.room_number) : [b.room_number])].sort().map((n) => {
            const shade = roomShade({ number: n }, settings);
            return (
              <span key={n} className="rounded-md px-2 py-1 font-mono text-lg font-semibold" style={{ backgroundColor: shade.fill, boxShadow: `inset 0 0 0 1px ${shade.edge}` }}>{n}</span>
            );
          })}
          {groupCount > 1 && onShowGroup && (
            <button type="button" className="btn btn-sm ml-auto bg-white/60 hover:bg-white" onClick={onShowGroup}>
              <Stack size={16} aria-hidden="true" /> {groupCount - 1} more {groupCount === 2 ? 'room' : 'rooms'}
            </button>
          )}
        </div>
      </section>

      {/* When: the two moments that matter most, large, with the length of the stay inside the same card. */}
      <section aria-label="Dates" className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="grid grid-cols-2 divide-x divide-line">
          <Moment icon={SignIn} tone="text-accent-text" label="Check-in" date={b.check_in} time={b.check_in_time} fallback={settings.checkInTime} />
          <Moment icon={SignOut} tone="text-danger" label="Check-out" date={b.check_out} time={b.check_out_time} fallback={settings.checkOutTime} />
        </div>
        <p className="border-t border-line px-4 py-3 text-center text-[0.9375rem] font-semibold text-muted">{nightsLabel(b.nights)}</p>
      </section>

      <ul className="space-y-2 px-1 text-base">
        <Line icon={Megaphone}>Booked via {b.channel}</Line>
        <Line icon={Receipt}>{b.rate_plan}</Line>
        {b.notes && <Line icon={Note}>{b.notes}</Line>}
        {b.created_at && (
          <Line icon={Clock}>
            <span title={new Date(b.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}>
              Booked {fmtBooked(b.created_at)}{b.created_by ? ` by ${displayName(b.created_by)}` : ''}
            </span>
          </Line>
        )}
        {edited && (
          <Line icon={PencilSimple}>
            <span title={new Date(b.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}>
              Last edited {fmtBooked(b.updated_at)}{b.updated_by ? ` by ${displayName(b.updated_by)}` : ''}
            </span>
          </Line>
        )}
      </ul>

      {/* One button to a line, full width, so the words always fit (the side panel is narrow). */}
      <div className="sticky bottom-0 -mx-4 mt-auto grid grid-cols-2 gap-3 border-t border-line bg-surface px-4 pb-3 pt-3">
        {b.status === 'on_hold' && onConfirm && (
          <button type="button" className="btn btn-block btn-primary col-span-2" onClick={() => onConfirm(b)} disabled={b.id < 0}>
            Confirm Booking
          </button>
        )}
        {/* A confirmed booking can go back on hold (the guest stays on it): right beside Delete. */}
        {(b.status === 'confirmed' || b.status === 'checked_in') && onPutOnHold && (
          <button type="button" className="btn btn-block btn-hold" onClick={() => onPutOnHold(b)} disabled={b.id < 0}>
            <Clock size={18} aria-hidden="true" /> Put on Hold
          </button>
        )}
        <HoldButton
          className={`btn btn-block btn-danger ${(b.status === 'confirmed' || b.status === 'checked_in') && onPutOnHold ? '' : 'col-span-2'}`}
          title={b.status === 'on_hold' ? 'Hold to cancel this hold' : 'Hold to delete'}
          onConfirm={remove}
          disabled={removing || b.id < 0}
        >
          <Trash size={18} aria-hidden="true" /> {b.status === 'on_hold' ? 'Hold to Cancel' : 'Hold to Delete'}
        </HoldButton>
      </div>
    </div>
  );
}
