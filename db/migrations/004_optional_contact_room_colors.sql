-- 004: a guest no longer needs a phone or email, and every room gets its own colour.

-- Drop the "phone or email" check on guests (its generated name is not fixed, so look it up).
DO $$
DECLARE c text;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid = 'guests'::regclass AND contype = 'c' LOOP
    EXECUTE format('ALTER TABLE guests DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

-- Room colour: a palette key (see lib/colors.js) or a #hex. Editable later from a Room view.
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS color text;

UPDATE rooms r
SET color = (ARRAY['sky','peach','mint','lilac','amber','rose','teal','lime','orchid','coral'])[1 + ((x.rn - 1) % 10)]
FROM (SELECT id, row_number() OVER (ORDER BY number) AS rn FROM rooms) x
WHERE r.id = x.id AND r.color IS NULL;
