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
// One end of the stay: icon and label, then the date in large type. Same layout as the booking details. It is a button:
// tap it to change that end of the stay (the active one is outlined in green). The check-out date is red.
function End({ icon: Icon, label, date, out = false, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`Change ${label.toLowerCase()}`}
      className={`bg-surface p-3 text-left transition-colors hover:bg-surface-2 ${active ? 'relative z-10 outline outline-2 -outline-offset-2 outline-accent' : ''}`}
    >
      <span className="flex items-center gap-1.5 text-base font-semibold text-ink/70">
        <Icon size={16} aria-hidden="true" /> {label}
      </span>
      <span key={date ?? 'none'} className={`animate-tick mt-1 block text-lg font-semibold leading-tight ${out && date ? 'text-danger' : ''}`}>{date ? fmtShort(date) : 'Pick a day'}</span>
    </button>
  );
}

export default function DateRangePicker({ checkIn, checkOut, onChange, isBusy = () => false, inclusive = false }) {
  const [view, setView] = useState(monthStart(checkIn || today()));
  const [awaitingEnd, setAwaitingEnd] = useState(false);
  const [editStart, setEditStart] = useState(false); // the Check-in box was tapped: the next day tapped is the new check-in
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
    setEditStart(false);
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

  // Is every night from `a` up to (not including) `b` free?
  const freeBetween = (a, b) => {
    for (let k = a; k < b; k = addDays(k, 1)) if (isBusy(k)) return false;
    return true;
  };

  // A tap does what it says on the screen. After the Check-in box: the new check-in (the check-out stays if it still fits).
  // With a check-in already chosen: a later day is the check-out, and tapping another later day moves the check-out
  // instead of starting over. Only a day on or before the check-in starts a new range.
  const pick = (d) => {
    own.current = true;
    if (editStart) {
      if (isBusy(d)) { own.current = false; return; }
      const keep = checkOut && checkOut > d && freeBetween(d, checkOut);
      onChange(d, keep ? checkOut : addDays(d, 1));
      setEditStart(false);
      setAwaitingEnd(false);
      return;
    }
    const laterOk = inclusive ? d >= checkIn : d > checkIn;
    if (checkIn && (awaitingEnd || checkOut) && laterOk && (inclusive || clearThrough(d))) {
      onChange(checkIn, inclusive ? addDays(d, 1) : d);
      setAwaitingEnd(false);
      return;
    }
    if (isBusy(d)) { own.current = false; return; }
    onChange(d, addDays(d, 1));
    setAwaitingEnd(true);
  };

  return (
    <div className="space-y-2">
      <div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
          <End icon={SignIn} label={inclusive ? 'First day' : 'Check-in'} date={checkIn} active={editStart} onClick={() => { setEditStart(true); setAwaitingEnd(false); }} />
          <End icon={SignOut} label={inclusive ? 'Last day' : 'Check-out'} date={awaitingEnd ? null : lastDay} out active={awaitingEnd && !editStart} onClick={() => { setEditStart(false); setAwaitingEnd(true); }} />
        </div>
        <p className="mt-1 text-center text-base text-muted" aria-live="polite">
          {editStart ? <span className="text-accent-text">{inclusive ? 'Now pick the new first day' : 'Now pick the new check-in day'}</span> : awaitingEnd ? <span className="text-accent-text">{words.pickEnd}</span> : checkIn && checkOut ? words.unit(nights) : words.pickStart}
        </p>
      </div>

      <div className="rounded-lg border border-line p-3">
      <div className="mb-1 flex items-center justify-between">
        <button type="button" className="btn btn-icon" onClick={() => setView(addMonths(view, -1))} aria-label="Previous month">
          <CaretLeft size={18} />
        </button>
        <span className="text-base font-semibold" aria-live="polite">{fmtMonth(view)}</span>
        <button type="button" className="btn btn-icon" onClick={() => setView(addMonths(view, 1))} aria-label="Next month">
          <CaretRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-sm text-muted">
        {WEEKDAYS.map((w) => <span key={w} className="pb-1">{w}</span>)}
        {Array.from({ length: weekdayIndex(view) }, (_, i) => <span key={`pad-${i}`} />)}
        {days.map((d) => {
          const isStart = d === checkIn;
          const isEnd = d === lastDay;
          const inside = checkIn && lastDay && d > checkIn && d < lastDay;
          const busy = isBusy(d);
          const blockedEnd = awaitingEnd && d > checkIn && !clearThrough(d);
          const disabled = awaitingEnd ? (d < checkIn || (d === checkIn && !inclusive) ? busy : blockedEnd) : busy && !(checkIn && d > checkIn);
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
              className={`cell mx-auto flex size-11 items-center justify-center rounded-lg font-mono text-base lg:size-10 transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${tone} ${
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
