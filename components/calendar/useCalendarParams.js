import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { CalendarDots, GridFour, Rows, Sun } from '@phosphor-icons/react';
import { daysInMonth, isDate, monthStart, today } from '../../lib/dates';
import { useFirstView } from '../../lib/devicePrefs';

// 'timeline' is the default and comes first: rooms down, dates across, showing the current month. 'month' flips it: rooms across, dates down.
export const VIEWS = [
  { key: 'timeline', label: 'Timeline', Icon: Rows },
  { key: 'month', label: 'Month', Icon: GridFour },
  { key: 'calendar', label: 'Occupancy', Icon: CalendarDots },
  { key: 'day', label: 'Day', Icon: Sun },
];
export const SPANS = [7, 14, 30]; // the quick choices; any length from 1 to MAX_SPAN days works (a custom range)
export const MAX_SPAN = 92;

// The last view, date, span and floors are also kept on this device. Coming back to the calendar with a bare address (from another
// page, or after a reload) picks up where the person left off; an address that names a view or date wins.
// Kept for this visit only (sessionStorage): opening the app fresh always starts on the current month.
const STORE = 'pulse.calendar';
const readStore = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORE)) ?? {};
  } catch {
    return {};
  }
};

// The view, date, span and floors live in the URL, so a view can be bookmarked or shared.
// floors is null for "every floor", otherwise a list of floor digits like ['1', '3'].
export function useCalendarParams() {
  const router = useRouter();
  const q = router.query;
  useEffect(() => {
    if (!router.isReady || q.view || q.date || q.span || q.floors) return;
    const saved = readStore();
    const next = {};
    if (VIEWS.some((v) => v.key === saved.view)) next.view = saved.view;
    if (isDate(saved.date)) next.date = saved.date;
    if (Number.isInteger(saved.span) && saved.span >= 1 && saved.span <= MAX_SPAN) next.span = saved.span;
    if (typeof saved.floors === 'string' && saved.floors) next.floors = saved.floors;
    // A moment later, so the router has finished its own first update of the address (a hard reload otherwise undoes this).
    const timer = Object.keys(next).length ? setTimeout(() => router.replace({ pathname: '/', query: next }, undefined, { shallow: true }), 50) : null;
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);
  // With nothing in the address, the calendar opens on the first view chosen in Settings for this device (Timeline unless changed), for the current month.
  const [firstView] = useFirstView();
  const view = VIEWS.some((v) => v.key === q.view) ? q.view : firstView;
  // With no date in the address the timeline opens on the first day of this month (Today still jumps to today).
  const date = isDate(q.date) ? q.date : view === 'timeline' ? monthStart(today()) : today();
  const spanParam = Number(q.span);
  const fallbackSpan = daysInMonth(isDate(q.date) ? monthStart(q.date) : monthStart(today())); // a whole month, not 14 days
  const span = Number.isInteger(spanParam) && spanParam >= 1 && spanParam <= MAX_SPAN ? spanParam : fallbackSpan;
  const floorsParam = typeof q.floors === 'string' && q.floors ? q.floors : '';
  const floors = floorsParam ? floorsParam.split(',') : null;

  // set({ date: '2026-10-12' }) changes just that part and keeps the rest.
  const set = useCallback(
    (patch) => {
      const next = { view, date, span, ...(floorsParam ? { floors: floorsParam } : {}), ...patch };
      if (!next.floors) delete next.floors;
      try {
        sessionStorage.setItem(STORE, JSON.stringify({ view: next.view, date: next.date, span: next.span, floors: next.floors ?? '' }));
      } catch {}
      router.replace({ pathname: '/', query: next }, undefined, { shallow: true });
    },
    [router, view, date, span, floorsParam],
  );

  return { view, date, span, floors, set };
}
