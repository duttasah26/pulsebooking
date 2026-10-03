import sql from './db';

// One booking row as the UI sees it. Dates come back as YYYY-MM-DD strings
// (cast to text so the driver doesn't turn them into JS Dates / time zones).
// `name` is the guest's name, or the hold label / organization when no guest is attached yet.
// `guest_color` is the guest's own colour (used when the booking has none); the UI falls back to the status colour.
export const bookingColumns = sql`
  b.id, b.room_id, r.number AS room_number, b.guest_id,
  COALESCE(g.name, NULLIF(b.label, ''), NULLIF(b.organization, ''), 'On hold') AS name, g.phone, g.email, g.color AS guest_color, r.color AS room_color,
  lower(b.stay)::text AS check_in, upper(b.stay)::text AS check_out,
  (upper(b.stay) - lower(b.stay)) AS nights,
  b.status, b.channel, b.rate_plan, b.adults, b.children, b.notes, b.color,
  b.organization, b.label, b.group_id,
  to_char(b.check_in_time, 'HH24:MI') AS check_in_time, to_char(b.check_out_time, 'HH24:MI') AS check_out_time,
  b.created_at, b.created_by, b.updated_at, b.updated_by, b.deleted_at, b.deleted_by
`;

export const bookingJoins = sql`
  FROM bookings b
  JOIN rooms r ON r.id = b.room_id
  LEFT JOIN guests g ON g.id = b.guest_id
`;

// Several bookings in one query (used when a multi-room booking is created).
export async function getBookings(ids) {
  if (ids.length === 0) return [];
  return sql`SELECT ${bookingColumns} ${bookingJoins} WHERE b.id IN ${sql(ids)} ORDER BY b.id`;
}

export async function getBooking(id) {
  const [row] = await sql`SELECT ${bookingColumns} ${bookingJoins} WHERE b.id = ${id}`;
  return row;
}
