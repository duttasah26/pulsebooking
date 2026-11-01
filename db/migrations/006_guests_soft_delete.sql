-- 006: a deleted guest is kept (marked, with who and when) so it can be restored, instead of being removed for good.
-- Run this in the Neon SQL editor BEFORE deploying the code that uses it.

ALTER TABLE guests ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS deleted_by text;

-- Lists of live guests filter on this, so keep it cheap.
CREATE INDEX IF NOT EXISTS guests_live_idx ON guests (lower(name)) WHERE deleted_at IS NULL;
