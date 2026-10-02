import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { CaretLeft, CaretRight, Plus } from '@phosphor-icons/react';
import RoomGrid from './RoomGrid';
import OccupancyMonth from './OccupancyMonth';
import DayView from './DayView';
import BookingSheet, { BookingForm } from '../BookingSheet';
import { useToast } from '../Toast';
import { useApi } from '../../lib/useApi';
import { COLORS } from '../../lib/colors';
import { useMediaQuery } from '../../lib/useMediaQuery';
import {
  addDays, addMonths, daysInMonth, fmtDayMonth, fmtDayMonthYear, fmtLong, fmtMonth, isDate, monthStart, range, today,
} from '../../lib/dates';

// 'month' is the default: rooms across, dates down. 'timeline' flips it: rooms down, dates across.
const VIEWS = [
  { key: 'month', label: 'Month' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'calendar', label: 'Occupancy' },
  { key: 'day', label: 'Day' },
];
const SPANS = [7, 14, 30];

// view, date and span live in the URL so a view can be bookmarked or shared.
function useParams() {
  const router = useRouter();
  const q = router.query;
  const view = VIEWS.some((v) => v.key === q.view) ? q.view : 'month';
  const date = isDate(q.date) ? q.date : today();
  const span = SPANS.includes(Number(q.span)) ? Number(q.span) : typeof window !== 'undefined' && window.innerWidth < 640 ? 7 : 14;
  const set = useCallback(
    (patch) => {
      const next = { view, date, span, ...patch };
      router.replace({ pathname: '/', query: next }, undefined, { shallow: true });
    },
    [router, view, date, span],
  );
  return { view, date, span, set };
}

