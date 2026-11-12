import sql from './db';
import { HttpError, parseTime } from './api';
import { VIEW_CHOICES, SPAN_CHOICES, mergeSettings, patchSettings } from './settings';

/*
  Everything the assistant can CHANGE besides booking a stay (book_stay), moving one (change_booking) and bringing one back (restore_booking),
  which live in assistantTools.js. Three rules hold for every tool here:
    1. TWO STEPS. The first call (no `confirmed`) only checks and returns a plain summary. The write happens only when the model calls
       again with confirmed true AND the server has checked that the person's latest message really is a yes (ctx.userConfirms).
    2. ONE CHANGE PER ANSWER. After a write, any other write in the same answer is refused, so the person is asked again.
    3. NOTHING IS LOST. Bookings and guests are only ever marked deleted (never removed), a merge keeps the merged guest (marked deleted, with a
       note of who they were and which stays moved), a cancelled stay stays on file, and every tool has a way back (restore_booking,
       restore_guest, undo_guest_merge, or the same tool with the old value, which each result lists as `was`).
  The one thing the assistant cannot undo is deleting an on-hold booking in the app itself (the app removes holds for good); here a hold is
  released by setting its status to cancelled, which keeps it.
*/

const LIVE = sql`b.deleted_at IS NULL AND b.status <> 'cancelled'`;
const STATUSES = ['confirmed', 'checked_in', 'checked_out', 'cancelled'];

// The shared two-step. `apply(db)` does the writing inside a transaction; `ids` are what changed (so the page reloads).
async function twoStep({ args, ctx = {}, summary, ask, apply, ids, undo }) {
  if (args.confirmed !== true) {
    return {
      needs_confirmation: true,
      summary,
      next_step: `Nothing is changed yet. Tell the person this summary in plain words and ask "${ask}". Only after they say yes, call this tool again with exactly the same arguments and confirmed true.`,
    };
  }
  if (!ctx.userConfirms) throw new HttpError(400, 'The person has not said yes to the summary yet, so nothing was changed. Show them the summary and ask them to confirm.');
  if (ctx.booked?.length) throw new HttpError(400, 'Something was already changed in this answer. Ask the person before doing another change.');
  if (ctx.db) await apply(ctx.db);
  else await sql.begin(apply);
  ctx.booked?.push(...(ids?.length ? ids : [0]));
  return { done: true, summary, how_to_undo: undo, next_step: 'Tell the person it is done, in one short sentence, and that it can be undone if they change their mind. Do not change anything else unless they ask.' };
}

const positive = (value, what) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `Which ${what}? Look it up first.`);
  return n;
};

const text = (value) => (value === undefined || value === null ? undefined : String(value).trim());

// The bookings a tool acts on: one booking, or every live one of its group.
async function targetsOf(args, { includeDeleted = false } = {}) {
  const id = positive(args.booking_id, 'booking');
  const [one] = await sql`SELECT id, group_id, deleted_at FROM bookings WHERE id = ${id}`;
  if (!one) throw new HttpError(404, `There is no booking ${id}.`);
  if (one.deleted_at && !includeDeleted) throw new HttpError(409, `Booking ${id} is deleted. Bring it back with restore_booking first.`);
  const rows = await sql`
    SELECT b.id, b.status, b.guest_id, b.adults, b.children, b.notes, b.channel, b.rate_plan, b.label, b.organization, b.room_id,
           to_char(b.check_in_time, 'HH24:MI') AS check_in_time, to_char(b.check_out_time, 'HH24:MI') AS check_out_time,
           r.number AS room, COALESCE(g.name, NULLIF(b.label, ''), NULLIF(b.organization, ''), 'On hold') AS who,
           lower(b.stay)::text AS check_in, upper(b.stay)::text AS check_out
    FROM bookings b JOIN rooms r ON r.id = b.room_id LEFT JOIN guests g ON g.id = b.guest_id
    WHERE b.deleted_at IS NULL AND ${args.whole_group && one.group_id ? sql`b.group_id = ${one.group_id}` : sql`b.id = ${id}`}
    ORDER BY r.number`;
  return rows;
}

