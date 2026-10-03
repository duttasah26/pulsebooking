import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { CalendarBlank, CaretLeft, CaretRight, Plus } from '@phosphor-icons/react';
import RoomGrid from './RoomGrid';
import OccupancyMonth from './OccupancyMonth';
import DayView from './DayView';
import BookingSheet, { BookingForm } from '../BookingSheet';
import { useToast } from '../Toast';
import { api, useApi } from '../../lib/useApi';
import { useMediaQuery } from '../../lib/useMediaQuery';
import {
  addDays, addMonths, daysInMonth, diffDays, fmtDayMonth, fmtDayMonthYear, fmtLong, fmtMonth, isDate, monthStart, range, today,
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

/*
  How booking works on the calendar:
    - A drag (or tap, then tap on a phone) places an on-hold booking straight away. There is no separate "draft" step.
    - The side panel then opens on that hold. Type an organization or name and it becomes the hold's label;
      add the guest and change the status to confirm it.
    - Click a room number to put another room on the same hold (rooms need not be next to each other).
    - X on a hold removes just that room. Undo puts it back.
    - The blank form on the right is for entering a full booking by hand.
*/
export default function CalendarPage() {
  const router = useRouter();
  const toast = useToast();
  const wide = useMediaQuery('(min-width: 1024px)');
  const { view, date, span, set } = useParams();
  const [panel, setPanel] = useState(null); // { booking } while a booking or hold is open for editing

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
  const fetched = bookings.data;

  // Holds appear (and disappear) instantly, before the server has answered. `extra` holds bookings added locally,
  // `removed` holds ids deleted locally. Both are tidied once a fresh list arrives.
  const [extra, setExtra] = useState([]);
  const [removed, setRemoved] = useState(() => new Set());
  useEffect(() => {
    if (!fetched) return;
    const ids = new Set(fetched.map((b) => b.id));
    setExtra((list) => (list.some((b) => ids.has(b.id)) ? list.filter((b) => !ids.has(b.id)) : list));
    setRemoved((set) => {
      const kept = [...set].filter((id) => ids.has(id));
      return kept.length === set.size ? set : new Set(kept);
    });
  }, [fetched]);
  const bookingList = useMemo(
    () => [...(fetched ?? []), ...extra].filter((b) => !removed.has(b.id)),
    [fetched, extra, removed],
  );

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

  const forget = (id) => setRemoved((set) => new Set(set).add(id));
  const unforget = (id) =>
    setRemoved((set) => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });

  const closePanel = () => setPanel(null);

  // The open booking as the latest list has it, and (for a hold) every room held together with it.
  const panelBooking = panel ? bookingList.find((b) => b.id === panel.booking.id) ?? panel.booking : null;
  const isHoldOpen = panelBooking?.status === 'on_hold';
  const group = useMemo(() => {
    if (!panelBooking || panelBooking.status !== 'on_hold') return null;
    if (!panelBooking.group_id) return [panelBooking];
    return bookingList.filter((b) => b.group_id === panelBooking.group_id && b.status === 'on_hold');
  }, [panelBooking, bookingList]);

  // Remove one booking (the X on a hold). It vanishes at once; Undo brings it back.
  // The server removes a hold for good and soft-deletes anything else, so Undo recreates a hold and restores the rest.
  const removeBooking = async (b) => {
    if (b.id < 0) return; // still being saved
    forget(b.id);
    setExtra((list) => list.filter((x) => x.id !== b.id));
    if (panel?.booking.id === b.id) setPanel(null);
    try {
      const res = await api(`/api/bookings/${b.id}`, { method: 'DELETE' });
      bookings.reload();
      toast({
        message: res.hold ? 'Hold removed' : 'Booking removed',
        actionLabel: 'Undo',
        onAction: async () => {
          try {
            if (res.hold) {
              const [again] = await api('/api/bookings', {
                method: 'POST',
                body: {
                  room_ids: [b.room_id], check_in: b.check_in, check_out: b.check_out, status: 'on_hold',
                  group_id: b.group_id, color: b.color, label: b.label, organization: b.organization,
                  check_in_time: b.check_in_time, check_out_time: b.check_out_time,
                },
              });
              setExtra((list) => [...list, again]);
            } else {
              await api(`/api/bookings/${b.id}/restore`, { method: 'POST' });
              unforget(b.id);
            }
            bookings.reload();
          } catch (err) {
            toast({ message: `Could not restore: ${err.message}` });
          }
        },
      });
    } catch (err) {
      unforget(b.id);
      toast({ message: err.message });
    }
  };

  // Place an on-hold booking. It shows on the grid immediately (with a stable key, so it does not flicker when the
  // server confirms it) and is saved in the background. opts.groupId / opts.copy add a room to an existing hold.
  const placeHold = async ({ roomIds, checkIn, checkOut }, opts = {}) => {
    const stamp = Date.now();
    const groupId = opts.groupId ?? crypto.randomUUID();
    const copy = opts.copy ?? {};
    const known = rooms.data ?? [];
    const temps = roomIds.map((roomId, i) => {
      const room = known.find((r) => r.id === roomId);
      return {
        id: -(stamp + i), clientKey: `tmp-${stamp}-${i}`, room_id: roomId, room_number: room?.number ?? '', room_color: room?.color ?? null,
        guest_id: null, name: copy.label || copy.organization || 'On hold', phone: null, email: null,
        check_in: checkIn, check_out: checkOut, nights: diffDays(checkIn, checkOut), status: 'on_hold', channel: 'Direct',
        rate_plan: 'EP', adults: 1, children: 0, notes: null, color: copy.color ?? null, organization: copy.organization ?? null,
        label: copy.label ?? null, group_id: groupId, check_in_time: copy.check_in_time ?? null, check_out_time: copy.check_out_time ?? null,
      };
    });
    const isTemp = (b) => temps.some((t) => t.id === b.id);
    setExtra((list) => [...list, ...temps]);
    try {
      const created = await api('/api/bookings', {
        method: 'POST',
        body: {
          room_ids: roomIds, check_in: checkIn, check_out: checkOut, status: 'on_hold', group_id: groupId,
          color: copy.color ?? null, label: copy.label ?? null, organization: copy.organization ?? null,
          check_in_time: copy.check_in_time ?? null, check_out_time: copy.check_out_time ?? null,
        },
      });
      // Same key as the temporary row, so React keeps the same element: no re-animation, no flash.
      const real = created.map((b, i) => ({ ...b, clientKey: temps[i]?.clientKey }));
      setExtra((list) => [...list.filter((b) => !isTemp(b)), ...real]);
      bookings.reload();
      if (!opts.keepPanel) setPanel({ booking: real[0] }); // open it so details can be typed in
      toast({
        message: roomIds.length > 1 ? `${roomIds.length} rooms on hold` : 'Room on hold',
        actionLabel: 'Undo',
        onAction: async () => {
          created.forEach((b) => forget(b.id));
          setExtra((list) => list.filter((b) => !created.some((c) => c.id === b.id)));
          setPanel((p) => (p && created.some((c) => c.id === p.booking.id) ? null : p));
          await Promise.all(created.map((b) => api(`/api/bookings/${b.id}`, { method: 'DELETE' })));
          bookings.reload();
        },
      });
    } catch (err) {
      setExtra((list) => list.filter((b) => !isTemp(b)));
      toast({ message: err.message });
    }
  };

  // A drag, a tap-tap, or the Day view's Hold button: place a hold at once.
  const openCreate = (sel) => placeHold(sel);
  const openEdit = (booking) => setPanel({ booking });

  // Click a room number while a hold is open: put that room on the same hold, or take it off.
  const toggleRoom = async (roomId) => {
    if (!panelBooking || !isHoldOpen || !group) return;
    const existing = group.find((b) => b.room_id === roomId);
    if (existing) {
      if (group.length > 1) removeBooking(existing);
      return;
    }
    const number = (rooms.data ?? []).find((r) => r.id === roomId)?.number;
    for (let d = panelBooking.check_in; d < panelBooking.check_out; d = addDays(d, 1)) {
      if (isBusy(roomId, d)) return toast({ message: `Room ${number} is already booked on those dates`, duration: 3000 });
    }
    let groupId = panelBooking.group_id;
    if (!groupId) {
      // an older hold with no group yet: give it one so the rooms stay together
      groupId = crypto.randomUUID();
      try {
        await api(`/api/bookings/${panelBooking.id}`, { method: 'PATCH', body: { group_id: groupId } });
      } catch (err) {
        return toast({ message: err.message });
      }
    }
    placeHold(
      { roomIds: [roomId], checkIn: panelBooking.check_in, checkOut: panelBooking.check_out },
      { groupId, keepPanel: true, copy: panelBooking },
    );
  };

  if (!mounted || !router.isReady) return <Skeleton />;

  const roomList = rooms.data ?? [];
  const failed = rooms.error || bookings.error;
  const showGrid = view === 'timeline' || view === 'month';
  const activeIds = group ? new Set(group.map((b) => b.id)) : undefined;
  const activeRoomIds = group ? group.map((b) => b.room_id) : undefined;

  const blank = roomList.length
    ? { mode: 'create', defaults: { roomIds: [roomList[0].id], checkIn: today(), checkOut: addDays(today(), 1) } }
    : null;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start lg:gap-4">
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
                onDelete={removeBooking}
                onToggleRoom={isHoldOpen ? toggleRoom : undefined}
                activeIds={activeIds}
                activeRoomIds={activeRoomIds}
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
            <span className="hidden sm:inline">Drag across free nights to place a hold. </span>
            <span className="sm:hidden">Tap one corner, then the opposite corner, to place a hold. </span>
            Then type the organization or name, and click other room numbers to hold more rooms. X removes one.
          </p>
        )}
      </div>

      {/* Wide screens: the form is always here, beside the calendar. */}
      {wide && (panel || blank) && (
        <aside
          aria-label="Booking form"
          className="no-scrollbar sticky top-[4.5rem] max-h-[calc(100dvh-5.5rem)] overflow-y-auto overscroll-contain rounded-lg border border-line bg-surface"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <h2 className="text-base font-semibold">{panel ? (isHoldOpen ? 'Hold' : 'Edit booking') : 'New booking'}</h2>
            {panel && (
              <button type="button" className="btn" onClick={closePanel}>
                <Plus size={18} /> New
              </button>
            )}
          </div>
          <div className="px-4 pt-4">
            {panel ? (
              <BookingForm
                key={`edit-${panel.booking.id}`}
                mode="edit"
                booking={panelBooking}
                group={group}
                rooms={roomList}
                isBusy={isBusy}
                onSaved={reload}
                onDone={closePanel}
                onCancel={closePanel}
              />
            ) : (
              <BookingForm key="blank" {...blank} rooms={roomList} isBusy={isBusy} onSaved={reload} onDone={() => {}} />
            )}
          </div>
        </aside>
      )}

      {/* Phones and tablets: the hold or booking opens as a bottom sheet. */}
      {!wide && panel && (
        <BookingSheet
          key={`edit-${panel.booking.id}`}
          mode="edit"
          booking={panelBooking}
          group={group}
          rooms={roomList}
          isBusy={isBusy}
          onClose={closePanel}
          onSaved={reload}
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
