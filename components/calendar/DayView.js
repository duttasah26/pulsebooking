import { ArrowDownLeft, ArrowUpRight, Bed, Plus } from '@phosphor-icons/react';
import { addDays, fmtDayMonth, nightsLabel } from '../../lib/dates';

function Section({ title, count, icon: Icon, children, empty }) {
  return (
    <section className="rounded-lg border border-line bg-surface">
      <h3 className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-semibold">
        <Icon size={18} /> {title} <span className="font-mono text-muted">{count}</span>
      </h3>
      {count === 0 ? <p className="px-4 py-3 text-sm text-muted">{empty}</p> : <ul className="divide-y divide-line">{children}</ul>}
    </section>
  );
}

function Row({ b, detail, onOpen }) {
  return (
    <li>
      <button type="button" onClick={() => onOpen(b)} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-surface-2">
        <span className="min-w-0">
          <span className="block truncate font-medium">{b.name}</span>
          <span className="block truncate text-sm text-muted">{detail}</span>
        </span>
        <span className="shrink-0 font-mono text-sm font-semibold">Room {b.room_number}</span>
      </button>
    </li>
  );
}

// Front-desk view for one date: who arrives, who leaves, who is in, which rooms are free.
export default function DayView({ date, rooms, bookings, onOpen, onCreate }) {
  const live = bookings.filter((b) => b.status !== 'cancelled'); // on-hold bookings count: they block the room
  const arriving = live.filter((b) => b.check_in === date);
  const departing = live.filter((b) => b.check_out === date);
  const inHouse = live.filter((b) => b.check_in <= date && b.check_out > date);
  const busy = new Set(inHouse.map((b) => b.room_id));
  const freeRooms = rooms.filter((r) => !busy.has(r.id));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Arriving" count={arriving.length} icon={ArrowDownLeft} empty="No arrivals.">
        {arriving.map((b) => (
          <Row key={b.id} b={b} onOpen={onOpen} detail={`${nightsLabel(b.nights)}, leaves ${fmtDayMonth(b.check_out)}`} />
        ))}
      </Section>
      <Section title="Departing" count={departing.length} icon={ArrowUpRight} empty="No departures.">
        {departing.map((b) => (
          <Row key={b.id} b={b} onOpen={onOpen} detail={`Arrived ${fmtDayMonth(b.check_in)}`} />
        ))}
      </Section>
      <Section title="In house tonight" count={inHouse.length} icon={Bed} empty="Nobody is staying tonight.">
        {inHouse.map((b) => (
          <Row key={b.id} b={b} onOpen={onOpen} detail={`${fmtDayMonth(b.check_in)} to ${fmtDayMonth(b.check_out)}`} />
        ))}
      </Section>
      <Section title="Free tonight" count={freeRooms.length} icon={Plus} empty="Every room is taken.">
        {freeRooms.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onCreate({ roomIds: [r.id], checkIn: date, checkOut: addDays(date, 1) })}
              className="flex min-h-14 w-full items-center justify-between px-4 py-2 text-left hover:bg-surface-2"
            >
              <span className="font-mono font-semibold">Room {r.number}</span>
              <span className="flex items-center gap-1 text-sm font-medium text-accent"><Plus size={16} /> Book</span>
            </button>
          </li>
        ))}
      </Section>
    </div>
  );
}
