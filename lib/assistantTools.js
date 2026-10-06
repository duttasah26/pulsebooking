import sql from './db';
import { HttpError, parseDate } from './api';
import { addDays, addMonths, daysInMonth, diffDays, monthStart } from './dates';
import { createBookings } from './createBookings';

/*
  What the chat assistant can look up, and the one thing it can do: book_stay (at the bottom) makes a booking or a hold. Every other
  tool is READ-ONLY: it only runs SELECT queries, never writes, and returns plain numbers and names. Contact details (phone, email, organization) come only from find_contact, when a question
  needs them. The assistant model calls these by name with JSON arguments
  (pages/api/assistant.js runs the loop). Each tool: { name, description, parameters, run(args) }.

  Conventions (also told to the model): dates are YYYY-MM-DD; a stay is check_in to check_out where check_out is the day
  the guest LEAVES, so nights = check_out - check_in. A booking that is deleted or cancelled does not count. Holds
  (status on_hold) are tentative: they block the room but are reported separately from real bookings.
*/

// Today's date in the property's time zone (India), whatever the server's own clock says.
export const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

const LIVE = sql`b.deleted_at IS NULL AND b.status <> 'cancelled'`;

const range = (checkIn, checkOut) => {
  const a = parseDate(checkIn, 'check_in');
  const b = parseDate(checkOut, 'check_out');
  if (b <= a) throw new HttpError(400, 'check_out must be after check_in');
  if (diffDays(a, b) > 366) throw new HttpError(400, 'Ask for a range of at most a year');
  return [a, b];
};

// "2026-11", or "this", "next", "previous" (relative to today in India).
function monthRange(month) {
  const t = todayIST();
  let first;
  if (!month || month === 'this') first = monthStart(t);
  else if (month === 'next') first = addMonths(monthStart(t), 1);
  else if (month === 'previous' || month === 'last') first = addMonths(monthStart(t), -1);
  else if (/^\d{4}-\d{2}$/.test(month)) first = `${month}-01`;
  else throw new HttpError(400, 'month must be YYYY-MM, or this, next or previous');
  return [first, addMonths(first, 1), daysInMonth(first)];
}

// Staff say "ZB" for "Zee Bangla". A short query of 2 to 6 letters also matches every known guest, organization or hold
// label whose initials spell it, so searches find the full name. Returns the list of texts to look for.
const initials = (text) => String(text).split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w[0]).join('').toLowerCase();

async function searchTerms(query) {
  const typed = String(query ?? '').trim().slice(0, 60);
  const terms = new Set(typed ? [typed] : []);
  const letters = typed.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (letters.length >= 2 && letters.length <= 6) {
    const known = await sql`
      SELECT name AS n FROM guests
      UNION SELECT organization FROM guests WHERE organization IS NOT NULL
      UNION SELECT organization FROM bookings WHERE organization IS NOT NULL
      UNION SELECT label FROM bookings WHERE label IS NOT NULL AND label <> ''`;
    for (const { n } of known) if (n && initials(n) === letters) terms.add(n);
  }
  return [...terms].map((t) => `%${t}%`);
}

const activeRooms = async () => (await sql`SELECT id, number FROM rooms WHERE active ORDER BY number`);

const freeRooms = (a, b) => sql`
  SELECT r.number
  FROM rooms r
  WHERE r.active AND NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.room_id = r.id AND ${LIVE} AND b.stay && daterange(${a}::date, ${b}::date, '[)')
  )
  ORDER BY r.number`;

const dateProps = {
  check_in: { type: 'STRING', description: 'Check-in date, YYYY-MM-DD' },
  check_out: { type: 'STRING', description: 'Check-out date (the day they leave), YYYY-MM-DD' },
};

