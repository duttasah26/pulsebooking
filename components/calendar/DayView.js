import { useRef } from 'react';
import { ArrowDownLeft, ArrowUpRight, Bed, CaretLeft, CaretRight, Clock, Plus } from '@phosphor-icons/react';
import { useSettings } from '../SettingsProvider';
import { formatTime } from '../TimeSelect';
import { roomShade } from '../../lib/colors';
import { addDays, dayOfMonth, fmtDayMonth, fmtLong, fmtWeekday, isWeekend, nightsLabel, today } from '../../lib/dates';

/*
  The Day tab: the front desk's view of one date, with a strip of days to move through.
    The strip: three days before and three after, each with how many arrive and leave. Tap one to go there; the arrows or a
    swipe sideways on the lists move one day. Today has a green ring.
    The lists: Arriving, Leaving, Staying tonight, Free rooms. Every room is a chip in its floor colour (as on the calendar).
    Every line says what is happening in plain words and its own colour: arriving green, leaving red (the check-out colour),
    staying plain, on hold yellow with a dashed edge.
*/

const TIME = (value, fallback) => {
  const t = value || fallback;
  return t ? formatTime(String(t).slice(0, 5)) : '';
};

function RoomChip({ number }) {
  const { settings } = useSettings();
  const shade = roomShade({ number }, settings);
  return (
    <span className="inline-flex min-w-16 shrink-0 items-center justify-center rounded-md px-2 py-1 font-mono text-base font-semibold" style={{ backgroundColor: shade.fill, boxShadow: `inset 0 0 0 1px ${shade.edge}` }}>
      {number}
    </span>
  );
}

// A booking line. `tone` tints the whole line (arriving green, leaving red, hold yellow); `what` is the plain-words state.
function Row({ b, tone, what, detail, onOpen }) {
  const hold = b.status === 'on_hold';
  const bg = { arriving: 'bg-accent-soft', leaving: 'bg-red-50', staying: 'bg-surface', hold: 'bg-amber-50' }[hold ? 'hold' : tone];
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(b)}
        className={`flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left hover:brightness-95 ${bg} ${hold ? 'border-y border-dashed border-amber-400' : ''}`}
      >
        <RoomChip number={b.room_number} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold">{b.name}</span>
          <span className="block text-base text-ink/80">{detail}</span>
        </span>
        <span className={`shrink-0 text-right text-base font-semibold ${tone === 'leaving' && !hold ? 'text-danger' : tone === 'arriving' && !hold ? 'text-accent-text' : ''}`}>
          {what}
          {hold && <span className="block text-sm font-medium text-amber-700">On hold</span>}
        </span>
      </button>
    </li>
  );
}

function Section({ title, count, icon: Icon, empty, children }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <h3 className="flex items-center gap-2 border-b border-line px-3 py-2.5 text-lg font-semibold">
        <Icon size={20} aria-hidden="true" /> {title} <span className="font-mono text-base text-muted">{count}</span>
      </h3>
      {count === 0 ? <p className="px-3 py-3 text-base text-muted">{empty}</p> : <ul className="divide-y divide-line">{children}</ul>}
    </section>
  );
}

