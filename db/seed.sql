INSERT INTO rooms (number) VALUES ('101'), ('102'), ('103'), ('104'), ('105')
ON CONFLICT (number) DO NOTHING;
