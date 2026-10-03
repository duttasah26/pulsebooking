import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { CalendarBlank, CaretLeft, CaretRight, Clock, Plus } from '@phosphor-icons/react';
import RoomGrid from './RoomGrid';
import OccupancyMonth from './OccupancyMonth';
import DayView from './DayView';
import BookingSheet, { BookingForm } from '../BookingSheet';
import { useToast } from '../Toast';
import { api, useApi } from '../../lib/useApi';
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
const HOLD_KEY = 'pulse.quickHold';

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
  const [quickHold, setQuickHold] = useState(false); // every selection becomes an on-hold booking straight away
  const colorIdx = useRef(Math.floor(Math.random() * COLORS.length));

  // Everything date-based is computed on the client only, so server and browser never disagree about "today".
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    try {
      setQuickHold(localStorage.getItem(HOLD_KEY) === '1');
    } catch {}
  }, []);

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
  const bookingList = bookings.data ?? [];

  // Which bookings hold each room on each night, so the form can grey out taken rooms and nights.
  const busyNights = useMemo(() => {
    const map = new Map();
    for (const b of bookingList) {
      if (b.status === 'cancelled') continue;
      for (let d = b.check_in; d < b.check_out; d = addDays(d, 1)) {
        const key = `${b.room_id}|${d}`;
        (map.get(key) ?? map.set(key, []).get(key)).push(b.id);
      }
    }
    return map;
  }, [bookingList]);
  const isBusy = useCallback(
    (roomId, d, ignoreId) => (busyNights.get(`${roomId}|${d}`) ?? []).some((id) => id !== ignoreId),
    [busyNights],
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

  const nextColor = () => {
    colorIdx.current = (colorIdx.current + 1) % COLORS.length;
    return COLORS[colorIdx.current].key;
  };

  // Place an on-hold booking at once, with no details. Undo removes it again.
  const placeHold = async ({ roomIds, checkIn, checkOut }) => {
    try {
      const created = await api('/api/bookings', {
        method: 'POST',
        body: { room_ids: roomIds, check_in: checkIn, check_out: checkOut, status: 'on_hold', color: nextColor() },
      });
      bookings.reload();
      toast({
        message: roomIds.length > 1 ? `${roomIds.length} rooms on hold` : 'Room on hold',
        actionLabel: 'Undo',
        onAction: async () => {
          await Promise.all(created.map((b) => api(`/api/bookings/${b.id}`, { method: 'DELETE' })));
          bookings.reload();
        },
      });
    } catch (err) {
      toast({ message: err.message });
    }
  };

  // A drag, a tap-tap or the Day view's Book button. Quick hold mode skips the form entirely.
  const openCreate = (sel, opts) => {
    if (quickHold || opts?.hold) return placeHold(sel);
    setPanel({ mode: 'create', defaults: { ...sel, color: nextColor() } });
  };
  const openEdit = (booking) => setPanel({ mode: 'edit', booking });
  const closePanel = () => {
    setPanel(null);
    setDraftState(null);
  };
  const draft = panel?.mode === 'create' ? draftState : null;

  const toggleQuickHold = () => {
    const next = !quickHold;
    setQuickHold(next);
    try {
      localStorage.setItem(HOLD_KEY, next ? '1' : '0');
    } catch {}
  };

  if (!mounted || !router.isReady) return <Skeleton />;

  const roomList = rooms.data ?? [];
  const failed = rooms.error || bookings.error;
  const showGrid = view === 'timeline' || view === 'month';

  const blank = roomList.length
    ? { mode: 'create', defaults: { roomIds: [roomList[0].id], checkIn: today(), checkOut: addDays(today(), 1) } }
    : null;
  const current = panel ?? blank;
  const formKey = !panel
    ? 'blank'
    : panel.mode === 'edit'
      ? `edit-${panel.booking.id}`
      : `new-${panel.defaults.roomIds.join('.')}-${panel.defaults.checkIn}-${panel.defaults.checkOut}-${panel.defaults.color}`;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-4">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-icon" onClick={() => step(-1)} aria-label="Previous">
              <CaretLeft size={20} />
            </button>
            <button type="button" className="btn btn-icon" onClick={() => step(1)} aria-label="Next">
              <CaretRight size={20} />
            </button>
            <button type="button" className="btn" onClick={() => set({ date: today() })}>Today</button>
            <label className="btn relative cursor-pointer gap-1.5 px-3 focus-within:outline-2 focus-within:outline-accent">
              <CalendarBlank size={18} />
              <span className="hidden sm:inline">Go to</span>
              <input
                type="date"
                aria-label="Jump to date"
                value={date}
                onChange={(e) => isDate(e.target.value) && set({ date: e.target.value })}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
            <h1 className="ml-1 min-w-0 flex-1 truncate text-base font-semibold sm:text-lg">{title}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
            {showGrid && (
              <button
                type="button"
                aria-pressed={quickHold}
                onClick={toggleQuickHold}
                title="When on, every selection is placed on hold straight away, with no form"
                className={`btn ${quickHold ? 'border-accent bg-accent-soft' : ''}`}
              >
                <Clock size={18} weight={quickHold ? 'fill' : 'regular'} /> Quick hold
              </button>
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
            <span className="hidden sm:inline">
              {quickHold ? 'Quick hold is on: each drag places a hold at once. ' : 'Drag across free nights, and across rooms, to book. '}
            </span>
            <span className="sm:hidden">Tap one corner, then the opposite corner. </span>
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
              isBusy={isBusy}
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
        <BookingSheet
          key={formKey}
          {...panel}
          rooms={roomList}
          isBusy={isBusy}
          onClose={closePanel}
          onSaved={reload}
          onPreview={panel.mode === 'create' ? setDraftState : undefined}
        />
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