export default function DayView({ date, rooms, bookings, onOpen, onCreate, onDate }) {
  const { settings } = useSettings();
  const live = bookings.filter((b) => b.status !== 'cancelled'); // on-hold bookings count: they block the room
  const on = (d) => ({
    arriving: live.filter((b) => b.check_in === d),
    leaving: live.filter((b) => b.check_out === d),
    staying: live.filter((b) => b.check_in <= d && b.check_out > d),
  });
  const day = on(date);
  const busy = new Set(day.staying.map((b) => b.room_id));
  const freeRooms = rooms.filter((r) => !busy.has(r.id));
  const todayStr = today();

  // Swipe sideways on the lists to move a day (vertical scrolling is left alone).
  const swipe = useRef(null);
  const onTouchStart = (e) => { swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || !onDate) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) onDate(addDays(date, dx < 0 ? 1 : -1));
  };

  const days = Array.from({ length: 7 }, (_, i) => addDays(date, i - 3));

  return (
    <div className="space-y-3">
      {onDate && (
        <nav aria-label="Days" className="flex items-stretch gap-1.5">
          <button type="button" className="btn btn-icon min-h-14 min-w-11 shrink-0 border-transparent" aria-label="Day before" onClick={() => onDate(addDays(date, -1))}>
            <CaretLeft size={22} aria-hidden="true" />
          </button>
          <ol className="grid min-w-0 flex-1 grid-cols-7 gap-1">
            {days.map((d) => {
              const c = on(d);
              const sel = d === date;
              return (
                <li key={d}>
                  <button
                    type="button"
                    onClick={() => onDate(d)}
                    aria-current={sel ? 'date' : undefined}
                    aria-label={`${fmtLong(d)}: ${c.arriving.length} arriving, ${c.leaving.length} leaving`}
                    className={`flex min-h-16 w-full flex-col items-center justify-center rounded-lg border-2 px-0.5 py-1 leading-tight ${
                      sel ? 'border-ink bg-surface' : `border-transparent ${isWeekend(d) ? 'bg-surface-2' : 'bg-surface'} hover:bg-surface-2`
                    } ${d === todayStr ? 'ring-2 ring-accent ring-offset-1' : ''}`}
                  >
                    <span className="text-sm text-muted">{fmtWeekday(d)}</span>
                    <span className="font-mono text-lg font-semibold">{dayOfMonth(d)}</span>
                    <span className="flex gap-1.5 text-xs font-semibold">
                      <span className="text-accent-text">{c.arriving.length ? `+${c.arriving.length}` : ''}</span>
                      <span className="text-danger">{c.leaving.length ? `-${c.leaving.length}` : ''}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <button type="button" className="btn btn-icon min-h-14 min-w-11 shrink-0 border-transparent" aria-label="Day after" onClick={() => onDate(addDays(date, 1))}>
            <CaretRight size={22} aria-hidden="true" />
          </button>
        </nav>
      )}

      <p className="px-1 text-base">
        <strong className="font-semibold">{fmtLong(date)}</strong>
        <span className="text-ink/80">
          : <span className="font-semibold text-accent-text">{day.arriving.length} arriving</span>,{' '}
          <span className="font-semibold text-danger">{day.leaving.length} leaving</span>, {busy.size} rooms in use, {freeRooms.length} free
        </span>
      </p>

      <div className="grid gap-3 lg:grid-cols-2" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ touchAction: 'pan-y' }}>
        <Section title="Arriving" count={day.arriving.length} icon={ArrowDownLeft} empty="Nobody arrives this day.">
          {day.arriving.map((b) => (
            <Row key={b.id} b={b} tone="arriving" onOpen={onOpen} what={TIME(b.check_in_time, settings.checkInTime) ? `at ${TIME(b.check_in_time, settings.checkInTime)}` : 'Arriving'} detail={`${nightsLabel(b.nights)}, leaves ${fmtDayMonth(b.check_out)}`} />
          ))}
        </Section>
        <Section title="Leaving" count={day.leaving.length} icon={ArrowUpRight} empty="Nobody leaves this day.">
          {day.leaving.map((b) => (
            <Row key={b.id} b={b} tone="leaving" onOpen={onOpen} what={TIME(b.check_out_time, settings.checkOutTime) ? `by ${TIME(b.check_out_time, settings.checkOutTime)}` : 'Leaving'} detail={`Arrived ${fmtDayMonth(b.check_in)}, ${nightsLabel(b.nights)}`} />
          ))}
        </Section>
        <Section title="Staying tonight" count={day.staying.length} icon={Bed} empty="Nobody is staying tonight.">
          {day.staying.map((b) => (
            <Row key={b.id} b={b} tone="staying" onOpen={onOpen} what={b.check_out === addDays(date, 1) ? 'Leaves tomorrow' : `Until ${fmtDayMonth(b.check_out)}`} detail={`${fmtDayMonth(b.check_in)} to ${fmtDayMonth(b.check_out)}`} />
          ))}
        </Section>
        <Section title="Free rooms" count={freeRooms.length} icon={Plus} empty="Every room is taken.">
          <li className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-4">
            {freeRooms.map((r) => {
              const shade = roomShade(r, settings);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onCreate({ roomIds: [r.id], checkIn: date, checkOut: addDays(date, 1) })}
                  className="flex min-h-14 flex-col items-center justify-center rounded-lg border-2 px-1 py-1 hover:brightness-95"
                  style={{ backgroundColor: shade.fill, borderColor: shade.edge }}
                  aria-label={`Room ${r.number} is free. Hold it for tonight`}
                >
                  <span className="font-mono text-lg font-semibold">{r.number}</span>
                  <span className="flex items-center gap-1 text-sm font-semibold"><Clock size={14} aria-hidden="true" /> Hold</span>
                </button>
              );
            })}
          </li>
        </Section>
      </div>
    </div>
  );
}
