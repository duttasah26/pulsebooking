-- Rooms and their colours. Safe to run again: existing rooms are left alone.
INSERT INTO rooms (number, color) VALUES
  ('101', 'sky'),        ('102', 'peach'),  ('103', 'mint'),  ('104', 'lilac'),  ('105', 'amber'),
  ('201', 'rose'),       ('202', 'teal'),   ('203', 'lime'),  ('204', 'orchid'), ('205', 'coral'),
  ('301', 'periwinkle'), ('302', 'sand'),   ('303', 'aqua'),  ('304', 'pink'),   ('305', 'olive')
ON CONFLICT (number) DO NOTHING;
