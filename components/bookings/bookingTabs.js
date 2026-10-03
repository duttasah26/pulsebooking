import { Bed, CalendarPlus, Clock, ClockCounterClockwise, ListBullets, Trash } from '@phosphor-icons/react';

// The filters on the Bookings page. `query` is what the API is asked for; `dir` is the natural order for that filter.
export const TABS = [
  { key: 'upcoming', label: 'Upcoming', Icon: CalendarPlus, query: 'when=upcoming', dir: 'asc' },
  { key: 'current', label: 'In House', Icon: Bed, query: 'when=current', dir: 'asc' },
  { key: 'hold', label: 'On Hold', Icon: Clock, query: 'status=on_hold&when=all', dir: 'asc' },
  { key: 'past', label: 'Past', Icon: ClockCounterClockwise, query: 'when=past', dir: 'desc' },
  { key: 'deleted', label: 'Deleted', Icon: Trash, query: 'deleted=only&when=all', dir: 'desc' },
  { key: 'all', label: 'All', Icon: ListBullets, query: 'when=all', dir: 'desc' },
];

export const SORTS = [
  ['check_in', 'Check-in date'],
  ['guest', 'Guest name'],
  ['room', 'Room'],
  ['created', 'Date added'],
];
