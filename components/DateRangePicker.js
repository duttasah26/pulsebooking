import { useEffect, useRef, useState } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import {
  addDays, addMonths, dayOfMonth, daysInMonth, diffDays, fmtMonth, fmtShort, monthStart, nightsLabel, range, today, weekdayIndex,
} from '../lib/dates';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/*
  Visual range picker. Tap check-in, then tap check-out.
  isBusy(date) says whether the selected room(s) are taken that night. Busy nights are hatched and
  cannot start or be inside a stay, but a busy day CAN be the check-out day (same-day turnover).
*/
export default function DateRangePicker({ checkIn, checkOut, onChange, isBusy = () => false }) {
  const [view, setView] = useState(monthStart(checkIn || today()));
  const [awaitingEnd, setAwaitingEnd] = useState(false);
  const todayStr = today();

  // Follow the selection when it changes from outside (a drag on the grid), not from this picker's own picks.
  const own = useRef(false);
  useEffect(() => {
    if (own.current) {
      own.current = false;
      return;
    }
    if (checkIn) setView(monthStart(checkIn));
    setAwaitingEnd(false);
  }, [checkIn, checkOut]);

  const days = range(view, daysInMonth(view));
  const nights = checkIn && checkOut ? diffDays(checkIn, checkOut) : 0;

  // Every night from checkIn up to (not including) `d` must be free.
  const clearThrough = (d) => {
    for (let k = checkIn; k < d; k = addDays(k, 1)) if (isBusy(k)) return false;
    return true;
  };

  const pick = (d) => {
    if (awaitingEnd && d > checkIn && clearThrough(d)) {
      own.current = true;
      onChange(checkIn, d);
      setAwaitingEnd(false);
      return;
    }
    if (isBusy(d)) return;
    own.current = true;
    onChange(d, addDays(d, 1));
    setAwaitingEnd(true);
  };

  return (
    <div className="rounded-lg border border-line p-3 lg:p-2">
      <div className="mb-1 flex items-center justify-between">
        <button type="button" className="btn btn-icon" onClick={() => setView(addMonths(view, -1))} aria-label="Previous month">
          <CaretLeft size={18} />
        </button>
        <span className="text-sm font-semibold" aria-live="polite">{fmtMonth(view)}</span>
        <button type="button" className="btn btn-icon" onClick={() => setView(addMonths(view, 1))} aria-label="Next month">
          <CaretRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-xs text-muted lg:gap-y-0">
        {WEEKDAYS.map((w) => <span key={w} className="pb-1 lg:pb-0.5">{w}</span>)}
        {Array.from({ length: weekdayIndex(view) }, (_, i) => <span key={`pad-${i}`} />)}
        {days.map((d) => {
          const isStart = d === checkIn;
          const isEnd = d === checkOut;
          const inside = checkIn && checkOut && d > checkIn && d < checkOut;
          const busy = isBusy(d);
          const blockedEnd = awaitingEnd && d > checkIn && !clearThrough(d);
          const disabled = awaitingEnd ? (d <= checkIn ? busy : blockedEnd) : busy;
          let tone = 'text-ink hover:bg-surface-2';
          if (isStart || isEnd) tone = 'bg-accent text-accent-ink hover:bg-accent';
          else if (inside) tone = 'bg-accent-soft text-ink';
          else if (busy) tone = 'hatch text-muted';
          return (
            <button
              key={d}
              type="button"
              disabled={disabled && !isStart && !isEnd}
              onClick={() => pick(d)}
              aria-label={`${fmtShort(d)}${isStart ? ', check-in' : isEnd ? ', check-out' : busy ? ', booked' : ''}`}
              aria-pressed={isStart || isEnd}
              className={`cell mx-auto flex size-10 items-center justify-center rounded-lg font-mono text-sm transition-colors lg:size-7 lg:text-xs disabled:cursor-not-allowed disabled:opacity-40 ${tone} ${
                d === todayStr && !isStart && !isEnd ? 'ring-1 ring-accent' : ''
              }`}
            >
              {dayOfMonth(d)}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-sm lg:mt-1 lg:text-xs" aria-live="polite">
        {checkIn && checkOut ? (
          <>
            <span className="font-medium">{fmtShort(checkIn)}</span> to <span className="font-medium">{fmtShort(checkOut)}</span>
            <span className="text-muted">, {nightsLabel(nights)}</span>
          </>
        ) : (
          <span className="text-muted">Pick a check-in day</span>
        )}
        {awaitingEnd && <span className="block text-accent-text">Now pick the check-out day</span>}
      </p>
    </div>
  );
}
