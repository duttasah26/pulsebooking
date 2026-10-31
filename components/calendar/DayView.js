import { useRef } from 'react';
import { useHoldStep, useSlide } from './useDaySlide';
import { CaretLeft, CaretRight, Clock, SignIn, SignOut } from '@phosphor-icons/react';
import { useSettings } from '../SettingsProvider';
import { formatTime } from '../TimeSelect';
import { roomShade } from '../../lib/colors';
import { addDays, dayOfMonth, diffDays, fmtDayMonth, fmtLong, fmtWeekday, isWeekend, nightsLabel, today } from '../../lib/dates';

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
  const bg = { arriving: 'bg-accent-soft', leaving: 'bg-danger-soft', staying: 'bg-surface', hold: 'bg-hold' }[hold ? 'hold' : tone];
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(b)}
        className={`flex min-h-16 w-full items-center gap-4 px-4 py-3 text-left transition-[filter] duration-150 hover:brightness-95 ${bg} ${hold ? 'border-y border-dashed border-hold-edge' : ''}`}
      >
        <RoomChip number={b.room_number} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold">{b.name}</span>
          <span className="block text-[0.9375rem] text-muted">{detail}</span>
        </span>
        <span className={`shrink-0 text-right text-base font-semibold ${tone === 'leaving' && !hold ? 'text-danger' : tone === 'arriving' && !hold ? 'text-accent-text' : ''}`}>
          {what}
          {hold && <span className="block text-sm font-semibold text-hold-ink">On hold</span>}
        </span>
      </button>
    </li>
  );
}

