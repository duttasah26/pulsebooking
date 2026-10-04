import sql from './db';
import { mergeSettings } from './settings';

let lastRun = 0;

// A booking is checked out by itself once its leaving day and leaving time have passed (India time): the booking's own
// check-out time, else the default check-out time in Settings (11:00 until it is changed). Only Confirmed and Checked in
// bookings move; an on-hold booking is left alone, and so are cancelled and deleted ones. Checking in stays manual: a guest
// may not turn up, so the app never marks someone as arrived.
//
// There is no scheduled job. The check runs when bookings are listed (at most once a minute per server), so the calendar
// is always right when it is opened. It records "Automatic check-out" as who made the change, so it shows in the history.
export async function autoCheckout() {
  if (Date.now() - lastRun < 60_000) return;
  lastRun = Date.now();
  try {
    const [row] = await sql`SELECT value FROM settings WHERE key = 'app'`;
    const defaultOut = mergeSettings(row?.value).checkOutTime || '11:00';
    await sql`
      UPDATE bookings
         SET status = 'checked_out', updated_by = 'Automatic check-out', updated_at = now()
       WHERE deleted_at IS NULL
         AND status IN ('confirmed', 'checked_in')
         AND ((upper(stay) + COALESCE(check_out_time, ${defaultOut}::time)) AT TIME ZONE 'Asia/Kolkata') <= now()
    `;
  } catch {
    lastRun = 0; // try again on the next request; listing the bookings must never fail because of this
  }
}
