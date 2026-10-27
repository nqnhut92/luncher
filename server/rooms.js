import { randomUUID } from 'node:crypto';
import { roomWeekStart } from './calendar.js';

// query(text, parameters) keeps all user input separate from SQL.
export function roomStore(query) {
  return {
    async create(name) {
      const id = randomUUID();
      await query('INSERT INTO luncher_rooms (id, name) VALUES ($1, $2)', [id, name]);
      return id;
    },
    async get(id) {
      // One statement: revision and choices always describe the same DB snapshot.
      const rows = await query(`
        SELECT r.id, r.name, r.revision,
          COALESCE((SELECT json_agg(json_build_object('foodId', m.food_id,
            'date', to_char(m.meal_date, 'YYYY-MM-DD')) ORDER BY m.meal_date)
            FROM luncher_meal_choices m WHERE m.room_id = r.id), '[]'::json) AS history
        FROM luncher_rooms r WHERE r.id = $1`, [id]);
      return rows[0] || null;
    },
    async choose({ id, revision, foodId, today, replace, repeat }) {
      // Claim the room version and write the choice atomically. A concurrent writer
      // waits for this row lock, then fails the revision check rather than overwriting.
      const rows = await query(`
        WITH claimed AS (
          UPDATE luncher_rooms SET revision = revision + 1
          WHERE id = $1 AND revision = $2
            AND (EXISTS (SELECT 1 FROM luncher_meal_choices
              WHERE room_id = $1 AND meal_date = $4::date)) = $5::boolean
            AND ($6::boolean OR NOT EXISTS (
              SELECT 1 FROM luncher_meal_choices WHERE room_id = $1
                AND food_id = $3 AND meal_date >= $7::date
                AND meal_date < $4::date))
          RETURNING id
        )
        INSERT INTO luncher_meal_choices (room_id, meal_date, food_id)
          SELECT id, $4::date, $3 FROM claimed
          ON CONFLICT (room_id, meal_date) DO UPDATE SET food_id = EXCLUDED.food_id
          RETURNING food_id`, [id, revision, foodId, today, replace, repeat, roomWeekStart(today)]);
      return rows.length > 0;
    },
    async undo({ id, revision, today }) {
      const rows = await query(`
        WITH claimed AS (
          UPDATE luncher_rooms SET revision = revision + 1
          WHERE id = $1 AND revision = $2 AND EXISTS (
            SELECT 1 FROM luncher_meal_choices WHERE room_id = $1 AND meal_date = $3::date)
          RETURNING id
        )
        DELETE FROM luncher_meal_choices WHERE room_id IN (SELECT id FROM claimed)
          AND meal_date = $3::date RETURNING food_id`, [id, revision, today]);
      return rows.length > 0;
    },
  };
}
