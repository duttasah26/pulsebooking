import { useEffect, useRef, useState } from 'react';
import { CaretLeft, CaretRight, SignIn, SignOut } from '@phosphor-icons/react';
import { useSettings } from './SettingsProvider';
import { stayColor } from '../lib/colors';
import {
  addDays, addMonths, dayOfMonth, daysInMonth, diffDays, fmtMonth, fmtShort, monthStart, nightsLabel, range, today, weekdayIndex,
} from '../lib/dates';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/*
  Visual range picker. Tap check-in, then tap check-out.
  isBusy(date) says whether the selected room(s) are taken that night. Busy nights are hatched and
  cannot start or be inside a stay, but a busy day CAN be the check-out day (same-day turnover).
  inclusive: for choosing a span of days to look at (the calendar's Go to) rather than a stay. Tap the first day, then
  the last day (the same day again is allowed). The value is still (first, day after last), so onChange(a, b) means
  the days a up to b - 1, and the last day is the one highlighted as the end.
*/
// One end of the stay: icon and label (plain, no colour), then the date in large type. Same layout as the booking details.
// The check-out date is red, so the day they leave stands out.
function End({ icon: Icon, label, date, out = false }) {
  return (
    <div className="bg-surface p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium uppercase tracking-wide text-muted lg:text-xs">
        <Icon size={14} aria-hidden="true" /> {label}
      </p>
      <p className={`mt-1 text-lg font-semibold leading-tight ${out && date ? 'text-danger' : ''}`}>{date ? fmtShort(date) : 'Pick a day'}</p>
    </div>
  );
}

export default function DateRangePicker({ checkIn, checkOut, onChange, isBusy = () => false, inclusive = false }) {
  const [view, setView] = useState(monthStart(checkIn || today()));
  const [awaitingEnd, setAwaitingEnd] = useState(false);
  const todayStr = today();
  const { settings } = useSettings();
  const inColor = stayColor('checkIn', settings); // check-in blue, check-out green (changeable in Settings)
  const outColor = stayColor('checkOut', settings);

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
  const lastDay = checkOut ? (inclusive ? addDays(checkOut, -1) : checkOut) : null; // the day drawn as the end of the range
  const words = inclusive
    ? { start: 'first day', end: 'last day', pickStart: 'Pick the first day', pickEnd: 'Now pick the last day', unit: (n) => `${n} day${n === 1 ? '' : 's'}` }
    : { start: 'check-in', end: 'check-out', pickStart: 'Pick a check-in day', pickEnd: 'Now pick the check-out day', unit: nightsLabel };

  // Every night from checkIn up to (not including) `d` must be free.
  const clearThrough = (d) => {
    for (let k = checkIn; k < d; k = addDays(k, 1)) if (isBusy(k)) return false;
    return true;
  };

  const pick = (d) => {
    if (inclusive && awaitingEnd && d >= checkIn) {
      own.current = true;
      onChange(checkIn, addDays(d, 1));
      setAwaitingEnd(false);
      return;
    }
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
    <div className="space-y-2">
      <div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
          <End icon={SignIn} label={inclusive ? 'First day' : 'Check-in'} date={checkIn} />
          <End icon={SignOut} label={inclusive ? 'Last day' : 'Check-out'} date={awaitingEnd ? null : lastDay} out />
        </div>
        <p className="mt-1 text-center text-sm text-muted lg:text-xs" aria-live="polite">
          {awaitingEnd ? <span className="text-accent-text">{words.pickEnd}</span> : checkIn && checkOut ? words.unit(nights) : words.pickStart}
        </p>
      </div>

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
          const isEnd = d === lastDay;
          const inside = checkIn && lastDay && d > checkIn && d < lastDay;
          const busy = isBusy(d);
          const blockedEnd = awaitingEnd && d > checkIn && !clearThrough(d);
          const disabled = awaitingEnd ? (d < checkIn || (d === checkIn && !inclusive) ? busy : blockedEnd) : busy;
          let tone = 'text-ink hover:bg-surface-2';
          if (isStart || isEnd) tone = 'border-2 font-semibold text-ink';
          else if (inside) tone = 'bg-accent-soft text-ink';
          else if (busy) tone = 'hatch text-muted';
          return (
            <button
              key={d}
              type="button"
              disabled={disabled && !isStart && !isEnd}
              onClick={() => pick(d)}
              aria-label={`${fmtShort(d)}${isStart ? `, ${words.start}` : isEnd ? `, ${words.end}` : busy ? ', booked' : ''}`}
              aria-pressed={isStart || isEnd}
              style={isStart || isEnd ? { backgroundColor: (isStart ? inColor : outColor).bg, borderColor: (isStart ? inColor : outColor).border } : undefined}
              className={`cell mx-auto flex size-10 items-center justify-center rounded-lg font-mono text-sm transition-colors lg:size-6 lg:text-xs disabled:cursor-not-allowed disabled:opacity-40 ${tone} ${
                d === todayStr && !isStart && !isEnd ? 'ring-1 ring-accent' : ''
              }`}
            >
              {dayOfMonth(d)}
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}
