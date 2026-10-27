-- Base schema. Use npm run db:setup to include data migrations and backfills.
-- Repeatable: does not erase existing rooms or history.
CREATE TABLE IF NOT EXISTS luncher_rooms (
  id uuid PRIMARY KEY,
  name varchar(60) NOT NULL CHECK (length(trim(name)) > 0),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS luncher_meal_choices (
  room_id uuid NOT NULL REFERENCES luncher_rooms(id) ON DELETE CASCADE,
  meal_date date NOT NULL,
  food_id text NOT NULL,
  PRIMARY KEY (room_id, meal_date)
);

-- Additive migration: keep UUID primary keys and history references intact.
-- Setup backfills public codes for existing rooms before deploying the new API.
ALTER TABLE luncher_rooms ADD COLUMN IF NOT EXISTS code varchar(6)
  UNIQUE CHECK (code ~ '^[A-Za-z0-9]{6}$');

-- Current daily choices and the append-only application journal are separate.
CREATE TABLE IF NOT EXISTS luncher_meal_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES luncher_rooms(id) ON DELETE CASCADE,
  meal_date date NOT NULL,
  action text NOT NULL CHECK (action IN ('confirm', 'replace', 'snapshot')),
  previous_food_id text,
  food_id text NOT NULL,
  room_revision integer NOT NULL CHECK (room_revision >= 0),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, meal_date, room_revision),
  CHECK ((action = 'replace' AND previous_food_id IS NOT NULL AND previous_food_id <> food_id)
    OR (action IN ('confirm', 'snapshot') AND previous_food_id IS NULL))
);
CREATE INDEX IF NOT EXISTS luncher_meal_events_room_time_idx
  ON luncher_meal_events (room_id, occurred_at, id);

-- Honest baseline for existing data: original selection time is unknown.
-- Do not invent old confirmation events or change the stored daily choice.
INSERT INTO luncher_meal_events
  (room_id, meal_date, action, food_id, room_revision)
SELECT m.room_id, m.meal_date, 'snapshot', m.food_id, r.revision
FROM luncher_meal_choices m JOIN luncher_rooms r ON r.id = m.room_id
WHERE NOT EXISTS (SELECT 1 FROM luncher_meal_events e
  WHERE e.room_id = m.room_id AND e.meal_date = m.meal_date)
ON CONFLICT (room_id, meal_date, room_revision) DO NOTHING;

-- Optional Grab group-order link; shared previews render it as a QR code.
ALTER TABLE luncher_rooms ADD COLUMN IF NOT EXISTS grab_url varchar(500)
  CHECK (grab_url ~ '^https://');
