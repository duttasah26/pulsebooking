# Pulse Rooms

A room-booking calendar for one small property (rooms 101-105, 201-205 and 301-305, plus 106, 206 and 306), used by two or three front-desk staff, mostly at a desk and sometimes on a phone. Staff place, edit and review stays and holds. The database refuses overlapping stays, every change is kept in history, and deletes can be undone.

It is not a channel manager or a multi-property suite. Product intent lives in `PRODUCT.md`, the design language in `DESIGN.md`.

## Features

- **Calendar**: Timeline (rooms across, dates down), Month, Occupancy and Day views. Drag or tap to place a stay or a hold. Checked-out stays are faded and crossed with light diagonal lines.
- **Bookings**: confirmed, on hold, checked in, checked out, cancelled. Several rooms can be booked at once (they share a `group_id`). On-hold bookings need no guest. Same-day turnover is allowed (check-out day can equal the next check-in day).
- **Booking form**: a three-step wizard (guest, rooms and dates, options and a final check). An unfinished new booking is kept as a draft on the device; **Clear** throws the draft away too.
- **Bookings tab**: filterable, sortable list grouped by arrival, guest, company or status. Each row is two lines (name and status, then room chips, dates, nights, guests, contact). Saved views are shared by all staff.
- **Guests tab**: guest list with stays, companies, duplicate detection and merge. Deleting a guest only marks them deleted (Undo in the toast, and a Deleted tab with Restore); their old stays stay attached.
- **Overview tab** (after Guests, full screen width): a greeting with the signed-in name, a day picker, five figure cards (Arrivals, Departures, In the house, Upcoming, On hold), a week overview (arrivals as bars, departures as a line, occupancy tiles, past or next 7 days), and a full-height list panel on the right. A row opens the booking in a sheet on the same page; the diagonal arrow shows it on the calendar. The same arrow is in the Bookings tab's details.
- **Search**: header search on the calendar (press `/` or Ctrl+K). Booking results use the same row design as the Bookings tab.
- **Settings**: Appearance (System, Light, Dark), floor and status colours, default check-in and check-out times, automatic check-out, what the Overview shows, first calendar view, row density.
- **Assistant**: an optional chat that answers questions about rooms and bookings, can make a booking or hold, change dates or room, and bring back an accidentally deleted booking (`restore_booking`). Every write is summary first, then only after a yes (Gemini).
- **History and Undo**: every insert, update, delete and restore of a booking is recorded by a trigger with who and when. Bookings and guests are soft-deleted and can be restored. The only hard delete is a removed on-hold booking (a hold), which is meant to be disposable.

## Stack

| Part | Choice |
|---|---|
| Framework | Next.js 15 (Pages Router), React 18, plain JavaScript |
| Styling | Tailwind CSS v4, tokens in `styles/globals.css` |
| Type | Outfit through `next/font/google`, one typeface for words and numbers (numbers are set tabular) |
| Icons | Phosphor (`@phosphor-icons/react`), bold by default |
| Motion | `framer-motion` 11 (reduced motion keeps only fades) |
| Database | Postgres on Neon, driver `postgres` (postgres.js) |
| Hosting | Vercel, functions pinned to `sin1` (`vercel.json`) |
| Auth | Signed cookie sessions, scrypt password hashes, enforced by `middleware.js` |
| Assistant | Google Gemini API with read-only tools plus one `book_stay` write tool |

Light and dark themes (Settings, Appearance: System, Light or Dark, kept per device; a Light/Dark button sits in the navbar). Times are India local time (IST).

## Getting started

Requirements: a recent Node.js (one that supports `--env-file`) and a Postgres database (Neon recommended).

```bash
npm install
cp .env.example .env.local      # then fill it in (see Environment)
node --env-file=.env.local scripts/run-sql.mjs db/schema.sql db/seed.sql
npm run dev                     # http://localhost:3000
```

Scripts:

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | `next lint` |
| `npm run hash-password -- <name> "<password>"` | Prints one `STAFF_ACCOUNTS` entry |
| `node --env-file=.env.local scripts/run-sql.mjs <files...>` | Runs SQL files in order against `DATABASE_URL` |

`scripts/run-sql.mjs` prints which database host it is talking to (never the password) and refuses to run `db/schema.sql` when the tables already exist.

### Environment

