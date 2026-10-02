import sql from './db';

// One booking row as the UI sees it. Dates come back as YYYY-MM-DD strings
// (cast to text so the driver doesn't turn them into JS Dates / time zones).
// room_number, name, check_in, check_out keep the names the calendar already uses.
export const bookingColumns = sql`
  b.id, b.room_id, r.number AS room_number, b.guest_id, g.name, g.phone, g.email,
  lower(b.stay)::text AS check_in, upper(b.stay)::text AS check_out,
  (upper(b.stay) - lower(b.stay)) AS nights,
  b.status, b.channel, b.rate_plan, b.adults, b.children, b.notes,
  b.created_at, b.created_by, b.updated_at, b.updated_by, b.deleted_at, b.deleted_by
`;

export const bookingJoins = sql`
  FROM bookings b
  JOIN rooms r ON r.id = b.room_id
  JOIN guests g ON g.id = b.guest_id
`;

export async function getBooking(id) {
  const [row] = await sql`SELECT ${bookingColumns} ${bookingJoins} WHERE b.id = ${id}`;
  return row;
}
