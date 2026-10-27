import { readFile, readdir } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
import { backfillRoomCodes } from '../server/room-codes.js';
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('Set DATABASE_URL (server only), then run npm run db:setup again.');
  process.exitCode = 1;
} else {
  try {
    const sql = neon(url);
    const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
    const migrationDir = new URL('../db/migrations/', import.meta.url);
    const files = (await readdir(migrationDir)).filter(name => name.endsWith('.sql')).sort();
    const sources = [schema, ...await Promise.all(files.map(name => readFile(new URL(name, migrationDir), 'utf8')))];
    const statements = sources.flatMap(source => source.replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean));
    await sql.transaction(statements.map(statement => sql.query(statement)));
    await backfillRoomCodes((text, params) => sql.query(text, params));
    console.log('Luncher schema, room codes, and meal journal ready. Existing room data preserved.');
  } catch {
    console.error('Schema setup failed. Check database connectivity and permissions in Neon.');
    process.exitCode = 1;
  }
}
