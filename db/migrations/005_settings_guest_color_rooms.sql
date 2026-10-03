-- 005: guests can have a colour, app settings live in the database, and rooms 106, 206 and 306 exist.

ALTER TABLE guests ADD COLUMN IF NOT EXISTS color text;   -- palette key or #hex; shown on that guest's bookings

-- One row (key 'app') holds floor colours, status colours and default check-in/out times as JSON.
CREATE TABLE IF NOT EXISTS settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO rooms (number, color) VALUES ('106', 'stone'), ('206', 'stone'), ('306', 'stone')
ON CONFLICT (number) DO NOTHING;
