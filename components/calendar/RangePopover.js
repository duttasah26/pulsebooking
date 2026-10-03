import { useEffect, useRef, useState } from 'react';
import { Check, X } from '@phosphor-icons/react';
import DateRangePicker from '../DateRangePicker';
import { MAX_SPAN } from './useCalendarParams';
import { addDays, diffDays } from '../../lib/dates';

/*
  The calendar's "Go to" panel: the same month picker as the booking form, but for choosing the days to look at.
  Tap the first day, then the last day, then Show. One day just jumps to it (keeping the current view); a longer
  range opens the timeline for exactly those days (up to MAX_SPAN). It closes on Escape or a click outside.
  onShow({ date, span }) is called with the first day and the number of days.
*/
export default function RangePopover({ date, span, onShow, onClose }) {
  const [from, setFrom] = useState(date);
  const [to, setTo] = useState(addDays(date, span)); // the day after the last day
  const box = useRef(null);

  useEffect(() => {
    const onPointer = (e) => !box.current?.contains(e.target) && onClose();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const days = diffDays(from, to);
  const tooLong = days > MAX_SPAN;

  return (
    <div
      ref={box}
      role="dialog"
      aria-label="Choose dates to show"
      className="absolute left-0 top-full z-40 mt-1.5 w-[min(21rem,calc(100vw-2rem))] space-y-2 rounded-lg border border-line bg-surface p-3 shadow-lg"
    >
      <DateRangePicker inclusive checkIn={from} checkOut={to} onChange={(a, b) => { setFrom(a); setTo(b); }} />
      {tooLong && <p role="alert" className="text-sm text-danger">Pick at most {MAX_SPAN} days.</p>}
      <div className="flex gap-2">
        <button type="button" className="btn" onClick={onClose}>
          <X size={16} aria-hidden="true" /> Cancel
        </button>
        <button type="button" className="btn btn-primary flex-1" disabled={tooLong} onClick={() => onShow({ date: from, span: days })}>
          <Check size={16} aria-hidden="true" /> {days === 1 ? 'Go to Day' : `Show ${days} Days`}
        </button>
      </div>
    </div>
  );
}
