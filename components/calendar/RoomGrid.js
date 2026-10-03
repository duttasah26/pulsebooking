import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { diffDays, fmtDayMonth, isWeekend, nightsLabel, today } from '../../lib/dates';
import { HEAD, LABEL, barGeometry, cellSize, dayFraction, gridMinWidth, gridTemplate, placeAt } from './grid/gridLayout';
import { useSettings } from '../SettingsProvider';
import { useOccupancy } from './grid/useOccupancy';
import { useGridSelection } from './grid/useGridSelection';
import { useMarquee } from './grid/useMarquee';
import { useBarResize } from './grid/useBarResize';
import TimelineNavigator from './grid/TimelineNavigator';
import { ArrowCounterClockwise } from '@phosphor-icons/react';
import { DayHeader, DayLabel, GridCorner, RoomHead } from './grid/GridHeaders';
import GridCell from './grid/GridCell';
import BookingBar from './grid/BookingBar';
import GhostBar from './grid/GhostBar';
import BarHandles from './grid/BarHandles';
import { SelectionSummary, TouchBar } from './grid/SelectionOverlay';

/*
  The room calendar. One grid, two layouts:
    orientation="rows": rooms down the side, days across (timeline)
    orientation="cols": days down the side, rooms across (the default month sheet)
  Selecting nights places a hold (see grid/useGridSelection.js). In select mode (selectMode) a drag ticks bookings
  instead (grid/useMarquee.js) and picked / onPick hold the ticked ids. Bars run from the middle of the arrival day to the
  middle of the departure day (see grid/gridLayout.js). `zoom` scales the whole grid.
*/
export const MIN_WIDTH_SCALE = 0.5;
export const MAX_WIDTH_SCALE = 3;

