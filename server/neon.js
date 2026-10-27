import { neon } from '@neondatabase/serverless';
import { roomStore } from './rooms.js';

export function neonStore() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw Object.assign(new Error('Database not configured'), { code: 'DATABASE_NOT_CONFIGURED' });
  const sql = neon(url);
  return roomStore((text, params) => sql.query(text, params));
}