export const TOOLS = [
  {
    name: 'check_availability',
    description: 'Which rooms are free for a stay (check_in to check_out), and which are booked or on hold.',
    parameters: { type: 'OBJECT', properties: dateProps, required: ['check_in', 'check_out'] },
    async run({ check_in, check_out }) {
      const [a, b] = range(check_in, check_out);
      const all = await activeRooms();
      const free = (await freeRooms(a, b)).map((r) => r.number);
      const held = (
        await sql`
          SELECT DISTINCT r.number FROM bookings b JOIN rooms r ON r.id = b.room_id
          WHERE ${LIVE} AND b.status = 'on_hold' AND b.stay && daterange(${a}::date, ${b}::date, '[)') ORDER BY r.number`
      ).map((r) => r.number);
      return {
        check_in: a, check_out: b, nights: diffDays(a, b),
        free_rooms: free, free_count: free.length,
        unavailable_rooms: all.map((r) => r.number).filter((n) => !free.includes(n)),
        of_which_on_hold: held, total_rooms: all.length,
      };
    },
  },
  {
    name: 'find_room_block',
    description: 'Find rooms for a group: the best set of rooms_needed free rooms for a stay, preferring rooms next to each other on one floor.',
    parameters: { type: 'OBJECT', properties: { ...dateProps, rooms_needed: { type: 'INTEGER', description: 'How many rooms' } }, required: ['check_in', 'check_out', 'rooms_needed'] },
    async run({ check_in, check_out, rooms_needed }) {
      const [a, b] = range(check_in, check_out);
      const need = Math.max(1, Math.min(20, Number(rooms_needed) || 1));
      const free = (await freeRooms(a, b)).map((r) => r.number);
      const byFloor = new Map();
      for (const n of free) byFloor.set(n[0], [...(byFloor.get(n[0]) ?? []), n]);
      const options = [];
      for (const [floor, list] of byFloor) {
        if (list.length >= need) options.push({ floor, rooms: list.slice(0, need), note: 'together on one floor' });
      }
      if (!options.length && free.length >= need) options.push({ rooms: free.slice(0, need), note: 'spread over several floors' });
      return { check_in: a, check_out: b, rooms_needed: need, free_count: free.length, enough: free.length >= need, options: options.slice(0, 3) };
    },
  },
  {
    name: 'month_summary',
    description: 'Totals for a calendar month: room-nights booked, room-nights held, occupancy, free room-nights, guests, arrivals, departures. Use it for "how many nights this month", "total guests this month", "is next month busy".',
    parameters: { type: 'OBJECT', properties: { month: { type: 'STRING', description: 'YYYY-MM, or this, next, previous' } } },
    async run({ month }) {
      const [start, end, days] = monthRange(month);
      const span = sql`daterange(${start}::date, ${end}::date, '[)')`;
      const [n] = await sql`
        SELECT
          COALESCE(sum(upper(b.stay * ${span}) - lower(b.stay * ${span})) FILTER (WHERE b.status <> 'on_hold'), 0)::int AS booked_nights,
          COALESCE(sum(upper(b.stay * ${span}) - lower(b.stay * ${span})) FILTER (WHERE b.status = 'on_hold'), 0)::int AS held_nights,
          count(*) FILTER (WHERE b.status <> 'on_hold')::int AS booking_rows,
          count(*) FILTER (WHERE b.status = 'on_hold')::int AS hold_rows
        FROM bookings b WHERE ${LIVE} AND b.stay && ${span}`;
      // Every room row holds its share of the guests, so the total is the sum over the rows.
      const [g] = await sql`
        SELECT COALESCE(sum(b.adults), 0)::int AS adults, COALESCE(sum(b.children), 0)::int AS children,
               count(DISTINCT COALESCE(b.group_id::text, b.id::text))::int AS parties
        FROM bookings b WHERE ${LIVE} AND b.status <> 'on_hold' AND b.stay && ${span}`;
      const [m] = await sql`
        SELECT
          count(DISTINCT COALESCE(b.group_id::text, b.id::text)) FILTER (WHERE lower(b.stay) >= ${start}::date AND lower(b.stay) < ${end}::date)::int AS arrivals,
          count(DISTINCT COALESCE(b.group_id::text, b.id::text)) FILTER (WHERE upper(b.stay) > ${start}::date AND upper(b.stay) <= ${end}::date)::int AS departures
        FROM bookings b WHERE ${LIVE} AND b.status <> 'on_hold' AND b.stay && ${span}`;
      const rooms = (await activeRooms()).length;
      const available = rooms * days;
      return {
        month: start.slice(0, 7), days, rooms,
        available_room_nights: available,
        booked_room_nights: n.booked_nights,
        held_room_nights: n.held_nights,
        free_room_nights: Math.max(0, available - n.booked_nights - n.held_nights),
        occupancy_percent: available ? Math.round((n.booked_nights / available) * 1000) / 10 : 0,
        occupancy_with_holds_percent: available ? Math.round(((n.booked_nights + n.held_nights) / available) * 1000) / 10 : 0,
        guests: { adults: g.adults, children: g.children, total: g.adults + g.children, bookings: g.parties },
        arrivals: m.arrivals, departures: m.departures,
        note: 'Room-nights count one night in one room. Guests are everyone with a stay overlapping the month (added up over the rooms).',
      };
    },
  },
  {
    name: 'free_rooms_by_day',
    description: 'For each day in a range (at most 62 days) how many rooms are free, with the quietest and busiest days. Use it to find the best time to book or whether a period is available.',
    parameters: { type: 'OBJECT', properties: { from: { type: 'STRING', description: 'First day, YYYY-MM-DD' }, to: { type: 'STRING', description: 'Last day, YYYY-MM-DD' } }, required: ['from', 'to'] },
    async run({ from, to }) {
      const a = parseDate(from, 'from');
      const last = parseDate(to, 'to');
      if (last < a) throw new HttpError(400, 'to must not be before from');
      if (diffDays(a, last) > 61) throw new HttpError(400, 'Ask for at most 62 days at a time');
      const total = (await activeRooms()).length;
      const rows = await sql`
        SELECT d::date::text AS day, count(b.id)::int AS busy
        FROM generate_series(${a}::date, ${last}::date, interval '1 day') d
        LEFT JOIN bookings b ON ${LIVE} AND b.stay @> d::date
        GROUP BY d ORDER BY d`;
      const days = rows.map((r) => ({ day: r.day, free_rooms: Math.max(0, total - r.busy) }));
      const sorted = [...days].sort((x, y) => y.free_rooms - x.free_rooms || (x.day < y.day ? -1 : 1));
      return {
        total_rooms: total, days: days.length > 31 ? undefined : days,
        quietest_days: sorted.slice(0, 5), busiest_days: [...sorted].reverse().slice(0, 5),
        fully_booked_days: days.filter((d) => d.free_rooms === 0).map((d) => d.day),
        average_free_rooms: Math.round((days.reduce((s, d) => s + d.free_rooms, 0) / days.length) * 10) / 10,
      };
    },
  },
  {
    name: 'find_contact',
    description:
      'Look up a contact (guest or organization) by name, part of a name, organization, phone or email. Initials such as ZB also work (ZB finds Zee Bangla). Returns their phone, email and organization, how many stays they have (upcoming, current, past), their next upcoming stay, and any bookings or holds made under that organization or label. Use it for "is ZB booking upcoming?", "what is Meera\'s phone number?", "when does Sharma arrive next?".',
    parameters: { type: 'OBJECT', properties: { query: { type: 'STRING', description: 'Name, organization, phone, email or initials' } }, required: ['query'] },
    async run({ query }) {
      const like = await searchTerms(query);
      if (!like.length) throw new HttpError(400, 'Say who to look for');
      const today = todayIST();
      const guests = await sql`
        SELECT g.id, g.name, g.phone, g.email, g.organization, g.notes FROM guests g
        WHERE g.name ILIKE ANY(${like}::text[]) OR g.organization ILIKE ANY(${like}::text[])
           OR g.phone ILIKE ANY(${like}::text[]) OR g.email ILIKE ANY(${like}::text[])
        ORDER BY g.name LIMIT 8`;
      const stays = guests.length
        ? await sql`
            SELECT b.guest_id, r.number AS room, lower(b.stay)::text AS check_in, upper(b.stay)::text AS check_out, b.status
            FROM bookings b JOIN rooms r ON r.id = b.room_id
            WHERE ${LIVE} AND b.guest_id = ANY(${guests.map((g) => g.id)}::int[]) ORDER BY lower(b.stay), r.number`
        : [];
      const matches = guests.map((g) => {
        const mine = stays.filter((x) => x.guest_id === g.id);
        const upcoming = mine.filter((x) => x.check_in > today);
        const current = mine.filter((x) => x.check_in <= today && x.check_out > today);
        const past = mine.filter((x) => x.check_out <= today);
        const brief = (x) => (x ? { room: x.room, check_in: x.check_in, check_out: x.check_out, status: x.status } : null);
        return {
          name: g.name, organization: g.organization, phone: g.phone, email: g.email, notes: g.notes,
          stays: { total: mine.length, upcoming: upcoming.length, current: current.length, past: past.length },
          has_upcoming_booking: upcoming.length > 0,
          next_upcoming_stay: brief(upcoming[0]),
          current_stay: brief(current[0]),
          last_past_stay: brief(past[past.length - 1]),
        };
      });
      // Bookings and holds typed with an organization or a label but no guest saved under it.
      const underName = await sql`
        SELECT r.number AS room, COALESCE(g.name, NULLIF(b.label, ''), 'On hold') AS who, b.organization,
               lower(b.stay)::text AS check_in, upper(b.stay)::text AS check_out, b.status
        FROM bookings b JOIN rooms r ON r.id = b.room_id LEFT JOIN guests g ON g.id = b.guest_id
        WHERE ${LIVE} AND (b.organization ILIKE ANY(${like}::text[]) OR b.label ILIKE ANY(${like}::text[]))
          AND upper(b.stay) > ${today}::date
        ORDER BY lower(b.stay), r.number LIMIT 12`;
      return {
        searched_for: query,
        matches,
        upcoming_bookings_under_this_organization_or_label: underName,
        has_upcoming_booking_under_organization_or_label: underName.length > 0,
        today,
      };
    },
  },
  {
    name: 'list_bookings',
    description:
      'Bookings and holds with everything recorded about each: room, guest or hold label, organization, dates, nights, status, party size, channel, rate plan, notes, WHEN it was made (booked_on, India time) and BY WHOM (booked_by), and when it was last changed. Default: stays in the next 7 days. Use it for "who is arriving today", "what is on hold", "who is in room 204", "what was booked today", "who made the last booking", "which bookings came from Phone". Filter by stay dates (from, to), by the day it was made (made_from, made_to), status, room or name. Ask for cancelled or deleted ones with include.',
    parameters: {
      type: 'OBJECT',
      properties: {
        from: { type: 'STRING', description: 'First day of the stay range, YYYY-MM-DD (default today, unless made_from or made_to is given)' },
        to: { type: 'STRING', description: 'Last day of the stay range, YYYY-MM-DD (default 7 days after from)' },
        made_from: { type: 'STRING', description: 'Only bookings made on or after this day (India), YYYY-MM-DD' },
        made_to: { type: 'STRING', description: 'Only bookings made on or before this day (India), YYYY-MM-DD' },
        status: { type: 'STRING', description: 'confirmed, checked_in, checked_out, cancelled or on_hold (default: all live ones)' },
        include: { type: 'STRING', description: 'live (default), cancelled, deleted or all' },
        room: { type: 'STRING', description: 'One room number, for example 204' },
        name: { type: 'STRING', description: 'Part of a guest name, organization or hold label. Initials such as ZB also work.' },
        newest_first: { type: 'BOOLEAN', description: 'Put the most recently made bookings first (use for "latest bookings")' },
        limit: { type: 'INTEGER', description: 'How many to return, at most 100 (default 40)' },
      },
    },
    async run({ from, to, made_from, made_to, status, include, room, name, newest_first, limit }) {
      const t = todayIST();
      const made = Boolean(made_from || made_to);
      const stayFilter = Boolean(from || to) || !made;
      const a = from ? parseDate(from, 'from') : t;
      const z = to ? parseDate(to, 'to') : addDays(a, 7);
      if (stayFilter && (z < a || diffDays(a, z) > 366)) throw new HttpError(400, 'Use a stay range of at most a year');
      const madeA = made_from ? parseDate(made_from, 'made_from') : null;
      const madeZ = made_to ? parseDate(made_to, 'made_to') : null;
      const mode = include || (status === 'cancelled' ? 'cancelled' : 'live');
      const scope =
        mode === 'cancelled' ? sql`b.deleted_at IS NULL AND b.status = 'cancelled'`
        : mode === 'deleted' ? sql`b.deleted_at IS NOT NULL`
        : mode === 'all' ? sql`TRUE`
        : LIVE;
      const like = name ? await searchTerms(name) : null;
      const cap = Math.max(1, Math.min(100, Number(limit) || 40));
      const rows = await sql`
        SELECT b.id, r.number AS room, COALESCE(g.name, NULLIF(b.label, ''), NULLIF(b.organization, ''), 'On hold') AS who,
               b.organization, lower(b.stay)::text AS check_in, upper(b.stay)::text AS check_out,
               (upper(b.stay) - lower(b.stay))::int AS nights, b.status, b.adults, b.children,
               b.channel, b.rate_plan, b.notes, b.label, (b.group_id IS NOT NULL) AS part_of_group,
               to_char(b.created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI') AS booked_on, b.created_by AS booked_by,
               to_char(b.updated_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI') AS last_changed, b.updated_by AS last_changed_by,
               to_char(b.deleted_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI') AS deleted_on
        FROM bookings b JOIN rooms r ON r.id = b.room_id LEFT JOIN guests g ON g.id = b.guest_id
        WHERE ${scope}
          ${stayFilter ? sql`AND b.stay && daterange(${a}::date, ${addDays(z, 1)}::date, '[)')` : sql``}
          ${madeA ? sql`AND (b.created_at AT TIME ZONE 'Asia/Kolkata')::date >= ${madeA}::date` : sql``}
          ${madeZ ? sql`AND (b.created_at AT TIME ZONE 'Asia/Kolkata')::date <= ${madeZ}::date` : sql``}
          ${status ? sql`AND b.status = ${String(status)}::booking_status` : sql``}
          ${room ? sql`AND r.number = ${String(room)}` : sql``}
          ${like ? sql`AND (g.name ILIKE ANY(${like}::text[]) OR b.organization ILIKE ANY(${like}::text[]) OR b.label ILIKE ANY(${like}::text[]))` : sql``}
        ORDER BY ${newest_first ? sql`b.created_at DESC` : sql`lower(b.stay), r.number`}
        LIMIT ${cap}`;
      return {
        stay_range: stayFilter ? { from: a, to: z } : 'any',
        made_range: made ? { from: madeA, to: madeZ } : 'any',
        count: rows.length, truncated: rows.length === cap, bookings: rows,
      };
    },
  },
  {
    name: 'booking_history',
    description:
      'The log of every change to bookings: who made, edited, deleted or restored a booking, and when (India time), with the room, guest or label, the stay and status, and what the stay and status were before an edit. Use it for "who changed room 204\'s booking", "what was deleted today", "who confirmed the Sharma hold", "what happened to booking 57". Newest first.',
    parameters: {
      type: 'OBJECT',
      properties: {
        booking_id: { type: 'INTEGER', description: 'One booking, by the id list_bookings returns' },
        from: { type: 'STRING', description: 'First day (India) the change happened, YYYY-MM-DD (default 7 days ago)' },
        to: { type: 'STRING', description: 'Last day the change happened, YYYY-MM-DD (default today)' },
        action: { type: 'STRING', description: 'insert (made), update (edited), delete or restore' },
        limit: { type: 'INTEGER', description: 'At most 100 (default 30)' },
      },
    },
    async run({ booking_id, from, to, action, limit }) {
      const t = todayIST();
      const z = to ? parseDate(to, 'to') : t;
      const a = from ? parseDate(from, 'from') : addDays(z, -7);
      if (z < a || diffDays(a, z) > 366) throw new HttpError(400, 'Use a range of at most a year');
      const cap = Math.max(1, Math.min(100, Number(limit) || 30));
      const rows = await sql`
        SELECT to_char(h.changed_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI') AS at, h.changed_by AS by, h.action, h.booking_id,
               r.number AS room, COALESCE(g.name, NULLIF(x.s->>'label', ''), NULLIF(x.s->>'organization', ''), 'On hold') AS who,
               x.s->>'status' AS status, x.s->>'stay' AS stay,
               h.old_row->>'status' AS was_status, h.old_row->>'stay' AS was_stay
        FROM booking_history h
        CROSS JOIN LATERAL (SELECT COALESCE(h.new_row, h.old_row) AS s) x
        LEFT JOIN rooms r ON r.id = (x.s->>'room_id')::int
        LEFT JOIN guests g ON g.id = (x.s->>'guest_id')::int
        WHERE (h.changed_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN ${a}::date AND ${z}::date
          ${booking_id ? sql`AND h.booking_id = ${Number(booking_id)}` : sql``}
          ${action ? sql`AND h.action = ${String(action)}` : sql``}
        ORDER BY h.changed_at DESC LIMIT ${cap}`;
      return { from: a, to: z, count: rows.length, truncated: rows.length === cap, changes: rows };
    },
  },
  {
    name: 'list_guests',
    description:
      'The guest book: each guest with their organization, how many stays they have had, their first and last stay, and when they were added. Use it for "who are our repeat guests", "how many guests do we have", "which guests came most", "guests from Zee Bangla". Phone numbers and emails are included only when include_contact is true, which you should set only when the person asks for them.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Part of a name or organization (initials such as ZB work)' },
        repeat_only: { type: 'BOOLEAN', description: 'Only guests with more than one stay' },
        include_contact: { type: 'BOOLEAN', description: 'Also give phone and email' },
        limit: { type: 'INTEGER', description: 'At most 100 (default 30)' },
      },
    },
    async run({ name, repeat_only, include_contact, limit }) {
      const like = name ? await searchTerms(name) : null;
      const cap = Math.max(1, Math.min(100, Number(limit) || 30));
      const rows = await sql`
        SELECT g.id, g.name, g.organization, g.notes, g.phone, g.email,
               to_char(g.created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS added_on,
               count(b.id)::int AS stays, min(lower(b.stay))::text AS first_check_in, max(upper(b.stay))::text AS last_check_out
        FROM guests g LEFT JOIN bookings b ON b.guest_id = g.id AND ${LIVE}
        WHERE ${like ? sql`(g.name ILIKE ANY(${like}::text[]) OR g.organization ILIKE ANY(${like}::text[]))` : sql`TRUE`}
        GROUP BY g.id
        ${repeat_only ? sql`HAVING count(b.id) > 1` : sql``}
        ORDER BY max(upper(b.stay)) DESC NULLS LAST, g.name LIMIT ${cap}`;
      const [{ total }] = await sql`SELECT count(*)::int AS total FROM guests`;
      return {
        total_guests_in_book: total, count: rows.length, truncated: rows.length === cap,
        guests: rows.map(({ phone, email, ...rest }) => (include_contact ? { ...rest, phone, email } : rest)),
      };
    },
  },
  {
    name: 'list_rooms',
    description: 'Every room with its floor, whether it is in use, who is in it today (and until when), and when the next stay in it starts. Use it for "which rooms are occupied now", "who is in which room", "when is room 105 next taken".',
    parameters: { type: 'OBJECT', properties: {} },
    async run() {
      const t = todayIST();
      const rows = await sql`
        SELECT r.number, r.active, left(r.number, 1) AS floor,
               cur.who AS in_room_today, cur.status AS today_status, cur.check_out AS leaves_on, nxt.check_in AS next_arrival
        FROM rooms r
        LEFT JOIN LATERAL (
          SELECT COALESCE(g.name, NULLIF(b.label, ''), NULLIF(b.organization, ''), 'On hold') AS who, b.status, upper(b.stay)::text AS check_out
          FROM bookings b LEFT JOIN guests g ON g.id = b.guest_id
          WHERE b.room_id = r.id AND ${LIVE} AND b.stay @> ${t}::date LIMIT 1) cur ON true
        LEFT JOIN LATERAL (
          SELECT lower(b.stay)::text AS check_in FROM bookings b
          WHERE b.room_id = r.id AND ${LIVE} AND lower(b.stay) > ${t}::date ORDER BY lower(b.stay) LIMIT 1) nxt ON true
        ORDER BY r.number`;
      return { today: t, rooms: rows, occupied_today: rows.filter((r) => r.in_room_today).length, total_rooms: rows.filter((r) => r.active).length };
    },
  },
  {
    name: 'property_settings',
    description: 'The app\'s settings: default check-in and check-out times, default calendar span and the like. Use it for "what is our usual check-out time".',
    parameters: { type: 'OBJECT', properties: {} },
    async run() {
      const [row] = await sql`SELECT value, to_char(updated_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI') AS updated FROM settings WHERE key = 'app'`;
      return row ? { settings: row.value, last_changed: row.updated } : { settings: {}, note: 'Nothing has been changed from the defaults.' };
    },
  },
  {
    name: 'book_stay',
    description:
      'Make a booking or a hold from details the person gave. It is TWO STEPS. Step 1: call it WITHOUT confirmed. It checks the rooms are free and returns a summary. Show that summary to the person in plain words and ask "Shall I book it?". Step 2: only after they answer yes, call it again with exactly the same details and confirmed set to true. Never set confirmed to true on your own, and never guess a detail: ask for anything missing. It needs the room numbers, check_in and check_out; a confirmed booking also needs the guest name; a hold (status on_hold) may have just a label. If the person only said how many rooms, use check_availability or find_room_block first to choose them. It can only create: it cannot change or delete anything.',
    parameters: {
      type: 'OBJECT',
      properties: {
        rooms: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Room numbers, for example ["204", "205"]' },
        ...dateProps,
        status: { type: 'STRING', description: 'confirmed (default) or on_hold' },
        guest_name: { type: 'STRING', description: 'The guest, for a confirmed booking' },
        phone: { type: 'STRING', description: 'Guest phone, if given' },
        email: { type: 'STRING', description: 'Guest email, if given' },
        organization: { type: 'STRING', description: 'Company or group, if given' },
        label: { type: 'STRING', description: 'A short title, mainly for a hold' },
        adults: { type: 'INTEGER', description: 'Adults in total over all the rooms (default one per room)' },
        children: { type: 'INTEGER', description: 'Children in total (default 0)' },
        notes: { type: 'STRING', description: 'Any notes the person asked to save' },
        channel: { type: 'STRING', description: 'Direct, Phone, Email, Website, Walk-in or Agent (default Direct)' },
        rate_plan: { type: 'STRING', description: 'EP, CP, MAP or AP (default EP)' },
        confirmed: { type: 'BOOLEAN', description: 'true ONLY after the person said yes to the summary' },
      },
      required: ['rooms', 'check_in', 'check_out'],
    },
    async run(args, ctx = {}) {
      const { check_in, check_out, status = 'confirmed', guest_name, phone, email, organization, label, notes, channel, rate_plan, confirmed } = args;
      const [a, b] = range(check_in, check_out);
      if (status !== 'confirmed' && status !== 'on_hold') throw new HttpError(400, 'status must be confirmed or on_hold');
      const numbers = [...new Set((Array.isArray(args.rooms) ? args.rooms : []).map((r) => String(r).trim()).filter(Boolean))];
      if (!numbers.length) throw new HttpError(400, 'Which rooms? Ask the person, or look for free rooms first.');
      if (numbers.length > 20) throw new HttpError(400, 'At most 20 rooms in one booking');
      const name = String(guest_name ?? '').trim();
      if (status === 'confirmed' && !name) throw new HttpError(400, "A confirmed booking needs the guest's name. Ask for it, or offer to put the room on hold instead.");
      if (status === 'on_hold' && !name && !String(label ?? '').trim() && !String(organization ?? '').trim()) {
        throw new HttpError(400, 'A hold needs a name, a label or an organization so it can be recognised. Ask for one.');
      }

      const found = await sql`SELECT id, number FROM rooms WHERE active AND number = ANY(${numbers}::text[]) ORDER BY number`;
      const missing = numbers.filter((n) => !found.some((r) => r.number === n));
      if (missing.length) throw new HttpError(400, `There is no active room ${missing.join(', ')}`);
      const taken = await sql`
        SELECT DISTINCT r.number FROM bookings b JOIN rooms r ON r.id = b.room_id
        WHERE ${LIVE} AND r.number = ANY(${numbers}::text[]) AND b.stay && daterange(${a}::date, ${b}::date, '[)') ORDER BY r.number`;
      if (taken.length) {
        const free = (await freeRooms(a, b)).map((r) => r.number);
        throw new HttpError(409, `Room ${taken.map((r) => r.number).join(', ')} is already booked or on hold on those dates. Free rooms for ${a} to ${b}: ${free.join(', ') || 'none'}.`);
      }

      // Names are not unique: reuse the guest when exactly one has this name, ask when several do, add a new one when none does.
      let guest = null;
      let guestNote = 'no guest (a hold)';
      if (name) {
        const same = await sql`SELECT id, name, phone, organization FROM guests WHERE lower(name) = lower(${name}) ORDER BY id`;
        if (same.length > 1) {
          throw new HttpError(409, `${same.length} guests are called ${name} (${same.map((g) => [g.organization, g.phone].filter(Boolean).join(', ') || 'no details').join(' | ')}). Ask which one, or say it is a new guest.`);
        }
        if (same.length === 1) {
          guest = { id: same[0].id };
          guestNote = `existing guest ${same[0].name}`;
        } else {
          guest = { name, phone: phone || null, email: email || null, organization: organization || null };
          guestNote = `new guest ${name}`;
        }
      }
      const adults = Number.isInteger(args.adults) && args.adults > 0 ? args.adults : numbers.length;
      const children = Number.isInteger(args.children) && args.children >= 0 ? args.children : 0;
      const summary = {
        status, rooms: found.map((r) => r.number), check_in: a, check_out: b, nights: diffDays(a, b),
        guest: guestNote, label: label || null, organization: organization || null, adults, children,
        notes: notes || null, channel: channel || 'Direct', rate_plan: rate_plan || 'EP',
      };

      if (confirmed !== true) {
        return {
          needs_confirmation: true, summary,
          next_step: 'Nothing is booked yet. Tell the person this summary in plain words and ask "Shall I book it?". Only after they say yes, call book_stay again with the same details and confirmed true.',
        };
      }
      if (!ctx.userConfirms) {
        throw new HttpError(400, 'The person has not said yes to the summary yet, so nothing was booked. Show them the summary and ask them to confirm.');
      }
      if (ctx.booked?.length) throw new HttpError(400, 'One booking was already made in this answer. Ask the person before making another.');

      const body = {
        room_ids: found.map((r) => r.id), check_in: a, check_out: b, status, adults, children,
        notes: notes || null, channel: channel || 'Direct', rate_plan: rate_plan || 'EP',
        label: label || null, organization: organization || null,
        ...(guest?.id ? { guest_id: guest.id } : guest ? { guest } : {}),
      };
      const rows = await createBookings(body, ctx.by ?? 'assistant', ctx.db); // ctx.db is only set by tests, to run inside a transaction that is rolled back
      ctx.booked?.push(...rows.map((r) => r.id));
      return {
        booked: true, summary, booking_ids: rows.map((r) => r.id),
        next_step: 'Tell the person it is done, in one short sentence with the rooms, the dates and the guest. Do not book anything else unless they ask.',
      };
    },
  },
];
