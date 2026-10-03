import { useCallback } from 'react';
import { useRouter } from 'next/router';
import { CalendarDots, GridFour, Rows, Sun } from '@phosphor-icons/react';
import { isDate, today } from '../../lib/dates';

// 'month' is the default: rooms across, dates down. 'timeline' flips it: rooms down, dates across.
export const VIEWS = [
  { key: 'month', label: 'Month', Icon: GridFour },
  { key: 'timeline', label: 'Timeline', Icon: Rows },
  { key: 'calendar', label: 'Occupancy', Icon: CalendarDots },
  { key: 'day', label: 'Day', Icon: Sun },
];
export const SPANS = [7, 14, 30];

// The view, date, span and floors live in the URL, so a view can be bookmarked or shared.
// floors is null for "every floor", otherwise a list of floor digits like ['1', '3'].
export function useCalendarParams() {
  const router = useRouter();
  const q = router.query;
  const view = VIEWS.some((v) => v.key === q.view) ? q.view : 'month';
  const date = isDate(q.date) ? q.date : today();
  const span = SPANS.includes(Number(q.span)) ? Number(q.span) : typeof window !== 'undefined' && window.innerWidth < 640 ? 7 : 14;
  const floorsParam = typeof q.floors === 'string' && q.floors ? q.floors : '';
  const floors = floorsParam ? floorsParam.split(',') : null;

  // set({ date: '2026-10-12' }) changes just that part and keeps the rest.
  const set = useCallback(
    (patch) => {
      const next = { view, date, span, ...(floorsParam ? { floors: floorsParam } : {}), ...patch };
      if (!next.floors) delete next.floors;
      router.replace({ pathname: '/', query: next }, undefined, { shallow: true });
    },
    [router, view, date, span, floorsParam],
  );

  return { view, date, span, floors, set };
}
