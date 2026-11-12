import { useEffect, useRef, useState } from 'react';
import { CalendarBlank, CaretLeft, CaretRight, SignIn, SignOut } from '@phosphor-icons/react';
import { useSettings } from './SettingsProvider';
import { stayColor } from '../lib/colors';
import { parseSpan } from '../lib/naturalDate';
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
      className={`rounded-lg bg-surface-2 p-4 text-left transition-colors hover:bg-surface-3 ${active ? 'outline outline-2 -outline-offset-2 outline-ink' : ''}`}
    >
      <span className="t-group block">{label}</span>
      <span key={date ?? 'none'} className={`mt-1 block text-xl font-bold leading-tight tabular-nums ${out && date ? 'text-danger' : ''}`}>{date ? fmtShort(date) : 'Pick a day'}</span>
    </button>
  );
}

// single: choose one day (onChange(day, day + 1)); min / max (YYYY-MM-DD) grey out days outside them. Above the calendar a line takes
// plain words ("next fri", "dec 1 to dec 5", "fri for 3 nights"): the calendar turns to the day as you type and Enter picks it.
export default function DateRangePicker({ checkIn, checkOut, onChange, isBusy = () => false, inclusive = false, single = false, min, max }) {
  const [view, setView] = useState(monthStart(checkIn || today()));
  const [typedText, setTypedText] = useState('');
  const typed = typedText.trim() ? parseSpan(typedText) : null;
  const outside = (d) => (min && d < min) || (max && d > max);
  const typedOk = typed && !outside(typed.from) && !outside(typed.to);
  useEffect(() => {
    if (typedOk) setView(monthStart(typed.from));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typedOk && typed.from]);
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
  const lastDay = single ? null : checkOut ? (inclusive ? addDays(checkOut, -1) : checkOut) : null; // the day drawn as the end of the range
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
    if (outside(d)) return;
    if (single) {
      own.current = true;
      onChange(d, addDays(d, 1));
      return;
    }
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

  // Enter on the typed words: a single day is a tap on that day; two ends set the whole stay (or span), if it fits.
  const applyTyped = () => {
    if (!typedOk) return;
    const { from, to } = typed;
    if (single || from === to) {
      pick(from);
    } else if (inclusive ? true : freeBetween(from, to)) {
      own.current = true;
      onChange(from, inclusive ? addDays(to, 1) : to);
      setAwaitingEnd(false);
      setEditStart(false);
    } else {
      return;
    }
    setTypedText('');
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <CalendarBlank size={20} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          className="field w-full pl-11"
          value={typedText}
          onChange={(e) => setTypedText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); applyTyped(); } else if (e.key === 'Escape' && typedText) { e.stopPropagation(); setTypedText(''); } }}
          placeholder={single ? 'tomorrow, next fri, dec 1…' : 'next fri, dec 1 to dec 5, fri for 3 nights…'}
          aria-label="Type a date"
          aria-invalid={typedText.trim() && !typedOk ? true : undefined}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
        />
      </div>
      <div className={single ? 'hidden' : undefined}>
        <div className="grid grid-cols-2 gap-2">
          <End icon={SignIn} label={inclusive ? 'First day' : 'Check-in'} date={checkIn} active={editStart} onClick={() => { setEditStart(true); setAwaitingEnd(false); }} />
          <End icon={SignOut} label={inclusive ? 'Last day' : 'Check-out'} date={awaitingEnd ? null : lastDay} out active={awaitingEnd && !editStart} onClick={() => { setEditStart(false); setAwaitingEnd(true); }} />
        </div>
        <p className="mt-2 text-center text-base text-muted" aria-live="polite">
          {editStart ? <span className="text-accent-text">{inclusive ? 'Now pick the new first day' : 'Now pick the new check-in day'}</span> : awaitingEnd ? <span className="text-accent-text">{words.pickEnd}</span> : checkIn && checkOut ? words.unit(nights) : words.pickStart}
        </p>
      </div>

      <div>
      <div className="mb-1 flex items-center justify-between">
        <button type="button" className="btn btn-icon" onClick={() => setView(addMonths(view, -1))} aria-label="Previous month">
          <CaretLeft className="ico-left" size={18} />
        </button>
        <span className="text-[1.0625rem] font-bold" aria-live="polite">{fmtMonth(view)}</span>
        <button type="button" className="btn btn-icon" onClick={() => setView(addMonths(view, 1))} aria-label="Next month">
          <CaretRight className="ico-right" size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-[0.8125rem] font-semibold text-muted">
        {WEEKDAYS.map((w) => <span key={w} className="pb-1">{w}</span>)}
        {Array.from({ length: weekdayIndex(view) }, (_, i) => <span key={`pad-${i}`} />)}
        {days.map((d) => {
          const isStart = d === checkIn;
          const isEnd = d === lastDay;
          const inside = checkIn && lastDay && d > checkIn && d < lastDay;
          const busy = isBusy(d);
          const preview = typedOk && d >= typed.from && d <= typed.to;
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
              disabled={(disabled && !isStart && !isEnd) || outside(d)}
              onClick={() => pick(d)}
              aria-label={`${fmtShort(d)}${isStart ? `, ${words.start}` : isEnd ? `, ${words.end}` : busy ? ', booked' : ''}`}
              aria-pressed={isStart || isEnd}
              style={isStart || isEnd ? { backgroundColor: (isStart ? inColor : outColor).bg, borderColor: (isStart ? inColor : outColor).border } : undefined}
              className={`cell mx-auto flex size-11 items-center justify-center rounded-lg font-mono text-base lg:size-10 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tone} ${
                d === todayStr && !isStart && !isEnd ? 'font-bold text-accent-text ring-1 ring-accent' : ''
              } ${preview ? 'outline outline-2 -outline-offset-2 outline-dashed outline-accent' : ''}`}
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
