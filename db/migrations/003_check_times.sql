-- 003: check-in and check-out times on a booking. NULL means "not set".
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_in_time time;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_out_time time;
