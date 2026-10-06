import { Bed, CalendarBlank, CalendarDots, CalendarPlus, Clock, ClockCounterClockwise, ListBullets, Trash } from '@phosphor-icons/react';
import { addDays, monthStart, addMonths, today, weekdayIndex } from '../../lib/dates';

// The filters on the Bookings page. `query` is what the API is asked for; `dir` is the natural order for that filter.
// `empty` is the message when nothing matches.
// `range` (optional) gives [from, to) dates: bookings that overlap that range (the week runs Monday to Sunday).
export const TABS = [
  { key: 'upcoming', empty: 'No upcoming bookings.', label: 'Upcoming', Icon: CalendarPlus, query: 'when=upcoming', dir: 'asc' },
  { key: 'current', empty: 'Nobody is in house right now.', label: 'In House', Icon: Bed, query: 'when=current', dir: 'asc' },
  { key: 'week', empty: 'No bookings this week.', label: 'This Week', Icon: CalendarDots, query: 'when=all', dir: 'asc', range: () => { const s = addDays(today(), -weekdayIndex(today())); return [s, addDays(s, 7)]; } },
  { key: 'month', empty: 'No bookings this month.', label: 'This Month', Icon: CalendarBlank, query: 'when=all', dir: 'asc', range: () => [monthStart(today()), addMonths(monthStart(today()), 1)] },
  { key: 'hold', empty: 'No bookings on hold.', label: 'On Hold', Icon: Clock, query: 'status=on_hold&when=all', dir: 'asc' },
  { key: 'past', empty: 'No past bookings.', label: 'Past', Icon: ClockCounterClockwise, query: 'when=past', dir: 'desc' },
  { key: 'deleted', empty: 'Nothing has been deleted.', label: 'Deleted', Icon: Trash, query: 'deleted=only&when=all', dir: 'desc' },
  { key: 'all', empty: 'No bookings yet.', label: 'All', Icon: ListBullets, query: 'when=all', dir: 'desc' },
];

export const SORTS = [
  ['check_in', 'Check-in date'],
  ['guest', 'Guest name'],
  ['room', 'Room'],
  ['created', 'Date booked'],
];
