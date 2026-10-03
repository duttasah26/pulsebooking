import {
  Baby, Bed, Buildings, CalendarBlank, Envelope, Megaphone, Note, Phone, Receipt, SignIn, SignOut, Trash, Users,
} from '@phosphor-icons/react';
import StatusBadge from '../StatusBadge';
import HistoryList from './HistoryList';
import { useRemoveBooking } from './useRemoveBooking';
import { formatTime } from '../TimeSelect';
import { colorFor } from '../../lib/colors';
import { useApi } from '../../lib/useApi';
import { fmtShort, nightsLabel } from '../../lib/dates';

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
export default function BookingDetails({ booking: b, group, onRemove, onSaved, onDone, onRemoved }) {
  const targets = group && group.length > 1 ? group : [b];
  const { remove, removing } = useRemoveBooking({ booking: b, targets, onRemove, onSaved, onDone: onRemoved ?? onDone });
  const history = useApi(b.id > 0 ? `/api/bookings/${b.id}` : null).data?.history ?? [];
  const c = colorFor(b);
  const times = [b.check_in_time && `in ${formatTime(b.check_in_time)}`, b.check_out_time && `out ${formatTime(b.check_out_time)}`].filter(Boolean);

  return (
    <div className="space-y-3 pb-4">
      <div className="rounded-lg border p-3" style={{ backgroundColor: c.bg, borderColor: c.border }}>
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 break-words text-base font-medium">{b.name}</p>
          <StatusBadge status={b.status} />
        </div>
        <ul className="mt-1.5 space-y-1 text-sm">
          {b.phone && <Line icon={Phone}>{b.phone}</Line>}
          {b.email && <Line icon={Envelope}>{b.email}</Line>}
          {b.organization && <Line icon={Buildings}>{b.organization}</Line>}
          {!b.guest_id && <li>No guest yet. Use the pencil to add one.</li>}
        </ul>
      </div>

      <ul className="space-y-2 text-sm">
        <Line icon={Bed}>Room {targets.map((t) => t.room_number).join(', ')}</Line>
        <Line icon={CalendarBlank}>
          {fmtShort(b.check_in)} to {fmtShort(b.check_out)}
          <span className="text-muted">, {nightsLabel(b.nights)}</span>
        </Line>
        {times.length > 0 && <Line icon={b.check_in_time ? SignIn : SignOut}>{times.join(', ')}</Line>}
        <Line icon={Users}>
          {b.adults} {b.adults === 1 ? 'adult' : 'adults'}
          {b.children > 0 && (
            <>
              , <Baby size={14} aria-hidden="true" className="inline align-text-bottom" /> {b.children} {b.children === 1 ? 'child' : 'children'}
            </>
          )}
        </Line>
        <Line icon={Megaphone}>Booked via {b.channel}</Line>
        <Line icon={Receipt}>{b.rate_plan}</Line>
        {b.notes && <Line icon={Note}>{b.notes}</Line>}
      </ul>

      <HistoryList history={history} />

      <button type="button" className="btn btn-danger" onClick={remove} disabled={removing || b.id < 0}>
        <Trash size={18} aria-hidden="true" /> Delete
      </button>
    </div>
  );
}