| Variable | Needed | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string. On Neon use the pooled URL and keep `?sslmode=require`. |
| `STAFF_ACCOUNTS` | production | Comma separated `name:scrypt:salt:hash` entries. While unset in development, nothing is checked. In production the app requires sign-in. |
| `SESSION_SECRET` | production | 16 or more random characters that sign the login cookie. |
| `GEMINI_API_KEY` | optional | Enables the assistant. Without it the chat opens and says it is not set up. |
| `GEMINI_MODEL` | optional | Default `gemini-flash-lite-latest`. |
| `GEMINI_API_BASE` | optional | Override the Gemini endpoint. |
| `DB_POOL_MAX` | optional | Connections per instance. Default 1 on Vercel, 5 locally. |
| `NEXT_DIST_DIR` | optional | Build into another folder (for example `.next-test`) so a second copy never shares `.next` with a running dev server. |

Make a session secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## Database

Postgres with the `btree_gist` extension. Fresh installs run `db/schema.sql` then `db/seed.sql`. Existing databases apply the files in `db/migrations/` in order (`002` to `006`). Run `006_guests_soft_delete.sql` before deploying the code that deletes guests softly, or guest lists will fail. Run migration SQL against Neon yourself; do not point tools at production by accident.

Tables:

- `rooms(id, number, active, color)`: seeded rooms 101-105, 201-205, 301-305 (migration 005 adds 106, 206, 306). A booking with no colour of its own uses its room's colour.
- `guests(id, name, phone, email, notes, organization, color, deleted_at, deleted_by)`: names are not unique, only the name is required. Deleted guests are filtered out of lists, search, duplicates, companies, new bookings and the assistant.
- `bookings(id, room_id, guest_id, stay daterange [in,out), status, channel, rate_plan, adults, children, notes, color, organization, label, group_id, check_in_time, check_out_time, created/updated/deleted at and by)`.
  - An exclusion constraint blocks overlapping stays per room (ignoring deleted and cancelled ones).
  - `guest_id` may be NULL only when `status = 'on_hold'`.
  - `color` is a palette key (see `lib/colors.js`), a custom `#hex`, or NULL for automatic.
  - Soft delete through `deleted_at` and `deleted_by`.
- `booking_history`: filled by the triggers `bookings_history_ins` and `bookings_history_upd` on every change.
- `settings(key, value jsonb)`: app settings (key `app`), saved views (key `views`) and company colours (key `companies`).

Performance notes: creating (even several rooms with a new guest) and deleting are each one SQL statement (CTEs) to limit round trips to Neon. Neon's pooled endpoint sits behind PgBouncer, so prepared statements are off (`prepare: false` in `lib/db.js`).

Automatic check-out has no scheduled job. `lib/autoCheckout.js` runs when bookings are listed (at most once a minute per server) and checks out Confirmed and Checked in bookings whose leaving day and time have passed. Checking in is always manual.

## API

All routes live in `pages/api` and use the `route()` wrapper from `lib/api.js`. Every route needs a signed-in session except `/api/login`, `/api/logout` and `/api/me`. The middleware sets `x-staff-name` from the session (a browser cannot fake it); the API records it as who made a change.

| Route | Methods | Notes |
|---|---|---|
| `/api/bookings` | GET, POST | List (filters, search, sort, `when=upcoming\|all`, `from`/`to`), create one or several rooms |
| `/api/bookings/[id]` | GET, PATCH, DELETE | Soft delete; on-hold bookings are removed for good |
| `/api/bookings/[id]/restore` | POST | Undo a delete |
| `/api/guests` | GET, POST | `?deleted=1` lists only deleted guests |
| `/api/guests/[id]` | GET, PATCH, DELETE | DELETE is a soft delete, refused while the guest has live stays |
| `/api/guests/[id]/restore` | POST | Bring a deleted guest back |
| `/api/guests/duplicates` | GET | Likely duplicate guests |
| `/api/guests/merge` | POST | Merge guests |
| `/api/companies` | GET, PATCH | Organizations and their preset colours |
| `/api/rooms` | GET | `?all=1` includes inactive rooms |
| `/api/rooms/[id]` | PATCH | Colour, number, active |
| `/api/settings` | GET, PATCH | App settings |
| `/api/views` | GET, POST, PATCH, DELETE | Saved views for Bookings and Guests |
| `/api/login`, `/api/logout`, `/api/me` | | Session. `/api/me` returns `{ name, loginRequired }` |
| `/api/account` | GET, PATCH | The signed-in person's account |
| `/api/assistant` | POST | Chat; up to 30 seconds on Vercel |

