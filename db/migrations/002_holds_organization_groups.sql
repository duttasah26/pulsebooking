-- 002: on-hold bookings, organization, multi-room groups.
-- Additive and safe to run on a database created from the first schema.sql. Run each statement once.
-- (ALTER TYPE ... ADD VALUE must run on its own, outside a transaction block.)

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'on_hold';

-- A hold can exist before anyone knows the guest.
ALTER TABLE bookings ALTER COLUMN guest_id DROP NOT NULL;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS organization text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS label text;          -- short title, mainly for holds
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS group_id uuid;       -- shared by rooms booked together
ALTER TABLE guests   ADD COLUMN IF NOT EXISTS organization text;   -- default organization for the guest

CREATE INDEX IF NOT EXISTS bookings_group_idx ON bookings (group_id) WHERE group_id IS NOT NULL;

-- Everything except a hold needs a guest.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_guest_required;
ALTER TABLE bookings ADD CONSTRAINT bookings_guest_required CHECK (guest_id IS NOT NULL OR status = 'on_hold');
