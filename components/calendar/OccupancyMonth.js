import { useEffect, useMemo, useRef, useState } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useSettings } from '../SettingsProvider';
import { roomShade } from '../../lib/colors';
import { addMonths, dayOfMonth, daysInMonth, diffDays, fmtDayMonth, fmtMonth, fmtMonthShort, isWeekend, monthStart, range, today, weekdayIndex } from '../../lib/dates';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FLOOR_NAME = { 1: '1st floor', 2: '2nd floor', 3: '3rd floor' };

/*
  The Occupancy tab: a month calendar where every day holds one dot for every room, grouped by floor in the floor colours
  (the same colours as the room numbers on the calendar).
    A filled dot is a room that is taken that night (a hold counts: it blocks the room). A hollow dot is a free room.
    So you see exactly which rooms are free, and how full each floor is, without reading a number.
    The strip on top: this month and the ones either side. Tap one to go there; the arrows or a swipe sideways on the
    calendar move one month. Today has a thick green ring. Tap a day to open it in the Day tab, which lists who is in.
*/
export default function OccupancyMonth({ date, rooms, bookings, onPickDay, onDate }) {
  const { settings } = useSettings();
  const first = monthStart(date);
  const days = range(first, daysInMonth(first));
  const todayStr = today();
  const total = rooms.length;

  // The rooms of each floor, in room order: [{ floor, rooms: [...] }].
  const floors = useMemo(() => {
    const byFloor = new Map();
    for (const r of [...rooms].sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true }))) {
      const f = String(r.number)[0];
      byFloor.set(f, [...(byFloor.get(f) ?? []), r]);
    }
    return [...byFloor.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([floor, list]) => ({ floor, rooms: list, shade: roomShade({ number: `${floor}01` }, settings) }));
  }, [rooms, settings]);

  // The rooms taken each night (on-hold ones count: they block the room).
  const taken = useMemo(() => {
    const sets = days.map(() => new Set());
    for (const b of bookings) {
      if (b.status === 'cancelled') continue;
      const from = Math.max(0, diffDays(first, b.check_in));
      const to = Math.min(days.length, diffDays(first, b.check_out));
      for (let i = from; i < to; i++) sets[i].add(b.room_id);
    }
    return sets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, first]);
  const counts = taken.map((s) => s.size);
  const fullest = counts.indexOf(Math.max(...counts));
  const quietest = counts.indexOf(Math.min(...counts));
  const average = total ? Math.round((counts.reduce((a, n) => a + n, 0) / (days.length * total)) * 100) : 0;

  // Swipe sideways on the calendar to change month (vertical scrolling is left alone).
  const swipe = useRef(null);
  const onTouchStart = (e) => { swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || !onDate) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) onDate(addMonths(first, dx < 0 ? 1 : -1));
  };

  const months = [-2, -1, 0, 1, 2].map((n) => addMonths(first, n));
  const lead = weekdayIndex(first);

  // The whole month fits on the screen without scrolling: the rows share the height left below the weekday names (less the
  // legend), and the dots and text get smaller or larger to suit the room each cell has.
  const rows = Math.ceil((lead + days.length) / 7);
  const gridRef = useRef(null);
  const [cellH, setCellH] = useState(null);
  useEffect(() => {
    const measure = () => {
      const el = gridRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const legend = window.innerWidth < 640 ? 88 : 64; // the legend under the grid, and the padding
      const left = window.innerHeight - top - legend - 12;
      setCellH(Math.max(44, Math.floor((left - (rows - 1) * 6) / rows)));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [rows, onDate]);
  // Three densities, by how tall a cell is.
  const tight = cellH !== null && cellH < 62;
  const roomy = cellH === null || cellH >= 100;
  const dot = tight ? 4 : roomy ? 12 : 8;
  const gapX = tight ? 1.5 : roomy ? 8 : 5;
  const gapY = tight ? 2 : roomy ? 8 : 4;

  return (
    <div className="space-y-3">
      {onDate && (
        <nav aria-label="Months" className="flex items-stretch gap-1.5">
          <button type="button" className="btn btn-icon min-h-10 min-w-10 shrink-0 border-transparent" aria-label="Month before" onClick={() => onDate(addMonths(first, -1))}>
            <CaretLeft size={22} aria-hidden="true" />
          </button>
          <ol className="grid min-w-0 flex-1 grid-cols-5 gap-1">
            {months.map((m) => {
              const sel = m === first;
              return (
                <li key={m}>
                  <button
                    type="button"
                    onClick={() => onDate(m)}
                    aria-current={sel ? 'date' : undefined}
                    className={`flex min-h-11 w-full flex-col items-center justify-center rounded-lg border px-0.5 leading-tight ${sel ? 'border-ink bg-surface font-semibold' : 'border-transparent hover:bg-surface-2'} ${m === monthStart(todayStr) ? 'ring-2 ring-accent ring-offset-1' : ''}`}
                  >
                    <span className="text-base">{fmtMonthShort(m)}</span>
                    <span className="text-xs text-muted">{m.slice(0, 4)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <button type="button" className="btn btn-icon min-h-10 min-w-10 shrink-0 border-transparent" aria-label="Month after" onClick={() => onDate(addMonths(first, 1))}>
            <CaretRight size={22} aria-hidden="true" />
          </button>
        </nav>
      )}

      <p className="px-1 text-base">
        <strong className="font-semibold">{fmtMonth(first)}</strong>
        <span className="text-ink/80">
          : {average}% full on average. Fullest day {fmtDayMonth(days[fullest])} ({counts[fullest]} of {total} rooms), quietest {fmtDayMonth(days[quietest])} ({counts[quietest]}).
        </span>
      </p>

      <div className="rounded-lg border border-line bg-surface p-2" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ touchAction: 'pan-y' }}>
        <div className="grid grid-cols-7 gap-1.5 pb-1 text-center text-sm text-muted">
          {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
        </div>
        <div ref={gridRef} className="grid grid-cols-7 gap-1.5" style={cellH ? { gridAutoRows: `${cellH}px` } : undefined}>
          {Array.from({ length: lead }, (_, i) => <span key={`pad-${i}`} />)}
          {days.map((d, i) => {
            const isToday = d === todayStr;
            return (
              <button
                key={d}
                type="button"
                onClick={() => onPickDay(d)}
                aria-label={`${fmtDayMonth(d)}: ${counts[i]} of ${total} rooms taken, ${Math.max(0, total - counts[i])} free`}
                className={`cell flex min-h-0 flex-col items-start justify-between gap-0.5 overflow-hidden rounded-lg border text-left ${tight ? 'p-1' : 'p-1.5 sm:p-2'} ${isWeekend(d) ? 'bg-surface-2/60' : ''} ${d < todayStr ? 'opacity-70' : ''} ${isToday ? 'border-2 border-accent' : 'border-transparent hover:border-line'}`}
              >
                <span className="flex w-full items-baseline justify-between gap-1">
                  <span className={`font-mono leading-none ${tight ? 'text-sm' : 'text-base sm:text-lg'} ${isToday ? 'font-bold text-accent-text' : 'font-semibold'}`}>{dayOfMonth(d)}</span>
                  <span className="font-mono text-xs leading-none text-ink/70 sm:text-sm">{counts[i]}/{total}</span>
                </span>
                <span className="flex flex-col" style={{ gap: gapY }} aria-hidden="true">
                  {floors.map(({ floor, rooms: list, shade }) => (
                    <span key={floor} className="flex" style={{ gap: gapX }}>
                      {list.map((r) => (
                        <span
                          key={r.id}
                          className="block shrink-0 rounded-full"
                          style={{ width: dot, height: dot, ...(taken[i].has(r.id) ? { backgroundColor: shade.edge } : { boxShadow: `inset 0 0 0 1px ${shade.edge}` }) }}
                        />
                      ))}
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pt-2 text-sm" aria-label="What the dots mean">
          <li className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-ink" aria-hidden="true" /> Room taken</li>
          <li className="flex items-center gap-1.5"><span className="size-3 rounded-full" style={{ boxShadow: 'inset 0 0 0 1px var(--ink)' }} aria-hidden="true" /> Room free</li>
          {floors.map(({ floor, shade }) => (
            <li key={floor} className="flex items-center gap-1.5">
              <span className="size-3 rounded-full" style={{ backgroundColor: shade.edge }} aria-hidden="true" /> {FLOOR_NAME[floor] ?? `Floor ${floor}`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
