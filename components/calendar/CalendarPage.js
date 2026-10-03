import { useEffect, useMemo, useState } from 'react';
import { Eye, Trash, X } from '@phosphor-icons/react';
import HoldButton from '../HoldButton';
import { useRouter } from 'next/router';
import RoomGrid, { MAX_WIDTH_SCALE, MIN_WIDTH_SCALE } from './RoomGrid';
import OccupancyMonth from './OccupancyMonth';
import DayView from './DayView';
import CalendarToolbar from './CalendarToolbar';
import ZoomBar, { clampZoom } from './ZoomBar';
import BookingPanel from './BookingPanel';
import ToolRail from './ToolRail';

// Wide screens: the slim tool pane on the left, then the calendar, then the booking dock (written out in full so Tailwind can see them).
const WITH_TOOLS = { open: 'lg:grid-cols-[4rem_minmax(0,1fr)_23rem]', folded: 'lg:grid-cols-[4rem_minmax(0,1fr)_2.75rem]' };
import { useToast } from '../Toast';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { useStoredState } from '../../lib/useStoredState';
import { useCalendarParams } from './useCalendarParams';
import { useBookingData } from './useBookingData';
import { useHistory } from './useHistory';
import { useHoldActions } from './useHoldActions';
import { calendarTitle, stepDate } from './calendarNav';
import { deriveFloors } from './floors';
import { addDays, diffDays, daysInMonth, monthStart, range, today, addMonths, fmtMonth } from '../../lib/dates';

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

  const [quickHold, setQuickHold] = useStoredState('pulse.quickHold', false, { parse: (raw) => raw === '1', serialize: (v) => (v ? '1' : '0') }); // off: dragging selects
  const [colScale, setColScale] = useStoredState('pulse.dayWidth', 1, { parse: (raw) => { const v = Number(raw); return v >= MIN_WIDTH_SCALE && v <= MAX_WIDTH_SCALE ? v : undefined; } }); // timeline day width
  const [preview, setPreview] = useState(null); // ghost of the booking being filled in, drawn on the grid
  const [selectMode, setSelectMode] = useState(false); // drag a box to tick bookings, then delete them together
  const [picked, setPicked] = useState(() => new Set());
  const [viewPicked, setViewPicked] = useState(false); // show the details of everything picked, side by side
  const [panel, setPanel] = useState(null); // { booking, key?, editing } while a booking or hold is open
  const [formOpen, setFormOpen] = useStoredState('pulse.formOpen', true, { parse: (raw) => raw !== '0', serialize: (v) => (v ? '1' : '0') });
  const [zoom, setZoom] = useStoredState('pulse.zoom', 1, { parse: (raw) => { const z = Number(raw); return z >= 0.6 && z <= 1.6 ? z : undefined; } });

  // Everything date-based is computed on the client only, so server and browser never disagree about "today".
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Timeline: `span` days fill the screen and the days after them are already loaded behind the scrollbar; scrolling
  // near the end loads another screen's worth (up to a year).
  const [windows, setWindows] = useState(3);
  const [homeKey, setHomeKey] = useState(0); // bumping it scrolls the timeline back to its first day
  const [shift, setShift] = useState(0); // days the timeline has been scrolled to the right; the heading follows
  useEffect(() => {
    setWindows(3);
    setShift(0);
  }, [view, date, span]);
  const shownDate = view === 'timeline' ? addDays(date, shift) : date;
  const timelineDays = Math.min(366, span * windows);
  // "Month" in the timeline is the calendar month (1st to last day), not 30 days from today; next and previous then step by whole months.
  const monthAligned = view === 'timeline' && date === monthStart(date) && span === daysInMonth(date);
  const goMonth = (dir) => {
    const d = addMonths(date, dir);
    set({ date: d, span: daysInMonth(d) });
  };
  // The timeline begins on the 1st of the month of its start date, and nothing earlier is loaded, so you cannot scroll
  // back past it; `lead` is just how far into the month the start date is (0 when the view opens on the 1st).
  const lead = view === 'timeline' ? diffDays(monthStart(date), date) : 0;
  const data = useBookingData({ view, date, span, windows, lead, enabled: mounted && router.isReady });
  const { rooms, bookings, bookingList, isBusy } = data;
  const roomList = rooms.data ?? [];

  // The open booking as the latest list has it, and (for a hold) every room held together with it.
  const panelBooking = panel ? bookingList.find((b) => b.id === panel.booking.id) ?? panel.booking : null;
  const isHoldOpen = panelBooking?.status === 'on_hold';
  // Rooms booked together (a hold or a booking made for several rooms) share a group: details, saving and deleting
  // apply to all of them.
  const fullGroup = useMemo(() => {
    if (!panelBooking) return null;
    if (!panelBooking.group_id) return isHoldOpen ? [panelBooking] : null;
    return bookingList.filter((b) => b.group_id === panelBooking.group_id && b.status === panelBooking.status);
  }, [isHoldOpen, panelBooking, bookingList]);
  // A booking opens on its own. Its whole group (the other rooms booked with it) shows only after a double-click.
  const group = panel?.grouped ? fullGroup : null;
  const groupCount = !panel?.grouped && fullGroup && fullGroup.length > 1 ? fullGroup.length : 0;
  const showGroup = () => setPanel((p) => (p ? { ...p, grouped: true } : p));

  const history = useHistory({ onError: (err) => toast({ message: err.message }) });
  const { placeHold, removeMany, removeBooking, toggleRoom, confirmHold, resizeBooking } = useHoldActions({
    data, panelState: { panel, setPanel, panelBooking, group: fullGroup, wide }, rooms: roomList, toast, history,
  });

  const closePanel = () => setPanel(null);
  const stopSelecting = () => {
    setSelectMode(false);
    setPicked(new Set());
    setViewPicked(false);
  };
  // Picking exactly one booking on a wide screen shows its own details at once (several show as cards, see `selection`).
  // This hook sits above the early return below, so it runs on every render.
  useEffect(() => {
    if (!wide || picked.size !== 1) return;
    const only = bookingList.find((b) => b.id === [...picked][0]);
    if (only) setPanel({ booking: only, editing: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, wide]);

  // Ctrl+Z undoes, Ctrl+Shift+Z (or Ctrl+Y) redoes, unless you are typing in a field.
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) history.undo();
      else if ((k === 'z' && e.shiftKey) || k === 'y') history.redo();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [history.undo, history.redo]);

  // Escape leaves select mode and clears what is picked.
  useEffect(() => {
    if (!selectMode && picked.size === 0) return;
    const onKey = (e) => e.key === 'Escape' && stopSelecting();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectMode, picked.size]);
  // The pencil and Select tools (in the pane on the right, or the toolbar on narrow screens).
  const toggleMouseTool = () => {
    stopSelecting();
    setQuickHold(false);
  };
  const toggleHoldTool = () => {
    if (selectMode) {
      stopSelecting();
      setQuickHold(true);
    } else setQuickHold(!quickHold);
  };
  const toggleSelectTool = () => (selectMode ? stopSelecting() : setSelectMode(true));
  const openGroup = (booking) => {
    setPanel({ booking, editing: false, grouped: true });
    setFormOpen(true);
  };
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
  // The strip with View and Delete shows while anything is picked (a drag always picks), or in tap-to-select mode.
  const selecting = showGrid && (selectMode || picked.size > 0);
  const pickedBookings = bookingList.filter((b) => picked.has(b.id) && visibleIds.has(b.room_id)); // never delete what a floor filter hides
  const deletePicked = () => {
    removeMany(pickedBookings);
    setPicked(new Set());
    setViewPicked(false);
  };
  // Confirm every hold in the selection (a hold of several rooms is confirmed once, as a whole).
  const confirmPicked = (holds) => {
    const seen = new Set();
    for (const h of holds) {
      const key = h.group_id ?? `id-${h.id}`;
      if (!seen.has(key)) confirmHold(h, { targets: holds.filter((x) => (x.group_id ?? 'id-' + x.id) === key) });
      seen.add(key);
    }
  };
  // Wide screens show what is picked in the panel at once (no View button): several as cards, one as its own details.
  // Narrow screens keep a View button, because a pop-up in the way would stop you picking more.
  const selection = selecting && pickedBookings.length > 1 && (wide || viewPicked) ? pickedBookings : null;
  // Deleting what is picked needs a hold when any of it is a real booking; holds alone delete with a click.
  const pickedHasBookings = pickedBookings.some((b) => b.status !== 'on_hold');
  const blank = roomList.length
    ? { mode: 'create', onPreview: setPreview, defaults: { roomIds: [roomList[0].id], checkIn: today(), checkOut: addDays(today(), 1) } }
    : null;
  const grid = wide ? (formOpen ? WITH_TOOLS.open : WITH_TOOLS.folded) : '';

  // What is picked, with View / Delete / Done. It sits in the line under the grid (where the hint is), so it never pushes
  // the calendar down when it appears.
  const selectionStrip = selecting ? (
    <div role="status" className="flex flex-wrap items-center gap-2 rounded-lg border border-accent bg-accent-soft px-2 py-1 text-sm">
      <span className="min-w-0 flex-1 px-1 font-medium">
        {pickedBookings.length === 0 ? 'Tap bookings to pick them, or drag a box over several' : `${pickedBookings.length} selected`}
      </span>
      {!wide && pickedBookings.length > 0 && (
        <button type="button" className="btn min-h-8 lg:min-h-8" onClick={() => (pickedBookings.length === 1 ? openEdit(pickedBookings[0]) : setViewPicked(true))}>
          <Eye size={16} className="text-sky-600" /> View{pickedBookings.length > 1 ? ` ${pickedBookings.length}` : ''}
        </button>
      )}
      {pickedHasBookings ? (
        <HoldButton className="btn btn-danger min-h-8 lg:min-h-8" onConfirm={deletePicked}>
          <Trash size={16} /> Hold to Delete {pickedBookings.length}
        </HoldButton>
      ) : (
        <button type="button" className="btn btn-danger min-h-8 lg:min-h-8" disabled={pickedBookings.length === 0} onClick={deletePicked}>
          <Trash size={16} /> Delete{pickedBookings.length > 0 ? ` ${pickedBookings.length}` : ''}
        </button>
      )}
      <button type="button" className="btn min-h-8 lg:min-h-8" onClick={stopSelecting}>
        <X size={16} /> Done
      </button>
    </div>
  ) : null;

  // The toolbar spans the whole width; below it the tool pane, the calendar and the booking panel all start on the same line.
  return (
    <div className="space-y-2">
      <div className="@container">
        <CalendarToolbar
          view={view}
          date={date}
          span={span}
          title={monthAligned && shift === 0 ? fmtMonth(date) : calendarTitle(view, shownDate, span)}
          monthAligned={monthAligned}
          onStep={(dir) => (monthAligned ? goMonth(dir) : set({ date: stepDate(view, shownDate, span, dir) }))}
          set={set}
          floorKeys={floorKeys}
          shownFloors={shownFloors}
          onToggleFloor={toggleFloor}
          onHome={() => setHomeKey((k) => k + 1)}
          onResetView={() => {
            setColScale(1);
            setHomeKey((k) => k + 1);
          }}
          wide={wide}
          canTool={showGrid}
          quickHold={quickHold}
          onToggleMouse={toggleMouseTool}
          onToggleHold={toggleHoldTool}
          selectMode={selectMode && showGrid}
          onToggleSelect={toggleSelectTool}
          history={history}
        />
      </div>

      {failed && (
        <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-sm text-danger">
          Could not load the calendar: {failed.message}. Check the connection and try again.
          <button type="button" className="btn ml-3" onClick={() => { rooms.reload(); bookings.reload(); }}>Retry</button>
        </p>
      )}

      <div className={`lg:grid lg:items-start lg:gap-4 ${grid}`}>
        {wide && roomList.length > 0 && (
          <ToolRail
            canTool={showGrid}
            quickHold={quickHold}
            selectMode={selectMode && showGrid}
            history={history}
            onToggleMouse={toggleMouseTool}
            onToggleHold={toggleHoldTool}
            onToggleSelect={toggleSelectTool}
          />
        )}

        <div className="@container min-w-0 space-y-2">
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
                  days={view === 'timeline' ? range(addDays(date, -lead), lead + timelineDays) : range(monthStart(date), daysInMonth(date))}
                lead={lead}
                anchorDate={date}
                  visibleDays={view === 'timeline' ? span : undefined}
                  onShift={view === 'timeline' ? setShift : undefined}
                  onNeedMore={view === 'timeline' && timelineDays < 366 ? () => setWindows((w) => w + 1) : undefined}
                  bookings={bookingList}
                  onCreate={placeHold}
                  onOpen={openEdit}
                  onDelete={removeBooking}
                  onToggleRoom={isHoldOpen ? toggleRoom : undefined}
                  zoom={zoom}
                  holdEnabled={quickHold}
                widthScale={colScale}
                homeKey={homeKey}
                onWidthScale={setColScale}
                  isBusy={isBusy}
                  onResize={resizeBooking}
                  selectMode={selectMode && showGrid}
                  picked={picked}
                  onPick={setPicked}
                  onView={openEdit}
                  preview={preview}
                  activeIds={panelBooking ? new Set((group ?? [panelBooking]).map((b) => b.id)) : undefined}
                  activeRoomIds={panelBooking ? (group ?? [panelBooking]).map((b) => b.room_id) : undefined}
                  onOpenGroup={openGroup}
                />
              )}
              {view === 'calendar' && (
                <OccupancyMonth date={date} rooms={visibleRooms} bookings={visibleBookings} onPickDay={(d) => set({ view: 'day', date: d })} />
              )}
              {view === 'day' && <DayView date={date} rooms={visibleRooms} bookings={visibleBookings} onOpen={openEdit} onCreate={placeHold} />}
            </div>
          )}

          {showGrid && roomList.length > 0 && <ZoomBar zoom={zoom} quickHold={quickHold && !selectMode} strip={selectionStrip} onChange={(z) => setZoom(clampZoom(z))} />}
        </div>

        <BookingPanel
          wide={wide}
          formOpen={formOpen}
          onToggle={setFormOpen}
          panel={panel}
          setPanel={setPanel}
          panelBooking={panelBooking}
          group={group}
          groupCount={groupCount}
          onShowGroup={showGroup}
          rooms={roomList}
          isBusy={isBusy}
          blank={blank}
          onSaved={reload}
          onRemove={removeMany}
          onConfirm={(b) => confirmHold(b, { grouped: Boolean(group) })}
          closePanel={closePanel}
          selection={selection}
          onOpenFromSelection={(b) => { setViewPicked(false); openEdit(b); }}
          onConfirmAll={confirmPicked}
          onDeleteAll={deletePicked}
          onCloseSelection={() => setViewPicked(false)}
        />
      </div>
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