## Project layout

```
pages/            routes: index (calendar), bookings, guests, overview, settings, account, login, _app, _document
pages/api/        the API above
components/       calendar/, booking/, bookings/, guests/, overview/, settings/ and shared pieces
                  (Layout, Sheet, Dock, GlobalSearch, RoomNumber, StatusBadge, Switch, Toast ...)
lib/              db, api helpers, auth and session, dates (IST), colours, holds, bookings SQL, assistant tools,
                  autoCheckout, and the client hooks (useApi, useStoredState, useQueryState, devicePrefs ...)
db/               schema.sql, seed.sql, migrations/
scripts/          hash-password.mjs, run-sql.mjs
styles/           globals.css (Tailwind v4 tokens and component classes)
middleware.js     sign-in check for every page and API route
```

Notes for working in the code:

- The Overview page is `components/overview/OverviewPage.js`. It reads its own data (a week back to 60 days ahead, the holds, this month) and reuses `BookingRow` (with `minimal`) and `BookingSheet`.
- `BookingRow` (`components/bookings/BookingRow.js`) is the one booking row used by the Bookings tab and the Overview. Search results (`components/GlobalSearch.js`) draw the same layout.
- `RoomNumber` (`components/RoomNumber.js`) is the floor-coloured room chip. Use it instead of drawing a room number by hand. `shadeOf` colours a chip by another room's floor (used for the per-floor counts).
- Device preferences (Overview parts, first view, row density) are stored per device through `lib/devicePrefs.js`.
- Calendar view, date, span and floors live in the URL (`useCalendarParams`); a booking opens from the address with `?open=<id>`.

## Deploying

Vercel with Neon. Set `DATABASE_URL` (pooled), `STAFF_ACCOUNTS`, `SESSION_SECRET` and, if wanted, `GEMINI_API_KEY` in the project's environment variables. `vercel.json` pins the region to `sin1` (Singapore) next to the Neon database. Apply any new file in `db/migrations/` to the Neon database before deploying code that needs it.

## Testing a build without disturbing a running dev server

A running `next dev` and a second Next process must not share `.next`. Build into another folder:

```bash
NEXT_DIST_DIR=.next-test npx next build
NEXT_DIST_DIR=.next-test npx next start -p 3111
```

Open it at `http://127.0.0.1:3111` (not `localhost`, which would share cookies with the dev server). Use a throwaway database, not the real one.

## Recent changes

- **Dark mode.** Tokens in `styles/globals.css` have a light set (`:root`) and a dark set (`:root[data-theme="dark"]`). `pages/_document.js` applies the saved choice before first paint; `lib/theme.js` and `components/ThemeToggle.js` switch it. Tints and shadows come from `--ink-rgb` and `--shadow-rgb`; booking colours (`lib/colors.js`) keep their pastel in light and become deep tints of their own hue in dark (`--tone-light`); solid bars use `bg-bar` and `text-on-ink`. Use the `dark:` variant for the few things that differ. Light mode values are unchanged.
- Hold-to-delete keeps its fill full while the action runs instead of draining back; the Today tile on the calendar shows the room nights sold this month; Bookings and Guests use the full page width with a centred search and filter column; the Overview figures have their own vivid colours.
- Overview became its own tab after Guests, rebuilt to follow the reference design (greeting, day picker, figure cards, week chart, occupancy tiles, full-height list panel with filter pills, Upcoming list). The old side panel on the calendar is gone. Settings now has two switches for it: the figures and their list, and the week overview.
- Bookings and Overview rows redesigned into two lines with icons, floor-coloured room chips, a count chip per floor for multi-room stays, plain ink dates, and aligned chevrons.
- A booking opens in a sheet on the Overview and Bookings pages, with a diagonal arrow that shows it on the calendar.
- Search results use the same booking rows.
- One typeface (Outfit) for every word and number, replacing Atkinson Hyperlegible Next and Mono.
- Checked-out bars on the calendar carry light diagonal lines.
- **Clear** in the booking form now also removes the saved draft, so rooms and dates really clear.

## Further documents

- `PRODUCT.md`: who it is for, purpose, principles.
- `DESIGN.md`: colours, type, components, do's and don'ts.
- `.env.example`: environment template.