export default function RoomGrid({
  rooms, days, bookings, orientation, onCreate, onOpen, onDelete, onToggleRoom, activeIds, activeRoomIds, zoom = 1,
  holdEnabled = true, selectMode = false, picked, onPick, onView, preview, visibleDays, onNeedMore, onShift, isBusy, onResize, widthScale = 1, onWidthScale, homeKey, lead = 0, anchorDate, onNeedBack, onOpenGroup,
}) {
  const rows = orientation === 'rows';
  const n = days.length;
  const start = days[0];
  const todayStr = today();
  const scrollRef = useRef(null);
  const gridRef = useRef(null);
  const placing = holdEnabled && !selectMode; // pencil on: drag free nights to hold, drag a booking's end to stretch it

  // The grid is sized to the window so the page itself never needs to scroll: `avail` is the height from the top of the
  // grid down to the bottom of the screen (less room for the zoom bar). In the timeline the rows then share that height
  // (24 to 56px each), so every room of the chosen floors is in view; if even 24px rows do not fit, the grid scrolls inside.
  const [avail, setAvail] = useState(null);
  const [boxW, setBoxW] = useState(0); // width of the scrolling box, so `visibleDays` days fill it exactly
  useEffect(() => {
    const measure = () => {
      const el = scrollRef.current;
      if (!el) return;
      const reserve = (window.innerWidth < 768 ? 190 : 140) + (rows ? 22 : 0); // zoom bar, page padding, the status bar (phones: and the bottom nav) and the navigator bar
      setBoxW(el.clientWidth);
      setAvail(Math.max(240, Math.floor(window.innerHeight - (el.getBoundingClientRect().top + window.scrollY) - reserve)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [rows, rooms.length]);

  const base = cellSize(rows);
  const baseH = base.cellH;
  // Timeline: `visibleDays` days share the box width (24px at the least); the days after them are reached by scrolling.
  // The day width slider under the grid scales that fit: 1 shows exactly `visibleDays`, more makes the days wider (fewer in view).
  const fitW = rows && visibleDays && boxW ? (boxW / zoom - LABEL) / visibleDays : 0;
  const cellW = fitW ? Math.max(24, fitW * widthScale) : base.cellW; // not rounded, so 30 days is exactly 30
  const inViewF = fitW ? (boxW / zoom - LABEL) / cellW : visibleDays; // days in view, exactly (the navigator bar needs the fraction)
  const inView = Math.max(1, Math.round(inViewF));
  // The navigator bar widens or narrows the days; `anchor` is the day that must stay at the left edge afterwards.
  const [scrollPos, setScrollPos] = useState(0);
  const anchor = useRef(null);
  const changeScale = (scale, anchorDay) => {
    anchor.current = anchorDay;
    onWidthScale?.(Math.min(MAX_WIDTH_SCALE, Math.max(MIN_WIDTH_SCALE, Math.round(scale * 100) / 100)));
  };
  // Timeline position, kept as "which day (counted from the first loaded day) is at the left edge". `lead` days before the
  // chosen start date are loaded too, so the past can be scrolled to; the start date itself is where the view opens.
  const dayPx = cellW * zoom;
  const firstRef = useRef(lead);
  const prevLead = useRef(lead);
  const goHome = () => {
    if (!rows || !scrollRef.current) return;
    firstRef.current = lead;
    scrollRef.current.scrollLeft = lead * dayPx;
    shifted.current = 0;
    onShift?.(0);
  };
  // Back to the default: the chosen number of days fill the screen, from the start date.
  const resetNav = () => {
    if (widthScale !== 1) {
      anchor.current = lead;
      onWidthScale?.(1);
    } else goHome();
  };
  // When the day width changes (the navigator bar, the window size, the first measurement), keep the same day at the left edge.
  useLayoutEffect(() => {
    if (!rows || !scrollRef.current) return;
    const day = anchor.current !== null ? anchor.current : firstRef.current;
    anchor.current = null;
    firstRef.current = day;
    scrollRef.current.scrollLeft = day * dayPx;
  }, [dayPx]); // eslint-disable-line react-hooks/exhaustive-deps
  // More past days were loaded in front: keep looking at the same day.
  useLayoutEffect(() => {
    const added = lead - prevLead.current;
    prevLead.current = lead;
    if (!rows || added <= 0 || !scrollRef.current) return;
    firstRef.current += added;
    scrollRef.current.scrollLeft = firstRef.current * dayPx;
  }, [lead]); // eslint-disable-line react-hooks/exhaustive-deps
  const cellH = rows && avail ? Math.min(56, Math.max(24, Math.floor((avail / zoom - HEAD) / rooms.length))) : baseH;
  const place = (r, i, len) => placeAt(rows, r, i, len);

  const { settings } = useSettings();
  // Bars start and end at the booking's own times, or the default check-in and check-out times when it has none.
  const defaultIn = dayFraction(settings.checkInTime, 0.5);
  const defaultOut = dayFraction(settings.checkOutTime, 0.5);
  // The booking being stretched with the pencil is drawn with its new dates while the pointer is down.
  // Letting go of a drag does not save: the booking keeps its new dates as a pending change, with Save and Cancel next
  // to it. `pending` is { original, checkIn, checkOut, roomId, x, y } (original = the booking as it was saved).
  const [pending, setPending] = useState(null);
  const hold = (b, checkIn, checkOut, roomId, at) =>
    setPending((p) => ({ original: p && p.original.id === b.id ? p.original : bookings.find((x) => x.id === b.id) ?? b, checkIn, checkOut, roomId, ...at }));
  const resize = useBarResize({ enabled: placing && Boolean(onResize), rows, days, rooms, gridRef, zoom, isBusy, onResize: hold });
  const savePending = () => {
    const p = pending;
    setPending(null);
    onResize(p.original, p.checkIn, p.checkOut, p.roomId);
  };
  useEffect(() => {
    if (!pending) return;
    const onKey = (e) => e.key === 'Escape' && setPending(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);
  useEffect(() => {
    if (!placing) setPending(null); // switching tool, or leaving the pencil, drops an unsaved change
  }, [placing]);
  const drawn = useMemo(() => {
    const d = resize.drag ?? (pending && { id: pending.original.id, checkIn: pending.checkIn, checkOut: pending.checkOut, roomId: pending.roomId });
    if (!d) return bookings;
    const room = rooms.find((r) => r.id === d.roomId);
    return bookings.map((b) => (b.id === d.id
      ? { ...b, check_in: d.checkIn, check_out: d.checkOut, nights: diffDays(d.checkIn, d.checkOut), room_id: d.roomId, room_number: room?.number ?? b.room_number }
      : b));
  }, [bookings, rooms, resize.drag, pending]);
  const { roomIndex, occupancy } = useOccupancy(rooms, drawn, days);
  const selection = useGridSelection({ rooms, days, occupancy, onCreate });
  const { sel, summary, isFree, selected, cornerR, cornerI, roomCount, nightCount } = selection;
  // Timeline: every room is always shown (the page scrolls down), and only the dates scroll sideways. Its scrollbar sits
  // above the date header, kept in step with the grid, so it is always in reach.
  const topBar = useRef(null);
  const [scrollW, setScrollW] = useState(0);
  useEffect(() => {
    if (!rows) return;
    const el = scrollRef.current;
    const measure = () => setScrollW(el.scrollWidth);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(el.firstElementChild);
    measure();
    return () => ro.disconnect();
  }, [rows, n, rooms.length, zoom]);
  // Near the right end of the loaded days, ask for another screen's worth (once per length, so a fast scroll asks once).
  const asked = useRef(0);
  const askedBack = useRef(0);
  const shifted = useRef(0);
  const onTimelineScroll = (e) => {
    follow(scrollRef, topBar)();
    const el = e.currentTarget;
    setScrollPos(el.scrollLeft);
    // Tell the page which day is now at the left edge (counted from the start date, so negative in the past), so its heading follows.
    firstRef.current = el.scrollLeft / dayPx;
    const first = Math.floor(firstRef.current + 0.05) - lead;
    if (first !== shifted.current) {
      shifted.current = first;
      onShift?.(first);
    }
    if (onNeedBack && askedBack.current !== n && el.scrollLeft < el.clientWidth) {
      askedBack.current = n;
      onNeedBack();
    }
    if (onNeedMore && asked.current !== n && el.scrollLeft + el.clientWidth > el.scrollWidth - el.clientWidth) {
      asked.current = n;
      onNeedMore();
    }
  };
  // A new start date or length, the Today button, or picking a length: back to the start date at the left edge.
  useEffect(() => {
    goHome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, anchorDate, visibleDays, homeKey]);
  const follow = (from, to) => () => {
    if (to.current && to.current.scrollLeft !== from.current.scrollLeft) to.current.scrollLeft = from.current.scrollLeft;
  };
  // When quick hold is off (the default) a drag anywhere draws a selection box instead.
  const marquee = useMarquee({ enabled: !placing, containerRef: scrollRef, picked, onPick });
  const toggleBar = (b) =>
    onPick((prev) => {
      const next = new Set(prev);
      if (next.has(b.id)) next.delete(b.id);
      else next.add(b.id);
      return next;
    });

  // Bars in arrival order, so on a turnover day the later arrival is drawn on top.
  const bars = useMemo(() => {
    const out = [];
    const sorted = [...drawn].sort((x, y) => (x.check_in < y.check_in ? -1 : x.check_in > y.check_in ? 1 : x.id - y.id));
    for (const b of sorted) {
      if (b.status === 'cancelled') continue;
      const r = roomIndex.get(b.room_id);
      const g = r === undefined ? null : barGeometry(
        { rows, start, n, cellH }, b.check_in, b.check_out,
        dayFraction(b.check_in_time, defaultIn), dayFraction(b.check_out_time, defaultOut),
      );
      if (g) out.push({ b, r, g });
    }
    return out;
  }, [drawn, roomIndex, rows, start, n, cellH, defaultIn, defaultOut]);

  // The booking being filled in (see BookingWizard) as a see-through bar in each chosen room.
  const ghosts = useMemo(() => {
    if (!preview) return [];
    const out = [];
    for (const id of preview.roomIds) {
      const r = roomIndex.get(id);
      const g = r === undefined ? null : barGeometry(
        { rows, start, n, cellH }, preview.checkIn, preview.checkOut,
        dayFraction(preview.checkInTime, defaultIn), dayFraction(preview.checkOutTime, defaultOut),
      );
      if (g) out.push({ room: id, r, g });
    }
    return out;
  }, [preview, roomIndex, rows, start, n, cellH, defaultIn, defaultOut]);

  const heads = rooms.map((room, r) => (
    <RoomHead
      key={room.id}
      room={room}
      r={r}
      rows={rows}
      active={Boolean(activeRoomIds?.includes(room.id))}
      onToggle={onToggleRoom}
    />
  ));

  return (
    <div className="relative">
      {rows && (
        <div
          ref={topBar}
          aria-hidden="true"
          onScroll={follow(topBar, scrollRef)}
          className="scroll-area mb-1 overflow-x-auto overflow-y-hidden rounded-lg border border-line bg-surface-2"
        >
          <div style={{ width: scrollW, height: 1 }} />
        </div>
      )}
      <div
        ref={scrollRef}
        onScroll={rows ? onTimelineScroll : undefined}
        className={`scroll-area rounded-lg border border-line bg-surface ${
          rows ? 'no-scrollbar overflow-x-auto overscroll-x-contain' : 'min-h-64 overflow-auto overscroll-contain'
        } ${avail ? '' : 'max-h-[calc(100dvh-17rem)]'}`}
        style={avail ? { maxHeight: avail } : undefined}
        onPointerMove={placing ? selection.onPointerMove : undefined}
        onPointerDown={marquee.onPointerDown}
        onClickCapture={marquee.onClickCapture}
      >
        <div
          className={`grid select-none ${selectMode ? 'cursor-crosshair' : ''}`}
          ref={gridRef}
          role="grid"
          aria-label="Room availability"
          style={{ ...gridTemplate({ rows, n, rooms, cellW, cellH }), minWidth: gridMinWidth({ rows, n, rooms, cellW }), zoom }}
        >
          <GridCorner />
          {rows ? days.map((d, i) => <DayHeader key={d} d={d} i={i} isToday={d === todayStr} />) : heads}
          {rows ? heads : days.map((d, i) => <DayLabel key={d} d={d} i={i} isToday={d === todayStr} />)}

          {rooms.map((room, r) =>
            days.map((d, i) => (
              <GridCell
                key={`${room.id}-${d}`}
                room={room}
                d={d}
                free={placing && isFree(r, i)}
                selected={placing && selected(r, i)}
                chip={sel && r === cornerR && i === cornerI ? `${roomCount > 1 ? `${roomCount}x` : ''}${nightCount}n` : null}
                r={r}
                i={i}
                style={place(r, i)}
                onPointerDown={placing ? (e) => selection.onPointerDown(e, r, i) : undefined}
                onClick={placing ? (e) => selection.onClick(e, r, i) : undefined}
              />
            )),
          )}

          {bars.map(({ b, r, g }) => (
            <BookingBar
              key={b.clientKey ?? b.id}
              b={b}
              g={g}
              rows={rows}
              style={place(r, g.a, g.len)}
              active={Boolean(activeIds?.has(b.id))}
              selectMode={selectMode}
              picked={Boolean(picked?.has(b.id))}
              onOpen={onOpen}
              onPick={toggleBar}
              onView={onView}
              onOpenGroup={onOpenGroup}
              movable={placing && Boolean(onResize) && b.id > 0}
              onMoveStart={resize.startResize}
              resizing={resize.drag?.id === b.id || pending?.original.id === b.id}
              onDelete={onDelete}
            />
          ))}

          {placing && onResize && bars.map(({ b, r, g }) =>
            b.id > 0 ? <BarHandles key={`h-${b.clientKey ?? b.id}`} b={b} g={g} rows={rows} style={place(r, g.a, g.len)} onStart={resize.startResize} /> : null,
          )}

          {ghosts.map(({ room, r, g }) => (
            <GhostBar key={room} g={g} rows={rows} style={place(r, g.a, g.len)} tone={preview.tone} name={preview.name} />
          ))}
        </div>
      </div>

      {pending && !resize.drag && (
        <div
          role="group"
          aria-label="Unsaved change"
          className="fixed z-[60] flex items-center gap-2 rounded-lg border border-line bg-surface p-1.5 pl-3 text-sm shadow-lg"
          style={{ left: Math.max(8, Math.min(pending.x + 12, window.innerWidth - 330)), top: Math.max(8, Math.min(pending.y + 14, window.innerHeight - 56)) }}
        >
          <span className="whitespace-nowrap">
            {rooms.find((r) => r.id === pending.roomId)?.number ? `Room ${rooms.find((r) => r.id === pending.roomId).number}: ` : ''}
            <strong className="font-semibold">{fmtDayMonth(pending.checkIn)} to {fmtDayMonth(pending.checkOut)}</strong>
            <span className="text-muted">, {nightsLabel(diffDays(pending.checkIn, pending.checkOut))}</span>
          </span>
          <button type="button" className="btn min-h-8 px-3 lg:min-h-8" onClick={() => setPending(null)}>Cancel</button>
          <button type="button" className="btn btn-primary min-h-8 px-3 lg:min-h-8" onClick={savePending}>Save</button>
        </div>
      )}
      {resize.drag && resize.drag.x !== undefined && (
        <p
          aria-live="polite"
          className="pointer-events-none fixed z-[60] rounded-lg bg-ink px-2.5 py-1 text-xs font-medium text-canvas shadow-lg"
          style={{ left: resize.drag.x + 14, top: resize.drag.y + 16 }}
        >
          {rooms.find((r) => r.id === resize.drag.roomId)?.number ? `Room ${rooms.find((r) => r.id === resize.drag.roomId).number}: ` : ''}
          {fmtDayMonth(resize.drag.checkIn)} to {fmtDayMonth(resize.drag.checkOut)}, {nightsLabel(diffDays(resize.drag.checkIn, resize.drag.checkOut))}
        </p>
      )}
      {marquee.box && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[45] rounded-sm border border-accent bg-accent/15"
          style={marquee.box}
        />
      )}
      {rows && fitW > 0 && (
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
          <div className="min-w-0 flex-1">
            <TimelineNavigator
              scrollRef={scrollRef}
              n={n}
              dayPx={cellW * zoom}
              first={scrollPos / (cellW * zoom)}
              inView={inViewF}
              span={visibleDays}
              minScale={MIN_WIDTH_SCALE}
              maxScale={MAX_WIDTH_SCALE}
              onScale={changeScale}
            />
          </div>
          <span className="w-16 shrink-0 text-right font-mono">{inView} days</span>
          <button type="button" className="btn btn-icon min-h-7 min-w-7 shrink-0 lg:min-h-7" title={`Default view: ${visibleDays} days fill the screen, from the first day`} aria-label="Reset to the default view" onClick={resetNav}>
            <ArrowCounterClockwise size={15} aria-hidden="true" />
          </button>
        </div>
      )}
      <SelectionSummary summary={summary} />
      {sel?.pending && <TouchBar summary={summary} onCancel={selection.cancel} onHold={selection.confirm} />}
    </div>
  );
}
