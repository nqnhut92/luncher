import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('Set DATABASE_URL (server only), or run db/schema.sql in Neon SQL Editor.');
  process.exitCode = 1;
} else {
  try {
    const sql = neon(url);
    const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
    const statements = schema.split(';').map(s => s.trim()).filter(Boolean);
    await sql.transaction(statements.map(statement => sql.query(statement)));
    console.log('Luncher schema ready. Existing room data preserved.');
  } catch {
    console.error('Schema setup failed. Check database connectivity and permissions in Neon.');
    process.exitCode = 1;
  }
}
