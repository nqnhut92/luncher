import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { startDevServer } from './dev.js';
import { roomStore } from '../server/rooms.js';
import { createHandler } from '../server/handler.js';
import { createQrHandler } from '../server/preview.js';
import { roomToday } from '../server/calendar.js';

// Review the full app without Neon: an in-memory database seeded with demo groups.
// Data disappears when the process stops; nothing is written to a real database.
const db = new PGlite();
await db.exec(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
const store = roomStore(async (sql, params) => (await db.query(sql, params)).rows);
const today = roomToday();

const fresh = await store.create('Nhóm demo · chưa chốt');
const locked = await store.create('Nhóm demo · đã chốt');
await store.choose({ id: locked, revision: 0, foodId: 'mi-quang', today, replace: false, repeat: false });
// Synthetic link: valid for the Grab URL rules, but not a real order.
await store.setGrabUrl({ id: locked, revision: 1, grabUrl: 'https://app.grab.com/s/DemoOrder1' });

const port = Number(process.env.PORT) || 5173;
await startDevServer(createHandler(() => store), port, () => store, createQrHandler(() => store));
const origin = `http://127.0.0.1:${port}`;
console.log(`Luncher (local demo database) running at ${origin}
  Personal mode:        ${origin}/
  Group, not confirmed: ${origin}/g/${fresh}
  Group, confirmed+Grab: ${origin}/g/${locked}
Press Ctrl+C to stop. Demo data is discarded on exit.`);
