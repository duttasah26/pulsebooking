-- Pulse Rooms schema (Postgres). Safe to run once on an empty database.
-- Nothing is ever hard-deleted: bookings are soft-deleted via deleted_at,
-- rooms are retired via active = false, and every booking change is logged.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE rooms (
  id      serial PRIMARY KEY,
  number  text NOT NULL UNIQUE,
  active  boolean NOT NULL DEFAULT true
);

-- Names are not unique: two guests can share a name. Bookings link by id.
CREATE TABLE guests (
  id          serial PRIMARY KEY,
  name        text NOT NULL,
  phone       text,
  email       text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (phone IS NOT NULL OR email IS NOT NULL)
);
CREATE INDEX guests_name_idx ON guests (lower(name));

CREATE TYPE booking_status AS ENUM ('confirmed', 'checked_in', 'checked_out', 'cancelled');

CREATE TABLE bookings (
  id          serial PRIMARY KEY,
  room_id     int NOT NULL REFERENCES rooms(id),
  guest_id    int NOT NULL REFERENCES guests(id),
  stay        daterange NOT NULL,          -- [check_in, check_out)
  status      booking_status NOT NULL DEFAULT 'confirmed',
  channel     text NOT NULL DEFAULT 'Direct',
  rate_plan   text NOT NULL DEFAULT 'EP',
  adults      int NOT NULL DEFAULT 1,
  children    int NOT NULL DEFAULT 0,
  notes       text,
  color       text,                        -- palette key, NULL = automatic per guest
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text,
  deleted_at  timestamptz,
  deleted_by  text,
  CHECK (NOT isempty(stay)),
  -- No overlapping stays in the same room, ignoring deleted/cancelled rows.
  EXCLUDE USING gist (room_id WITH =, stay WITH &&)
    WHERE (deleted_at IS NULL AND status <> 'cancelled')
);
CREATE INDEX bookings_stay_idx ON bookings USING gist (stay);
CREATE INDEX bookings_guest_idx ON bookings (guest_id);

CREATE TABLE booking_history (
  id          serial PRIMARY KEY,
  booking_id  int NOT NULL,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  changed_by  text,
  action      text NOT NULL,               -- insert | update | delete | restore
  old_row     jsonb,
  new_row     jsonb
);
CREATE INDEX booking_history_booking_idx ON booking_history (booking_id);

-- Log every write to bookings, whichever code path made it.
CREATE FUNCTION log_booking_change() RETURNS trigger AS $$
DECLARE
  act text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO booking_history (booking_id, changed_by, action, new_row)
    VALUES (NEW.id, NEW.created_by, 'insert', to_jsonb(NEW));
    RETURN NEW;
  END IF;

  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    act := 'delete';
  ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    act := 'restore';
  ELSE
    act := 'update';
  END IF;

  NEW.updated_at := now();
  INSERT INTO booking_history (booking_id, changed_by, action, old_row, new_row)
  VALUES (NEW.id, COALESCE(NEW.deleted_by, NEW.updated_by), act, to_jsonb(OLD), to_jsonb(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_history_ins AFTER INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION log_booking_change();
CREATE TRIGGER bookings_history_upd BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION log_booking_change();
