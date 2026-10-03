import { useMemo } from 'react';
import { isWeekend, today } from '../../lib/dates';
import { barGeometry, cellSize, gridMinWidth, gridTemplate, placeAt } from './grid/gridLayout';
import { useOccupancy } from './grid/useOccupancy';
import { useGridSelection } from './grid/useGridSelection';
import { DayHeader, DayLabel, GridCorner, RoomHead } from './grid/GridHeaders';
import GridCell from './grid/GridCell';
import BookingBar from './grid/BookingBar';
import { SelectionSummary, TouchBar } from './grid/SelectionOverlay';

/*
  The room calendar. One grid, two layouts:
    orientation="rows": rooms down the side, days across (timeline)
    orientation="cols": days down the side, rooms across (the default month sheet)
  Selecting nights places a hold (see grid/useGridSelection.js). Bars run from the middle of the arrival day to the
  middle of the departure day (see grid/gridLayout.js). `zoom` scales the whole grid.
*/
export default function RoomGrid({
  rooms, days, bookings, orientation, onCreate, onOpen, onDelete, onToggleRoom, activeIds, activeRoomIds, zoom = 1,
}) {
  const rows = orientation === 'rows';
  const n = days.length;
  const start = days[0];
  const todayStr = today();
  const { cellW, cellH } = cellSize(rows);
  const place = (r, i, len) => placeAt(rows, r, i, len);

  const { roomIndex, occupancy } = useOccupancy(rooms, bookings, days);
  const selection = useGridSelection({ rooms, days, occupancy, onCreate });
  const { sel, summary, isFree, selected, cornerR, cornerI, roomCount, nightCount } = selection;

  // Bars in arrival order, so on a turnover day the later arrival is drawn on top.
  const bars = useMemo(() => {
    const out = [];
    const sorted = [...bookings].sort((x, y) => (x.check_in < y.check_in ? -1 : x.check_in > y.check_in ? 1 : x.id - y.id));
    for (const b of sorted) {
      if (b.status === 'cancelled') continue;
      const r = roomIndex.get(b.room_id);
      const g = r === undefined ? null : barGeometry({ rows, start, n, cellH }, b.check_in, b.check_out);
      if (g) out.push({ b, r, g });
    }
    return out;
  }, [bookings, roomIndex, rows, start, n, cellH]);

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
      <div
        className="max-h-[calc(100dvh-15rem)] min-h-64 overflow-auto overscroll-contain rounded-lg border border-line bg-surface md:max-h-[calc(100dvh-9.5rem)]"
        onPointerMove={selection.onPointerMove}
      >
        <div
          className="grid select-none"
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
                free={isFree(r, i)}
                selected={selected(r, i)}
                chip={sel && r === cornerR && i === cornerI ? `${roomCount > 1 ? `${roomCount}x` : ''}${nightCount}n` : null}
                r={r}
                i={i}
                style={place(r, i)}
                onPointerDown={(e) => selection.onPointerDown(e, r, i)}
                onClick={(e) => selection.onClick(e, r, i)}
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
              onOpen={onOpen}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>

      <SelectionSummary summary={summary} />
      {sel?.pending && <TouchBar summary={summary} onCancel={selection.cancel} onHold={selection.confirm} />}
    </div>
  );
}