export default function CalendarPage() {
  const router = useRouter();
  const toast = useToast();
  const wide = useMediaQuery('(min-width: 1024px)');
  const { view, date, span, set } = useParams();
  // null = a blank new booking. On wide screens the form is always on screen beside the calendar;
  // on phones it opens as a bottom sheet whenever this is set.
  const [panel, setPanel] = useState(null);
  const [draftState, setDraftState] = useState(null); // live preview of the booking being created
  const colorIdx = useRef(Math.floor(Math.random() * COLORS.length));

  // Everything date-based is computed on the client only, so server and browser never disagree about "today".
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const win = useMemo(() => {
    if (view === 'timeline') return { from: date, days: span };
    if (view === 'day') return { from: addDays(date, -1), days: 3 };
    const first = monthStart(date);
    return { from: first, days: daysInMonth(first) };
  }, [view, date, span]);

  const rooms = useApi('/api/rooms');
  const bookings = useApi(
    mounted && router.isReady ? `/api/bookings?from=${win.from}&to=${addDays(win.from, win.days)}&sort=check_in&dir=asc` : null,
  );

  const step = (dir) => {
    if (view === 'timeline') set({ date: addDays(date, dir * span) });
    else if (view === 'day') set({ date: addDays(date, dir) });
    else set({ date: addMonths(date, dir) });
  };

  const title = {
    timeline: `${fmtDayMonth(date)} to ${fmtDayMonthYear(addDays(date, span - 1))}`,
    month: fmtMonth(date),
    calendar: fmtMonth(date),
    day: fmtLong(date),
  }[view];

  const reload = (message) => {
    bookings.reload();
    if (message) toast({ message, duration: 3000 });
  };

  // Every new selection gets the next pastel colour. It can be changed in the form.
  const openCreate = ({ room, checkIn, checkOut }) => {
    colorIdx.current = (colorIdx.current + 1) % COLORS.length;
    setPanel({ mode: 'create', defaults: { roomId: room.id, checkIn, checkOut, color: COLORS[colorIdx.current].key } });
  };
  const openEdit = (booking) => setPanel({ mode: 'edit', booking });
  const closePanel = () => {
    setPanel(null);
    setDraftState(null);
  };
  const draft = panel?.mode === 'create' ? draftState : null;

  if (!mounted || !router.isReady) return <Skeleton />;

  const roomList = rooms.data ?? [];
  const bookingList = bookings.data ?? [];
  const failed = rooms.error || bookings.error;
  const showGrid = view === 'timeline' || view === 'month';

  const blank = roomList.length
    ? { mode: 'create', defaults: { roomId: roomList[0].id, checkIn: today(), checkOut: addDays(today(), 1) } }
    : null;
  const current = panel ?? blank;
  const formKey = !panel
    ? 'blank'
    : panel.mode === 'edit'
      ? `edit-${panel.booking.id}`
      : `new-${panel.defaults.roomId}-${panel.defaults.checkIn}-${panel.defaults.checkOut}-${panel.defaults.color}`;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-4">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-icon" onClick={() => step(-1)} aria-label="Previous">
              <CaretLeft size={20} />
            </button>
            <button type="button" className="btn btn-icon" onClick={() => step(1)} aria-label="Next">
              <CaretRight size={20} />
            </button>
            <button type="button" className="btn" onClick={() => set({ date: today() })}>Today</button>
            <h1 className="ml-1 min-w-0 flex-1 truncate text-base font-semibold sm:text-lg">{title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <div role="tablist" aria-label="Calendar view" className="flex flex-1 gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1 sm:flex-none">
              {VIEWS.map((v) => (
                <button
                  key={v.key}
                  role="tab"
                  type="button"
                  aria-selected={view === v.key}
                  onClick={() => set({ view: v.key })}
                  className={`btn min-h-9 flex-1 border-transparent px-3 ${view === v.key ? 'bg-accent text-accent-ink hover:bg-accent' : ''}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            {view === 'timeline' && (
              <select aria-label="Days shown" className="field !w-auto" value={span} onChange={(e) => set({ span: Number(e.target.value) })}>
                {SPANS.map((s) => <option key={s} value={s}>{s} days</option>)}
              </select>
            )}
          </div>
        </div>

        {failed && (
          <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">
            Could not load the calendar: {(rooms.error || bookings.error).message}
            <button type="button" className="btn ml-3" onClick={() => { rooms.reload(); bookings.reload(); }}>Retry</button>
          </p>
        )}

        {rooms.loading && !rooms.data ? (
          <Skeleton />
        ) : roomList.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface p-6 text-center text-muted">No rooms yet. Add rooms in the database to start booking.</p>
        ) : (
          <div className={bookings.loading ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
            {showGrid && (
              <RoomGrid
                key={view}
                orientation={view === 'timeline' ? 'rows' : 'cols'}
                rooms={roomList}
                days={view === 'timeline' ? range(date, span) : range(monthStart(date), daysInMonth(date))}
                bookings={bookingList}
                onCreate={openCreate}
                onOpen={openEdit}
                draft={draft}
              />
            )}
            {view === 'calendar' && (
              <OccupancyMonth date={date} rooms={roomList} bookings={bookingList} onPickDay={(d) => set({ view: 'day', date: d })} />
            )}
            {view === 'day' && (
              <DayView date={date} rooms={roomList} bookings={bookingList} onOpen={openEdit} onCreate={openCreate} />
            )}
          </div>
        )}

        {showGrid && roomList.length > 0 && (
          <p className="text-sm text-muted">
            <span className="hidden sm:inline">Drag across free nights to book. </span>
            <span className="sm:hidden">Tap the first night, then the last night, to book. </span>
            Tap a booking to edit it.
          </p>
        )}
      </div>

      {/* Wide screens: the form is always here, beside the calendar. */}
      {wide && current && (
        <aside
          aria-label="Booking form"
          className="sticky top-[4.5rem] max-h-[calc(100dvh-5.5rem)] overflow-y-auto overscroll-contain rounded-lg border border-line bg-surface"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <h2 className="text-base font-semibold">{current.mode === 'edit' ? 'Edit booking' : 'New booking'}</h2>
            {current.mode === 'edit' && (
              <button type="button" className="btn" onClick={closePanel}>
                <Plus size={18} /> New
              </button>
            )}
          </div>
          <div className="px-4 pt-4">
            <BookingForm
              key={formKey}
              {...current}
              rooms={roomList}
              onSaved={reload}
              onDone={closePanel}
              onCancel={panel ? closePanel : undefined}
              onPreview={panel?.mode === 'create' ? setDraftState : undefined}
            />
          </div>
        </aside>
      )}

      {/* Phones and tablets: the form opens as a bottom sheet. */}
      {!wide && panel && (
        <BookingSheet key={formKey} {...panel} rooms={roomList} onClose={closePanel} onSaved={reload} onPreview={panel.mode === 'create' ? setDraftState : undefined} />
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading calendar">
      <div className="h-11 w-full rounded-lg bg-surface-2 motion-safe:animate-pulse sm:w-2/3" />
      <div className="h-80 rounded-lg border border-line bg-surface motion-safe:animate-pulse" />
    </div>
  );
}
