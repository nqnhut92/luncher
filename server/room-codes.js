import { createHash, randomInt } from 'node:crypto';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export const isRoomCode = value => /^[A-Za-z0-9]{6}$/.test(value);
export function newRoomCode() {
  return Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
}

// Generate a stable random-looking code for each legacy UUID so data migration
// can be resumed safely and its resulting link can be verified after deployment.
export function legacyRoomCode(id, attempt = 0) {
  let value = BigInt('0x' + createHash('sha256').update(`${id}:${attempt}`).digest('hex'));
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Number(value % 62n)];
    value /= 62n;
  }
  return code;
}

// Keep internal UUID/FKs to preserve existing history; public links use only code.
// Code collisions are retried against the database's unique constraint.
export async function assignRoomCode(query, id, generate = attempt => legacyRoomCode(id, attempt)) {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const rows = await query(`UPDATE luncher_rooms SET code = $2
        WHERE id = $1 AND code IS NULL RETURNING code`, [id, generate(attempt)]);
      if (rows.length) return rows[0].code;
      return (await query('SELECT code FROM luncher_rooms WHERE id = $1', [id]))[0]?.code;
    } catch (error) {
      if (error.code !== '23505') throw error;
    }
  }
  throw new Error('Unable to allocate a unique room code');
}
export async function backfillRoomCodes(query) {
  const rooms = await query('SELECT id FROM luncher_rooms WHERE code IS NULL', []);
  for (const room of rooms) await assignRoomCode(query, room.id);
  await query('ALTER TABLE luncher_rooms ALTER COLUMN code SET NOT NULL', []);
}