function Section({ title, count, icon: Icon, tone = '', empty, children }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <h3 className="t-headline flex items-center gap-2 border-b border-line px-4 py-3">
        {Icon && <Icon size={20} aria-hidden="true" className={tone} />} {title} <span className="ml-auto font-mono text-base text-muted">{count}</span>
      </h3>
      {count === 0 ? <p className="px-4 py-4 text-base text-muted">{empty}</p> : <ul className="divide-y divide-line">{children}</ul>}
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

  // The strip glides by the days it moved; the lists below glide in from the side you moved towards.
  const stripRef = useRef(null);
  const bodyRef = useRef(null);
  const delta = (from, to) => diffDays(from, to);
  useSlide(stripRef, date, { delta, unit: (el) => el.firstElementChild.offsetWidth + 4, max: 7, duration: 320 });
  useSlide(bodyRef, date, { delta, distance: 28, fade: true, duration: 360 });
  // Hold an arrow or a day card to keep moving that way.
  const hold = useHoldStep();

  return (
    <div className="space-y-4">
      {onDate && (
        <nav aria-label="Days" className="flex items-stretch gap-2">
          <button type="button" className="btn btn-quiet btn-icon h-auto shrink-0 self-stretch" aria-label="Day before" {...hold('prev', () => onDate(addDays(date, -1)))}>
            <CaretLeft size={22} aria-hidden="true" />
          </button>
          <div className="-m-1 min-w-0 flex-1 overflow-hidden p-1">
          <ol ref={stripRef} className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              const c = on(d);
              const sel = d === date;
              return (
                <li key={i}>
                  <button
                    type="button"
                    {...hold(`day-${i}`, () => onDate(addDays(date, Math.sign(i - 3))), () => onDate(d))}
                    aria-current={sel ? 'date' : undefined}
                    aria-label={`${fmtLong(d)}: ${c.arriving.length} arriving, ${c.leaving.length} leaving`}
                    className={`flex min-h-20 w-full flex-col items-center justify-center rounded-lg border-2 px-1 py-1 leading-tight select-none transition-[background-color,border-color] duration-150 ease-out ${
                      sel ? 'border-ink bg-surface shadow-sm' : `border-transparent ${isWeekend(d) ? 'bg-surface-2' : 'bg-surface'} hover:bg-surface-2`
                    } ${d === todayStr ? 'ring-2 ring-accent ring-offset-2' : ''}`}
                  >
                    <span className="text-sm text-muted">{fmtWeekday(d)}</span>
                    <span className="font-mono text-lg font-semibold">{dayOfMonth(d)}</span>
                    <span aria-hidden="true" className="flex gap-2 text-sm font-semibold max-sm:hidden">
                      <span className="text-accent-text">{c.arriving.length ? `+${c.arriving.length}` : ''}</span>
                      <span className="text-danger">{c.leaving.length ? `-${c.leaving.length}` : ''}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          </div>
          <button type="button" className="btn btn-quiet btn-icon h-auto shrink-0 self-stretch" aria-label="Day after" {...hold('next', () => onDate(addDays(date, 1)))}>
            <CaretRight size={22} aria-hidden="true" />
          </button>
        </nav>
      )}

      <div ref={bodyRef} className="space-y-4">
        <p className="sr-only" role="status" aria-live="polite">{fmtLong(date)}</p>
      <p className="px-1 text-base text-muted">
        <span className="font-semibold text-accent-text">{day.arriving.length} arriving</span>,{' '}
        <span className="font-semibold text-danger">{day.leaving.length} leaving</span>, {busy.size} rooms in use, {freeRooms.length} free
      </p>

      <div className="grid gap-4 lg:grid-cols-2" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ touchAction: 'pan-y' }}>
        <Section title="Arriving" count={day.arriving.length} icon={SignIn} tone="text-accent-text" empty="Nobody arrives this day.">
          {day.arriving.map((b) => (
            <Row key={b.id} b={b} tone="arriving" onOpen={onOpen} what={TIME(b.check_in_time, settings.checkInTime) ? `at ${TIME(b.check_in_time, settings.checkInTime)}` : 'Arriving'} detail={`${nightsLabel(b.nights)}, leaves ${fmtDayMonth(b.check_out)}`} />
          ))}
        </Section>
        <Section title="Leaving" count={day.leaving.length} icon={SignOut} tone="text-danger" empty="Nobody leaves this day.">
          {day.leaving.map((b) => (
            <Row key={b.id} b={b} tone="leaving" onOpen={onOpen} what={TIME(b.check_out_time, settings.checkOutTime) ? `by ${TIME(b.check_out_time, settings.checkOutTime)}` : 'Leaving'} detail={`Arrived ${fmtDayMonth(b.check_in)}, ${nightsLabel(b.nights)}`} />
          ))}
        </Section>
        <Section title="Staying tonight" count={day.staying.length} empty="Nobody is staying tonight.">
          {day.staying.map((b) => (
            <Row key={b.id} b={b} tone="staying" onOpen={onOpen} what={b.check_out === addDays(date, 1) ? 'Leaves tomorrow' : `Until ${fmtDayMonth(b.check_out)}`} detail={`${fmtDayMonth(b.check_in)} to ${fmtDayMonth(b.check_out)}`} />
          ))}
        </Section>
        <Section title="Free rooms" count={freeRooms.length} empty="Every room is taken.">
          <li className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-4">
            {freeRooms.map((r) => {
              const shade = roomShade(r, settings);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onCreate({ roomIds: [r.id], checkIn: date, checkOut: addDays(date, 1) })}
                  className="btn h-auto min-h-16 flex-col gap-1 px-1 py-2"
                  aria-label={`Room ${r.number} is free. Hold it for tonight`}
                  title="Hold this room for tonight"
                >
                  <span className="rounded-md px-2 font-mono text-base font-semibold" style={{ backgroundColor: shade.fill, boxShadow: `inset 0 0 0 1px ${shade.edge}` }}>{r.number}</span>
                  <span className="flex items-center gap-1 text-sm font-medium text-hold-ink"><Clock size={16} aria-hidden="true" /> Hold</span>
                </button>
              );
            })}
          </li>
        </Section>
      </div>
      </div>
    </div>
  );
}
