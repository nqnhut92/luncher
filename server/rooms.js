import { randomUUID } from 'node:crypto';
import { newRoomCode } from './room-codes.js';
import { roomWeekStart } from './calendar.js';

// query(text, parameters) keeps all user input separate from SQL.
export function roomStore(query, generateCode = newRoomCode) {
  return {
    async create(name) {
      const id = randomUUID();
      for (let attempt = 0; attempt < 20; attempt++) {
        const code = generateCode();
        const rows = await query(`INSERT INTO luncher_rooms (id, name, code)
          VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING RETURNING code`, [id, name, code]);
        if (rows.length) return code;
      }
      throw new Error('Unable to allocate a unique room code');
    },
    async get(id) {
      // One statement: revision and choices always describe the same DB snapshot.
      const rows = await query(`
        SELECT r.code AS id, r.name, r.revision, r.grab_url AS "grabUrl",
          COALESCE((SELECT json_agg(json_build_object('foodId', m.food_id,
            'date', to_char(m.meal_date, 'YYYY-MM-DD')) ORDER BY m.meal_date)
            FROM luncher_meal_choices m WHERE m.room_id = r.id), '[]'::json) AS history,
          COALESCE((SELECT json_agg(json_build_object('id', e.id, 'action', e.action,
            'date', to_char(e.meal_date, 'YYYY-MM-DD'), 'foodId', e.food_id,
            'previousFoodId', e.previous_food_id,
            'occurredAt', to_char(e.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
            ORDER BY e.occurred_at, e.id)
            FROM luncher_meal_events e WHERE e.room_id = r.id), '[]'::json) AS events
        FROM luncher_rooms r WHERE r.code = $1`, [id]);
      return rows[0] || null;
    },
    async choose({ id, revision, foodId, today, replace, repeat }) {
      // Claim the room version and write the choice atomically. A concurrent writer
      // waits for this row lock, then fails the revision check rather than overwriting.
      const rows = await query(`
        WITH previous AS MATERIALIZED (
          SELECT m.food_id FROM luncher_meal_choices m
          JOIN luncher_rooms r ON r.id = m.room_id
          WHERE r.code = $1 AND m.meal_date = $4::date
        ), claimed AS (
          UPDATE luncher_rooms r SET revision = revision + 1
          WHERE r.code = $1 AND revision = $2
            AND (EXISTS (SELECT 1 FROM luncher_meal_choices
              WHERE room_id = r.id AND meal_date = $4::date)) = $5::boolean
            AND ($6::boolean OR NOT EXISTS (
              SELECT 1 FROM luncher_meal_choices WHERE room_id = r.id
                AND food_id = $3 AND meal_date >= $7::date
                AND meal_date < $4::date))
            AND NOT EXISTS (SELECT 1 FROM luncher_meal_choices
              WHERE room_id = r.id AND meal_date = $4::date AND food_id = $3)
          RETURNING id, revision
        ), changed AS (
          INSERT INTO luncher_meal_choices (room_id, meal_date, food_id)
            SELECT id, $4::date, $3 FROM claimed
            ON CONFLICT (room_id, meal_date) DO UPDATE SET food_id = EXCLUDED.food_id
            RETURNING room_id, meal_date, food_id
        )
        INSERT INTO luncher_meal_events
          (room_id, meal_date, action, previous_food_id, food_id, room_revision)
          SELECT c.room_id, c.meal_date, CASE WHEN $5::boolean THEN 'replace' ELSE 'confirm' END,
            (SELECT food_id FROM previous), c.food_id, r.revision
          FROM changed c JOIN claimed r ON r.id = c.room_id
          RETURNING id`, [id, revision, foodId, today, replace, repeat, roomWeekStart(today)]);
      return rows.length > 0;
    },
    async rename({ id, revision, name }) {
      const rows = await query(`UPDATE luncher_rooms r SET name = $3, revision = revision + 1
        WHERE r.code = $1 AND revision = $2 RETURNING id`, [id, revision, name]);
      return rows.length > 0;
    },
    async setGrabUrl({ id, revision, grabUrl }) {
      const rows = await query(`UPDATE luncher_rooms r SET grab_url = $3, revision = revision + 1
        WHERE r.code = $1 AND revision = $2 RETURNING id`, [id, revision, grabUrl]);
      return rows.length > 0;
    },
  };
}