const bookingProps = {
  booking_id: { type: 'INTEGER', description: 'The booking, by the id list_bookings returns (any one booking of a group will do)' },
  whole_group: { type: 'BOOLEAN', description: 'true: every booking in the same group (rooms booked together)' },
};
const confirmedProp = { confirmed: { type: 'BOOLEAN', description: 'true ONLY after the person said yes to the summary' } };
const TWO_STEPS = 'It is TWO STEPS: call it WITHOUT confirmed first, tell the person the summary in plain words and ask for a yes; only after they say yes call it again with exactly the same arguments and confirmed true.';

async function guestRow(id, { deleted = false } = {}) {
  const [g] = await sql`
    SELECT id, name, phone, email, notes, organization, color, deleted_at, deleted_by,
           (SELECT count(*)::int FROM bookings b WHERE b.guest_id = guests.id AND b.deleted_at IS NULL) AS live_stays,
           (SELECT count(*)::int FROM bookings b WHERE b.guest_id = guests.id) AS all_stays
    FROM guests WHERE id = ${id} AND ${deleted ? sql`deleted_at IS NOT NULL` : sql`deleted_at IS NULL`}`;
  return g;
}

export const ACTION_TOOLS = [
  {
    name: 'add_guest',
    description: `Add a guest to the guest book without a booking. ${TWO_STEPS} Undo: delete_guest.`,
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Full name' },
        phone: { type: 'STRING' }, email: { type: 'STRING' }, organization: { type: 'STRING' }, notes: { type: 'STRING' },
        ...confirmedProp,
      },
      required: ['name'],
    },
    async run(args, ctx) {
      const name = text(args.name);
      if (!name) throw new HttpError(400, "What is the guest's name?");
      const same = await sql`SELECT id, phone, organization FROM guests WHERE deleted_at IS NULL AND lower(name) = lower(${name})`;
      const summary = { new_guest: name, phone: text(args.phone) || null, email: text(args.email) || null, organization: text(args.organization) || null, notes: text(args.notes) || null, already_called_this: same.length };
      let newId = null;
      const result = await twoStep({
        args, ctx, summary, ask: 'Shall I add them?', ids: [],
        undo: 'delete_guest on the new guest',
        apply: async (db) => {
          [{ id: newId }] = await db`INSERT INTO guests (name, phone, email, organization, notes) VALUES (${name}, ${summary.phone}, ${summary.email}, ${summary.organization}, ${summary.notes}) RETURNING id`;
        },
      });
      return newId ? { ...result, guest_id: newId } : result;
    },
  },
  {
    name: 'edit_guest',
    description: `Change a guest's name, phone, email, organization or notes (an empty string clears a field). Find the guest_id with list_guests or find_contact. ${TWO_STEPS} The result lists the old values (was) so the change can be set back.`,
    parameters: {
      type: 'OBJECT',
      properties: {
        guest_id: { type: 'INTEGER' },
        name: { type: 'STRING' }, phone: { type: 'STRING' }, email: { type: 'STRING' }, organization: { type: 'STRING' }, notes: { type: 'STRING' },
        ...confirmedProp,
      },
      required: ['guest_id'],
    },
    async run(args, ctx) {
      const g = await guestRow(positive(args.guest_id, 'guest'));
      if (!g) throw new HttpError(404, 'That guest was not found, or is deleted (use restore_guest first).');
      const change = {};
      for (const key of ['name', 'phone', 'email', 'organization', 'notes']) {
        const v = text(args[key]);
        if (v !== undefined) change[key] = key === 'name' ? v : v || null;
      }
      if ('name' in change && !change.name) throw new HttpError(400, 'A guest needs a name.');
      if (!Object.keys(change).length) throw new HttpError(400, 'What should change? Ask for the new name, phone, email, organization or notes.');
      const summary = { guest: g.name, changes: Object.fromEntries(Object.entries(change).map(([k, v]) => [k, { was: g[k] ?? null, now: v }])) };
      return twoStep({
        args, ctx, summary, ask: 'Shall I make the change?', ids: [g.id],
        undo: 'edit_guest again with the old values listed under was',
        apply: (db) => db`UPDATE guests SET ${db(change, ...Object.keys(change))} WHERE id = ${g.id} AND deleted_at IS NULL`,
      });
    },
  },
  {
    name: 'delete_guest',
    description: `Delete a guest from the guest book. The guest is only MARKED deleted (they can be brought back with restore_guest). A guest with stays still on the calendar cannot be deleted: delete those bookings first, or merge the guest into another. ${TWO_STEPS}`,
    parameters: { type: 'OBJECT', properties: { guest_id: { type: 'INTEGER' }, ...confirmedProp }, required: ['guest_id'] },
    async run(args, ctx) {
      const g = await guestRow(positive(args.guest_id, 'guest'));
      if (!g) throw new HttpError(404, 'That guest was not found, or is already deleted.');
      if (g.live_stays > 0) throw new HttpError(409, `${g.name} has ${g.live_stays} ${g.live_stays === 1 ? 'stay' : 'stays'} on the calendar. Delete those bookings first, or merge this guest into another.`);
      return twoStep({
        args, ctx, ids: [g.id], summary: { delete_guest: g.name, past_stays_kept: g.all_stays }, ask: 'Shall I delete them?',
        undo: 'restore_guest',
        apply: (db) => db`UPDATE guests SET deleted_at = now(), deleted_by = ${ctx.by ?? 'assistant'} WHERE id = ${g.id} AND deleted_at IS NULL`,
      });
    },
  },
  {
    name: 'restore_guest',
    description: `Bring back a guest who was deleted (their old stays were never touched). Find them with list_guests and include_deleted true. ${TWO_STEPS}`,
    parameters: { type: 'OBJECT', properties: { guest_id: { type: 'INTEGER' }, ...confirmedProp }, required: ['guest_id'] },
    async run(args, ctx) {
      const g = await guestRow(positive(args.guest_id, 'guest'), { deleted: true });
      if (!g) throw new HttpError(404, 'That guest is not deleted, or was not found.');
      return twoStep({
        args, ctx, ids: [g.id], summary: { bring_back: g.name, deleted_by: g.deleted_by, stays: g.all_stays }, ask: 'Shall I bring them back?',
        undo: 'delete_guest',
        apply: (db) => db`UPDATE guests SET deleted_at = NULL, deleted_by = NULL WHERE id = ${g.id} AND deleted_at IS NOT NULL`,
      });
    },
  },
  {
    name: 'merge_guests',
    description: `Merge two guest records that are the same person: every stay of merge_id moves to keep_id, keep_id keeps its own name and details and takes any phone, email, organization or colour it lacks from the other, and the notes of both are kept. Unlike a merge in the app, the merged guest is NOT removed: it is only marked deleted with a note saying who it was, so undo_guest_merge can put everything back exactly. Find both ids with find_contact or list_guests. ${TWO_STEPS}`,
    parameters: { type: 'OBJECT', properties: { keep_id: { type: 'INTEGER', description: 'The guest who stays' }, merge_id: { type: 'INTEGER', description: 'The duplicate that goes into keep_id' }, ...confirmedProp }, required: ['keep_id', 'merge_id'] },
    async run(args, ctx) {
      const keepId = positive(args.keep_id, 'guest to keep');
      const goneId = positive(args.merge_id, 'guest to merge');
      if (keepId === goneId) throw new HttpError(400, 'Choose two different guests.');
      const keep = await guestRow(keepId);
      const gone = await guestRow(goneId);
      if (!keep || !gone) throw new HttpError(404, 'One of the guests was not found, or is deleted.');
      const fills = ['phone', 'email', 'organization', 'color'].filter((k) => !keep[k] && gone[k]);
      const summary = {
        keep: `${keep.name} (#${keep.id})`, merge_into_it: `${gone.name} (#${gone.id})`,
        stays_that_move: gone.all_stays, details_filled_in: fills,
        note: 'The merged guest is only marked deleted, so the merge can be undone.',
      };
      const today = new Date().toISOString().slice(0, 10);
      const by = ctx.by ?? 'assistant';
      return twoStep({
        args, ctx, summary, ask: 'Shall I merge them?', ids: [keep.id, gone.id],
        undo: `undo_guest_merge with merged_id ${gone.id}`,
        apply: async (db) => {
          const old = ['phone', 'email', 'organization'].filter((k) => gone[k]).map((k) => `${k} ${gone[k]}`).join(', ');
          const line = `Merged "${gone.name}" into this guest on ${today} by ${by}${old ? `. Their details were: ${old}` : ''}.`;
          const notes = [keep.notes, gone.notes && `Notes from "${gone.name}": ${gone.notes}`, line].filter(Boolean).join('\n\n');
          await db`UPDATE bookings SET guest_id = ${keep.id}, updated_by = ${by} WHERE guest_id = ${gone.id}`;
          await db`UPDATE guests SET phone = ${keep.phone || gone.phone || null}, email = ${keep.email || gone.email || null},
                   organization = ${keep.organization || gone.organization || null}, color = ${keep.color || gone.color || null}, notes = ${notes}
                   WHERE id = ${keep.id}`;
          // What undo needs: who the survivor is and what it had before (the marker is the last line of the merged guest's notes).
          const marker = `[merged into guest #${keep.id}; before: ${JSON.stringify({ phone: keep.phone, email: keep.email, organization: keep.organization, color: keep.color })}]`;
          await db`UPDATE guests SET deleted_at = now(), deleted_by = ${by}, notes = ${[gone.notes, marker].filter(Boolean).join('\n\n')} WHERE id = ${gone.id}`;
        },
      });
    },
  },
  {
    name: 'undo_guest_merge',
    description: `Undo a merge made with merge_guests: the merged (deleted) guest comes back, their stays move back to them, and the survivor's notes and filled-in details are put back as they were. merged_id is the guest who was merged away (find them with list_guests, include_deleted true). Only works for merges made by the assistant. ${TWO_STEPS}`,
    parameters: { type: 'OBJECT', properties: { merged_id: { type: 'INTEGER', description: 'The guest who was merged away (now deleted)' }, ...confirmedProp }, required: ['merged_id'] },
    async run(args, ctx) {
      const goneId = positive(args.merged_id, 'merged guest');
      const gone = await guestRow(goneId, { deleted: true });
      const mark = /\[merged into guest #(\d+); before: (\{.*\})\]\s*$/.exec(gone?.notes ?? '');
      if (!gone || !mark) throw new HttpError(404, 'That guest was not merged by the assistant, so this tool cannot undo it. They may still be restorable with restore_guest.');
      const keepId = Number(mark[1]);
      const before = JSON.parse(mark[2]);
      const keep = await guestRow(keepId);
      if (!keep) throw new HttpError(409, 'The guest they were merged into has since been deleted. Restore that guest first.');
      const moved = await sql`
        SELECT DISTINCT booking_id FROM booking_history
        WHERE action = 'update' AND changed_at = ${gone.deleted_at} AND (old_row->>'guest_id')::int = ${goneId} AND (new_row->>'guest_id')::int = ${keepId}`;
      const ids = moved.map((m) => m.booking_id);
      const summary = { bring_back: `${gone.name} (#${gone.id})`, stays_that_move_back: ids.length, from: `${keep.name} (#${keep.id})` };
      const by = ctx.by ?? 'assistant';
      return twoStep({
        args, ctx, summary, ask: 'Shall I undo the merge?', ids: [keep.id, gone.id],
        undo: 'merge_guests again',
        apply: async (db) => {
          if (ids.length) await db`UPDATE bookings SET guest_id = ${goneId}, updated_by = ${by} WHERE id = ANY(${ids}::int[]) AND guest_id = ${keepId}`;
          const notes = (keep.notes ?? '')
            .split('\n\n')
            .filter((p) => !(p.startsWith(`Merged "${gone.name}" into this guest on`) || p.startsWith(`Notes from "${gone.name}":`)))
            .join('\n\n') || null;
          const back = (k) => (keep[k] && keep[k] === gone[k] ? before[k] ?? null : keep[k]);
          await db`UPDATE guests SET phone = ${back('phone')}, email = ${back('email')}, organization = ${back('organization')}, color = ${back('color')}, notes = ${notes} WHERE id = ${keepId}`;
          const goneNotes = gone.notes.replace(/\n*\[merged into guest #\d+; before: \{.*\}\]\s*$/, '') || null;
          await db`UPDATE guests SET deleted_at = NULL, deleted_by = NULL, notes = ${goneNotes} WHERE id = ${goneId}`;
        },
      });
    },
  },
  {
    name: 'delete_booking',
    description: `Delete a booking (or, with whole_group, every room booked together). It is only MARKED deleted: restore_booking brings it back, with who deleted it and when. An on-hold booking cannot be deleted here, because the app removes holds for good: release a hold with set_booking_status cancelled instead (that keeps it on file). ${TWO_STEPS}`,
    parameters: { type: 'OBJECT', properties: { ...bookingProps, ...confirmedProp }, required: ['booking_id'] },
    async run(args, ctx) {
      const targets = await targetsOf(args);
      if (targets.some((t) => t.status === 'on_hold')) throw new HttpError(409, 'A hold cannot be deleted here because a deleted hold is gone for good. Release it with set_booking_status cancelled instead, which keeps it on file.');
      const ids = targets.map((t) => t.id);
      return twoStep({
        args, ctx, ids,
        summary: { delete: targets.map((t) => ({ booking_id: t.id, guest: t.who, room: t.room, stay: `${t.check_in} to ${t.check_out}`, status: t.status })) },
        ask: 'Shall I delete it?', undo: 'restore_booking',
        apply: (db) => db`UPDATE bookings SET deleted_at = now(), deleted_by = ${ctx.by ?? 'assistant'} WHERE id = ANY(${ids}::int[]) AND deleted_at IS NULL`,
      });
    },
  },
  {
    name: 'set_booking_status',
    description: `Change the status of a booking (or of every room booked together with whole_group): confirmed, checked_in, checked_out or cancelled. A hold becomes a real booking by setting confirmed (it must have a guest), and a hold is released by setting cancelled. Cancelling frees the room but keeps the booking on file; setting confirmed again re-opens it if the room is still free. ${TWO_STEPS} Undo: set the old status back.`,
    parameters: { type: 'OBJECT', properties: { ...bookingProps, status: { type: 'STRING', description: 'confirmed, checked_in, checked_out or cancelled' }, ...confirmedProp }, required: ['booking_id', 'status'] },
    async run(args, ctx) {
      if (!STATUSES.includes(args.status)) throw new HttpError(400, `status must be one of ${STATUSES.join(', ')}`);
      const targets = await targetsOf(args);
      if (args.status !== 'cancelled' && targets.some((t) => t.status === 'on_hold' && !t.guest_id)) {
        throw new HttpError(400, 'A hold needs a guest before it can be confirmed. Ask who the guest is (edit it with update_booking and a guest_id, or find or add the guest first).');
      }
      const ids = targets.map((t) => t.id);
      const by = ctx.by ?? 'assistant';
      return twoStep({
        args, ctx, ids,
        summary: { change_status: targets.map((t) => ({ booking_id: t.id, guest: t.who, room: t.room, stay: `${t.check_in} to ${t.check_out}`, was: t.status, now: args.status })) },
        ask: 'Shall I make the change?', undo: 'set_booking_status with the old status listed under was',
        apply: async (db) => {
          try {
            await db`UPDATE bookings SET status = ${args.status}, updated_by = ${by} WHERE id = ANY(${ids}::int[])`;
          } catch (err) {
            if (/exclu|overlap|conflict/i.test(err.message)) throw new HttpError(409, 'That room has been booked for those days since, so this booking cannot be re-opened as it was.');
            throw err;
          }
        },
      });
    },
  },
  {
    name: 'update_booking',
    description: `Change the details of a booking (or of every room booked together with whole_group): adults, children, notes, channel (Direct, Phone, Email, Website, Walk-in, Agent), rate_plan (EP, CP, MAP, AP), label, organization, check_in_time, check_out_time (HH:MM), or the guest (guest_id, from list_guests or find_contact). To change dates or rooms use change_booking. An empty string clears a text field. ${TWO_STEPS} The result lists the old values (was) so it can be set back, and booking_history keeps every change.`,
    parameters: {
      type: 'OBJECT',
      properties: {
        ...bookingProps,
        adults: { type: 'INTEGER', description: 'Adults in THIS booking row (each room has its own)' },
        children: { type: 'INTEGER' },
        notes: { type: 'STRING' }, channel: { type: 'STRING' }, rate_plan: { type: 'STRING' }, label: { type: 'STRING' }, organization: { type: 'STRING' },
        check_in_time: { type: 'STRING', description: 'HH:MM, or empty for not set' }, check_out_time: { type: 'STRING', description: 'HH:MM, or empty for not set' },
        guest_id: { type: 'INTEGER', description: 'Give the booking to this guest' },
        ...confirmedProp,
      },
      required: ['booking_id'],
    },
    async run(args, ctx) {
      const targets = await targetsOf(args);
      const change = {};
      if (args.adults !== undefined) {
        if (!Number.isInteger(args.adults) || args.adults < 1) throw new HttpError(400, 'A room has at least one adult.');
        change.adults = args.adults;
      }
      if (args.children !== undefined) {
        if (!Number.isInteger(args.children) || args.children < 0) throw new HttpError(400, 'Children cannot be negative.');
        change.children = args.children;
      }
      for (const key of ['notes', 'label', 'organization']) if (text(args[key]) !== undefined) change[key] = text(args[key]) || null;
      if (text(args.channel)) change.channel = text(args.channel);
      if (text(args.rate_plan)) change.rate_plan = text(args.rate_plan).toUpperCase();
      for (const key of ['check_in_time', 'check_out_time']) if (args[key] !== undefined) change[key] = parseTime(text(args[key]) || null, key);
      let guestName = null;
      if (args.guest_id !== undefined) {
        const g = await guestRow(positive(args.guest_id, 'guest'));
        if (!g) throw new HttpError(404, 'That guest was not found, or is deleted.');
        change.guest_id = g.id;
        guestName = g.name;
      }
      if (!Object.keys(change).length) throw new HttpError(400, 'What should change? Ask which detail.');
      const ids = targets.map((t) => t.id);
      const by = ctx.by ?? 'assistant';
      return twoStep({
        args, ctx, ids,
        summary: {
          bookings: targets.map((t) => ({ booking_id: t.id, guest: t.who, room: t.room, stay: `${t.check_in} to ${t.check_out}` })),
          changes: Object.fromEntries(Object.entries(change).map(([k, v]) => [k, { was: targets.length === 1 ? targets[0][k] ?? null : 'varies per booking', now: k === 'guest_id' ? guestName : v }])),
        },
        ask: 'Shall I make the change?', undo: 'update_booking again with the old values listed under was',
        apply: (db) => db`UPDATE bookings SET ${db({ ...change, updated_by: by }, ...Object.keys(change), 'updated_by')} WHERE id = ANY(${ids}::int[])`,
      });
    },
  },
  {
    name: 'set_room_active',
    description: `Retire a room (active false: it no longer shows for new bookings, and its old bookings are kept) or bring a retired room back (active true). ${TWO_STEPS} Undo: set the opposite.`,
    parameters: { type: 'OBJECT', properties: { room: { type: 'STRING', description: 'Room number, for example 204' }, active: { type: 'BOOLEAN' }, ...confirmedProp }, required: ['room', 'active'] },
    async run(args, ctx) {
      const number = text(args.room);
      const [room] = await sql`SELECT id, number, active FROM rooms WHERE number = ${number}`;
      if (!room) throw new HttpError(404, `There is no room ${number}.`);
      if (typeof args.active !== 'boolean') throw new HttpError(400, 'Retire it (active false) or bring it back (active true)?');
      if (room.active === args.active) throw new HttpError(409, `Room ${room.number} is already ${room.active ? 'in use' : 'retired'}.`);
      const [{ ahead }] = await sql`SELECT count(*)::int AS ahead FROM bookings b WHERE b.room_id = ${room.id} AND ${LIVE} AND upper(b.stay) > current_date`;
      return twoStep({
        args, ctx, ids: [room.id], ask: args.active ? 'Shall I bring it back?' : 'Shall I retire it?',
        summary: { room: room.number, now: args.active ? 'back in use' : 'retired', upcoming_or_current_bookings_in_it: ahead, note: args.active ? null : 'Its bookings stay on file; the room just stops being offered.' },
        undo: `set_room_active ${room.number} ${!args.active}`,
        apply: (db) => db`UPDATE rooms SET active = ${args.active} WHERE id = ${room.id}`,
      });
    },
  },
  {
    name: 'update_settings',
    description: `Change the app's settings: check_in_time and check_out_time (HH:MM, the defaults for new bookings), auto_checkout (true or false: a stay becomes Checked out by itself once its day and time have passed), default_view (timeline, month, calendar or day) and default_span (auto, 7, 14, 30 or month). Read the current ones with property_settings. ${TWO_STEPS} The result lists the old values (was) so it can be set back.`,
    parameters: {
      type: 'OBJECT',
      properties: {
        check_in_time: { type: 'STRING' }, check_out_time: { type: 'STRING' }, auto_checkout: { type: 'BOOLEAN' },
        default_view: { type: 'STRING' }, default_span: { type: 'STRING' }, ...confirmedProp,
      },
    },
    async run(args, ctx) {
      const change = {};
      if (args.check_in_time !== undefined) change.checkInTime = parseTime(text(args.check_in_time) || null, 'check_in_time');
      if (args.check_out_time !== undefined) change.checkOutTime = parseTime(text(args.check_out_time) || null, 'check_out_time');
      if (args.auto_checkout !== undefined) {
        if (typeof args.auto_checkout !== 'boolean') throw new HttpError(400, 'auto_checkout is true or false');
        change.autoCheckout = args.auto_checkout;
      }
      if (args.default_view !== undefined) {
        if (!VIEW_CHOICES.includes(args.default_view)) throw new HttpError(400, `default_view must be one of ${VIEW_CHOICES.join(', ')}`);
        change.defaultView = args.default_view;
      }
      if (args.default_span !== undefined) {
        if (!SPAN_CHOICES.includes(String(args.default_span))) throw new HttpError(400, `default_span must be one of ${SPAN_CHOICES.join(', ')}`);
        change.defaultSpan = String(args.default_span);
      }
      if (!Object.keys(change).length) throw new HttpError(400, 'Which setting should change?');
      const [row] = await sql`SELECT value FROM settings WHERE key = 'app'`;
      const current = mergeSettings(row?.value);
      const next = patchSettings(current, change);
      return twoStep({
        args, ctx, ids: [], ask: 'Shall I change it?', undo: 'update_settings again with the old values listed under was',
        summary: { changes: Object.fromEntries(Object.keys(change).map((k) => [k, { was: current[k] ?? null, now: next[k] }])) },
        apply: (db) => db`INSERT INTO settings (key, value) VALUES ('app', ${db.json(next)}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      });
    },
  },
];
