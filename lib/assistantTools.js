import sql from './db';
import { HttpError, parseDate } from './api';
import { addDays, addMonths, daysInMonth, diffDays, monthStart } from './dates';

/*
  What the chat assistant can look up. Every tool is READ-ONLY: it only runs SELECT queries, never writes, and returns
  plain numbers and names. Contact details (phone, email, organization) come only from find_contact, when a question
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
    description: 'Bookings and holds that overlap a date range (default: the next 7 days), with room, guest or hold label, dates, status and party size. Use it for "who is arriving today", "what is on hold", "who is in room 204".',
    parameters: {
      type: 'OBJECT',
      properties: {
        from: { type: 'STRING', description: 'First day, YYYY-MM-DD (default today)' },
        to: { type: 'STRING', description: 'Last day, YYYY-MM-DD (default 7 days from today)' },
        status: { type: 'STRING', description: 'confirmed, checked_in, checked_out or on_hold (default: all)' },
        room: { type: 'STRING', description: 'One room number, for example 204' },
        name: { type: 'STRING', description: 'Part of a guest name, organization or hold label. Initials such as ZB also work.' },
      },
    },
    async run({ from, to, status, room, name }) {
      const t = todayIST();
      const a = from ? parseDate(from, 'from') : t;
      const z = to ? parseDate(to, 'to') : addDays(a, 7);
      if (z < a || diffDays(a, z) > 120) throw new HttpError(400, 'Use a range of at most 120 days');
      const like = name ? await searchTerms(name) : null;
      const rows = await sql`
        SELECT r.number AS room, COALESCE(g.name, NULLIF(b.label, ''), NULLIF(b.organization, ''), 'On hold') AS who,
               b.organization, lower(b.stay)::text AS check_in, upper(b.stay)::text AS check_out,
               (upper(b.stay) - lower(b.stay))::int AS nights, b.status, b.adults, b.children
        FROM bookings b JOIN rooms r ON r.id = b.room_id LEFT JOIN guests g ON g.id = b.guest_id
        WHERE ${LIVE} AND b.stay && daterange(${a}::date, ${addDays(z, 1)}::date, '[)')
          ${status ? sql`AND b.status = ${String(status)}::booking_status` : sql``}
          ${room ? sql`AND r.number = ${String(room)}` : sql``}
          ${like ? sql`AND (g.name ILIKE ANY(${like}::text[]) OR b.organization ILIKE ANY(${like}::text[]) OR b.label ILIKE ANY(${like}::text[]))` : sql``}
        ORDER BY lower(b.stay), r.number LIMIT 40`;
      return { from: a, to: z, count: rows.length, truncated: rows.length === 40, bookings: rows };
    },
  },
];
