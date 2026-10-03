import { addDays, addMonths, fmtDayMonth, fmtDayMonthYear, fmtLong, fmtMonth } from '../../lib/dates';

// The date shown after pressing previous (dir -1) or next (dir +1) in the current view.
export function stepDate(view, date, span, dir) {
  if (view === 'timeline') return addDays(date, dir * span);
  if (view === 'day') return addDays(date, dir);
  return addMonths(date, dir);
}

// The heading for the current view.
export function calendarTitle(view, date, span) {
  if (view === 'timeline') return `${fmtDayMonth(date)} to ${fmtDayMonthYear(addDays(date, span - 1))}`;
  if (view === 'day') return fmtLong(date);
  return fmtMonth(date);
}
