-- Run once in Neon SQL Editor, or use npm run db:setup.
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
