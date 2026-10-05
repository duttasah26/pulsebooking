import { addDays, diffDays } from './dates';

// Changing several bookings at once. `change` is what the person asked for:
//   shift          move every stay this many days (negative is earlier)
//   checkIn, checkOut   one new date for all of them (these win over shift for that end)
//   extend         then make every stay this many nights longer (negative: shorter) by moving check-out
//   check_in_time, check_out_time, color, organization, status   set the same value on all (a key that is absent is left alone)
//   noteAdd        text added to the end of every booking's notes
// newDates() says where a stay lands; bodyFor() is what is sent to the server for it (only what really changes);
// backFor() is the same fields as they were, for Undo.

export function newDates(b, change) {
  let checkIn = b.check_in;
  let checkOut = b.check_out;
  if (change.shift) {
    checkIn = addDays(checkIn, change.shift);
    checkOut = addDays(checkOut, change.shift);
  }
  if (change.checkIn) checkIn = change.checkIn;
  if (change.checkOut) checkOut = change.checkOut;
  if (change.extend) checkOut = addDays(checkOut, change.extend);
  return { checkIn, checkOut, valid: checkOut > checkIn };
}

export function bodyFor(b, change) {
  const body = {};
  const d = newDates(b, change);
  if (d.checkIn !== b.check_in) body.check_in = d.checkIn;
  if (d.checkOut !== b.check_out) body.check_out = d.checkOut;
  for (const key of ['check_in_time', 'check_out_time', 'color', 'organization', 'status']) {
    if (key in change && (change[key] ?? null) !== (b[key] ?? null)) body[key] = change[key];
  }
  if (change.noteAdd?.trim()) body.notes = [b.notes, change.noteAdd.trim()].filter(Boolean).join('\n');
  return body;
}

export const backFor = (b, body) => Object.fromEntries(Object.keys(body).map((key) => [key, b[key] ?? null]));

// What the screen shows at once while the server catches up (the nights follow the dates).
export function localPatch(b, body) {
  const checkIn = body.check_in ?? b.check_in;
  const checkOut = body.check_out ?? b.check_out;
  return { ...body, nights: diffDays(checkIn, checkOut) };
}
