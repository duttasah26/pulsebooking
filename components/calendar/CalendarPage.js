import { useEffect, useMemo, useState } from 'react';
import { Trash, X } from '@phosphor-icons/react';
import { useRouter } from 'next/router';
import RoomGrid from './RoomGrid';
import OccupancyMonth from './OccupancyMonth';
import DayView from './DayView';
import CalendarToolbar from './CalendarToolbar';
import ZoomBar, { clampZoom } from './ZoomBar';
import BookingPanel from './BookingPanel';
import { DOCK_GRID } from '../Dock';
import { useToast } from '../Toast';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { useStoredState } from '../../lib/useStoredState';
import { useCalendarParams } from './useCalendarParams';
import { useBookingData } from './useBookingData';
import { useHoldActions } from './useHoldActions';
import { calendarTitle, stepDate } from './calendarNav';
import { deriveFloors } from './floors';
import { addDays, daysInMonth, monthStart, range, today } from '../../lib/dates';

/*
  The calendar page. How booking works here:
    - A drag (or tap, then tap on a phone) places an on-hold booking straight away; there is no separate draft step.
    - The panel then opens on that hold. Type an organization or name and it becomes the hold's label; add the guest
      and change the status to confirm it. Click a room number to hold another room on the same hold.
    - X on a hold removes that room. Undo puts it back.
    - Clicking any booking shows its details; the pencil edits it. The blank form is for entering a booking by hand.
  The work is split up: useCalendarParams (URL), useBookingData (fetching + instant updates), useHoldActions (place,
  remove, add a room), CalendarToolbar, RoomGrid, ZoomBar and BookingPanel.
*/
export default function CalendarPage() {
  const router = useRouter();
  const toast = useToast();
  const wide = useMediaQuery('(min-width: 1024px)');
  const { view, date, span, floors, set } = useCalendarParams();

  const [selectMode, setSelectMode] = useState(false); // drag a box to tick bookings, then delete them together
  const [picked, setPicked] = useState(() => new Set());
  const [panel, setPanel] = useState(null); // { booking, key?, editing } while a booking or hold is open
  const [formOpen, setFormOpen] = useStoredState('pulse.formOpen', true, { parse: (raw) => raw !== '0', serialize: (v) => (v ? '1' : '0') });
  const [zoom, setZoom] = useStoredState('pulse.zoom', 1, { parse: (raw) => { const z = Number(raw); return z >= 0.6 && z <= 1.6 ? z : undefined; } });

  // Everything date-based is computed on the client only, so server and browser never disagree about "today".
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const data = useBookingData({ view, date, span, enabled: mounted && router.isReady });
  const { rooms, bookings, bookingList, isBusy } = data;
  const roomList = rooms.data ?? [];

  // The open booking as the latest list has it, and (for a hold) every room held together with it.
  const panelBooking = panel ? bookingList.find((b) => b.id === panel.booking.id) ?? panel.booking : null;
  const isHoldOpen = panelBooking?.status === 'on_hold';
  const group = useMemo(() => {
    if (!isHoldOpen) return null;
    if (!panelBooking.group_id) return [panelBooking];
    return bookingList.filter((b) => b.group_id === panelBooking.group_id && b.status === 'on_hold');
  }, [isHoldOpen, panelBooking, bookingList]);

  const { placeHold, removeMany, removeBooking, toggleRoom } = useHoldActions({
    data, panelState: { panel, setPanel, panelBooking, group, wide }, rooms: roomList, toast,
  });

  const closePanel = () => setPanel(null);
  const stopSelecting = () => {
    setSelectMode(false);
    setPicked(new Set());
  };
  // Escape leaves select mode.
  useEffect(() => {
    if (!selectMode) return;
    const onKey = (e) => e.key === 'Escape' && stopSelecting();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectMode]);
  const openEdit = (booking) => {
    setPanel({ booking, editing: false });
    setFormOpen(true);
  };
  const reload = (message) => {
    bookings.reload();
    if (message) toast({ message, duration: 3000 });
  };

  if (!mounted || !router.isReady) return <Skeleton />;

  const { floorKeys, shownFloors, visibleRooms } = deriveFloors(roomList, floors);
  const visibleIds = new Set(visibleRooms.map((r) => r.id));
  const visibleBookings = bookingList.filter((b) => visibleIds.has(b.room_id));
  const toggleFloor = (f) => {
    const next = new Set(shownFloors);
    if (next.has(f)) next.delete(f);
    else next.add(f);
    set({ floors: next.size === 0 || next.size === floorKeys.length ? '' : [...next].sort().join(',') });
  };

  const failed = rooms.error || bookings.error;
  const showGrid = view === 'timeline' || view === 'month';
  const selecting = selectMode && showGrid;
  const pickedBookings = bookingList.filter((b) => picked.has(b.id) && visibleIds.has(b.room_id)); // never delete what a floor filter hides
  const deletePicked = () => {
    removeMany(pickedBookings);
    setPicked(new Set());
  };
  const blank = roomList.length
    ? { mode: 'create', defaults: { roomIds: [roomList[0].id], checkIn: today(), checkOut: addDays(today(), 1) } }
    : null;
  const grid = wide ? (formOpen ? DOCK_GRID.wide.open : DOCK_GRID.wide.folded) : '';

  return (
    <div className={`lg:grid lg:items-start lg:gap-4 ${grid}`}>
      <div className="@container min-w-0 space-y-2">
        <CalendarToolbar
          view={view}
          date={date}
          span={span}
          title={calendarTitle(view, date, span)}
          onStep={(dir) => set({ date: stepDate(view, date, span, dir) })}
          set={set}
          floorKeys={floorKeys}
          shownFloors={shownFloors}
          onToggleFloor={toggleFloor}
          canSelect={showGrid}
          selectMode={selecting}
          onToggleSelect={() => (selectMode ? stopSelecting() : setSelectMode(true))}
        />

        {selecting && (
          <div role="status" className="flex flex-wrap items-center gap-2 rounded-lg border border-accent bg-accent-soft px-3 py-1.5 text-sm">
            <span className="min-w-0 flex-1 font-medium">
              {pickedBookings.length === 0
                ? 'Select mode: drag a box over bookings or holds, or tap them'
                : `${pickedBookings.length} selected`}
            </span>
            <button type="button" className="btn btn-danger" disabled={pickedBookings.length === 0} onClick={deletePicked}>
              <Trash size={16} /> Delete{pickedBookings.length > 0 ? ` ${pickedBookings.length}` : ''}
            </button>
            <button type="button" className="btn" onClick={stopSelecting}>
              <X size={16} /> Done
            </button>
          </div>
        )}

        {failed && (
          <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">
            Could not load the calendar: {failed.message}. Check the connection and try again.
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
                key={`${view}-${shownFloors.join('')}`}
                orientation={view === 'timeline' ? 'rows' : 'cols'}
                rooms={visibleRooms}
                days={view === 'timeline' ? range(date, span) : range(monthStart(date), daysInMonth(date))}
                bookings={bookingList}
                onCreate={placeHold}
                onOpen={openEdit}
                onDelete={removeBooking}
                onToggleRoom={isHoldOpen ? toggleRoom : undefined}
                zoom={zoom}
                selectMode={selecting}
                picked={picked}
                onPick={setPicked}
                activeIds={group ? new Set(group.map((b) => b.id)) : undefined}
                activeRoomIds={group ? group.map((b) => b.room_id) : undefined}
              />
            )}
            {view === 'calendar' && (
              <OccupancyMonth date={date} rooms={visibleRooms} bookings={visibleBookings} onPickDay={(d) => set({ view: 'day', date: d })} />
            )}
            {view === 'day' && <DayView date={date} rooms={visibleRooms} bookings={visibleBookings} onOpen={openEdit} onCreate={placeHold} />}
          </div>
        )}

        {showGrid && roomList.length > 0 && <ZoomBar zoom={zoom} onChange={(z) => setZoom(clampZoom(z))} />}
      </div>

      <BookingPanel
        wide={wide}
        formOpen={formOpen}
        onToggle={setFormOpen}
        panel={panel}
        setPanel={setPanel}
        panelBooking={panelBooking}
        group={group}
        rooms={roomList}
        isBusy={isBusy}
        blank={blank}
        onSaved={reload}
        onRemove={removeMany}
        closePanel={closePanel}
      />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading calendar…">
      <div className="h-11 w-full rounded-lg bg-surface-2 motion-safe:animate-pulse sm:w-2/3" />
      <div className="h-80 rounded-lg border border-line bg-surface motion-safe:animate-pulse" />
    </div>
  );
}
