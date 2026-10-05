import {
  Baby, Bed, Buildings, Check, Clock, Envelope, Megaphone, Note, Phone, Receipt, SignIn, SignOut, Trash, Users,
} from '@phosphor-icons/react';
import { STATUS_ICON } from '../StatusBadge';
import HoldButton from '../HoldButton';
import PendingBanner from '../calendar/PendingBanner';
import RoomChips from '../RoomChips';
import { partyOf, partyText } from '../../lib/party';
import { useSettings } from '../SettingsProvider';
import { useRemoveBooking } from './useRemoveBooking';
import { formatTime } from '../TimeSelect';
import { colorFor, statusColor } from '../../lib/colors';
import { STATUS_LABEL } from '../../lib/status';
import { fmtShort, nightsLabel } from '../../lib/dates';

// One end of the stay: the date and the time, in large type. With no time of its own it shows the default time, marked.
function Moment({ icon: Icon, label, date, time, fallback }) {
  const shown = time || fallback;
  return (
    <div className="bg-surface p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium uppercase tracking-wide text-muted lg:text-xs">
        <Icon size={14} aria-hidden="true" /> {label}
      </p>
      <p className="mt-1 text-lg font-semibold leading-tight">{fmtShort(date)}</p>
      <p className="font-mono text-base">
        {shown ? formatTime(shown) : 'No time set'}
        {!time && shown && <span className="ml-1.5 font-sans text-sm text-muted lg:text-xs">default</span>}
      </p>
    </div>
  );
}

function Line({ icon: Icon, children }) {
  return (
    <li className="flex items-start gap-2">
      <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-muted" />
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
  const sc = statusColor(b.status, settings);
  const StatusIcon = STATUS_ICON[b.status] ?? Check;

  return (
    <div className="space-y-3">
      {/* A change made by dragging waits here for Save. */}
      {pending?.items.some((i) => i.original.id === b.id) && (
        <PendingBanner items={pending.items} rooms={rooms} onSave={onSavePending} onCancel={onCancelPending} />
      )}

      {/* The status first, in its own colour: ON HOLD (dashed, like its bar on the calendar), Confirmed, Checked in... */}
      <div
        className={`flex items-center justify-between gap-2 rounded-lg border-2 px-3 py-2 ${b.status === 'on_hold' ? 'border-dashed' : ''}`}
        style={{ backgroundColor: sc.bg, borderColor: sc.border }}
      >
        <span className="flex items-center gap-2 text-base font-semibold uppercase tracking-wide">
          <StatusIcon size={18} weight="bold" aria-hidden="true" /> {STATUS_LABEL[b.status]}
        </span>
        {b.status === 'on_hold' && <span className="text-sm font-medium">Not confirmed yet</span>}
      </div>

      {b.status === 'on_hold' && onConfirm && (
        <p className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-base leading-snug">
          Held only. Press <strong>Confirm Booking</strong> when the guest is sure.
        </p>
      )}

      <div className="rounded-lg border p-3" style={{ backgroundColor: c.bg, borderColor: c.border }}>
        <p className="min-w-0 break-words text-base font-medium">{b.name}</p>
        <ul className="mt-1.5 space-y-1 text-sm">
          {b.phone && <Line icon={Phone}>{b.phone}</Line>}
          {b.email && <Line icon={Envelope}>{b.email}</Line>}
          {b.organization && <Line icon={Buildings}>{b.organization}</Line>}
          {!b.guest_id && <li>No guest name yet</li>}
        </ul>
      </div>

      {/* The two moments that matter most, large: the day and time of arrival and of departure. */}
      <div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
          <Moment icon={SignIn} label="Check-in" date={b.check_in} time={b.check_in_time} fallback={settings.checkInTime} />
          <Moment icon={SignOut} label="Check-out" date={b.check_out} time={b.check_out_time} fallback={settings.checkOutTime} />
        </div>
        <p className="mt-1 text-center text-sm text-muted lg:text-xs">{nightsLabel(b.nights)}</p>
      </div>

      {/* The room, or every room of the group after a double-click on its bar, as coloured chips in large type. */}
      <RoomChips
        numbers={targets.length > 1 ? targets.map((t) => t.room_number) : [b.room_number]}
        note={
          groupCount > 1 && onShowGroup ? (
            <button type="button" className="btn mt-2 min-h-11 px-3 text-sm lg:min-h-8 lg:px-2.5 lg:text-xs" onClick={onShowGroup}>
              Booked with {groupCount - 1} other room{groupCount === 2 ? '' : 's'}: show all
            </button>
          ) : null
        }
      />

      <ul className="space-y-2 text-sm">
        <Line icon={Users}>{partyText(partyOf(targets))}</Line>
        <Line icon={Megaphone}>Booked via {b.channel}</Line>
        <Line icon={Receipt}>{b.rate_plan}</Line>
        {b.notes && <Line icon={Note}>{b.notes}</Line>}
      </ul>

      {/* One button to a line, full width, so the words always fit (the side panel is narrow). */}
      <div className="sticky bottom-0 -mx-4 grid gap-2 border-t border-line bg-surface px-4 pb-3 pt-3">
        {b.status === 'on_hold' && onConfirm && (
          <button type="button" className="btn btn-block btn-block-primary" onClick={() => onConfirm(b)} disabled={b.id < 0}>
            <Check size={20} weight="bold" aria-hidden="true" /> Confirm Booking
          </button>
        )}
        {/* A confirmed booking can go back on hold (the guest stays on it): right beside Delete. */}
        {(b.status === 'confirmed' || b.status === 'checked_in') && onPutOnHold && (
          <button type="button" className="btn btn-block btn-block-hold" onClick={() => onPutOnHold(b)} disabled={b.id < 0}>
            <Clock size={20} weight="bold" aria-hidden="true" /> Change to On Hold
          </button>
        )}
        <HoldButton
          className="btn btn-block btn-block-danger"
          title={b.status === 'on_hold' ? 'Hold to cancel this hold' : 'Hold to delete'}
          onConfirm={remove}
          disabled={removing || b.id < 0}
        >
          <Trash size={20} weight="bold" aria-hidden="true" /> {b.status === 'on_hold' ? 'Hold to Cancel' : 'Hold to Delete'}
        </HoldButton>
      </div>
    </div>
  );
}
