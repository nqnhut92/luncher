import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { roomStore } from '../server/rooms.js';
import { createHandler } from '../server/handler.js';
import { roomToday, roomWeekStart } from '../server/calendar.js';
let db, store;
before(async () => {
  db = new PGlite();
  const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  await db.exec(schema);
  store = roomStore(async (text, params) => (await db.query(text, params)).rows);
});
after(async () => { await db.close(); });
const today = '2026-10-27';
const choose = (id, revision, foodId, extra = {}) => store.choose({ id, revision, foodId, today, replace: false, repeat: false, ...extra });
test('shared calendar crosses midnight and week boundary in Vietnam', () => {
  assert.equal(roomToday(new Date('2026-10-25T16:59:59Z')), '2026-10-25');
  assert.equal(roomToday(new Date('2026-10-25T17:00:00Z')), '2026-10-26');
  assert.equal(roomWeekStart('2026-11-01'), '2026-10-26');
  assert.equal(roomWeekStart('2026-11-02'), '2026-11-02');
});
test('schema is repeatable and preserves rooms', async () => {
  const id = await store.create('Hội cơm trưa');
  await db.exec(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  assert.equal((await store.get(id)).name, 'Hội cơm trưa');
});
test('rooms isolate history; confirm, explicit replacement and undo', async () => {
  const a = await store.create('A'), b = await store.create('B');
  assert.equal(await choose(a, 0, 'com-tam'), true);
  assert.deepEqual((await store.get(a)).history, [{ foodId: 'com-tam', date: today }]);
  assert.deepEqual((await store.get(b)).history, []);
  assert.equal(await choose(a, 1, 'pho'), false, 'confirm never implicitly replaces');
  assert.equal(await choose(a, 1, 'pho', { replace: true }), true);
  assert.equal(await store.undo({ id: a, revision: 1, today }), false, 'stale undo rejected');
  assert.equal(await store.undo({ id: a, revision: 2, today }), true);
  assert.deepEqual((await store.get(a)).history, []);
});
test('two writers with same revision: only one commits, stale writer cannot overwrite', async () => {
  const id = await store.create('Race');
  const outcomes = await Promise.all([choose(id, 0, 'com-tam'), choose(id, 0, 'pho')]);
  assert.equal(outcomes.filter(Boolean).length, 1);
  const room = await store.get(id);
  assert.equal(room.revision, 1);
  assert.equal(room.history.length, 1);
});
test('week exclusion enforced in DB, repeat override, new week and no version bump on rejection', async () => {
  const id = await store.create('Weekly');
  assert.equal(await choose(id, 0, 'pho', { today: '2026-10-26' }), true);
  assert.equal(await choose(id, 1, 'pho'), false);
  assert.equal((await store.get(id)).revision, 1);
  assert.equal(await choose(id, 1, 'pho', { repeat: true }), true);
  assert.equal(await choose(id, 2, 'pho', { today: '2026-11-02' }), true);
});
async function request(options = {}, getStore = () => store) {
  const { method = 'POST', body, headers = {}, query = {} } = options;
  const req = { method, body, query, headers: { host: 'luncher.test', 'content-type': 'application/json', ...headers } };
  const res = { headers: {}, setHeader(key,value) { this.headers[key]=value; }, status(code) { this.code=code;return this; }, json(data) { this.data=data;return this; } };
  await createHandler(getStore, () => new Date('2026-10-27T05:00:00Z'))(req, res);
  return res;
}
test('API validates input, rejects cross-origin writes, never leaks database errors', async () => {
  assert.equal((await request({ body: {action:'create',name:'  '} })).code, 400);
  assert.equal((await request({ body: '{oops' })).code, 400);
  assert.equal((await request({ method:'DELETE' })).code, 405);
  assert.equal((await request({ body:{action:'create',name:'A'},headers:{origin:'https://other.test'} })).code,403);
  const error = await request({body:{action:'create',name:'A'}}, () => {throw new Error('postgres://private-credential');});
  assert.equal(error.code,503);assert.ok(!JSON.stringify(error.data).includes('private-credential'));
});
test('API create/read/mutate/conflict, missing room, no client date override', async () => {
  const created = await request({body:{action:'create',name:'Nhóm 🍜'}});
  assert.equal(created.code,201);
  const id=created.data.room.id;
  const get=await request({method:'GET',query:{id}});
  assert.equal(get.code,200);assert.equal(get.headers['Cache-Control'],'private, no-store');
  const body={action:'confirm',id,revision:0,foodId:'pho',repeat:false,today};
  assert.equal((await request({body:{...body,foodId:'unknown'}})).code,400);
  assert.equal((await request({body:{...body,today:'2026-10-26'}})).code,409);
  assert.equal((await request({body})).code,200);
  const stale=await request({body:{...body,foodId:'com-tam'}});
  assert.equal(stale.code,409);assert.equal(stale.data.room.history[0].foodId,'pho');
  const missing=await request({method:'GET',query:{id:'Z9y8X7'}});
  assert.equal(missing.code,404);
});

test('six-character codes retry collisions and remain case-sensitive', async () => {
  const seeded = '11111111-1111-4111-8111-111111111111';
  await db.query('INSERT INTO luncher_rooms (id, name, code) VALUES ($1, $2, $3)', [seeded, 'Existing', 'Ab1Cd2']);
  const candidates = ['Ab1Cd2', 'Fg3Hi4'];
  const shortStore = roomStore(async (sql, params) => (await db.query(sql, params)).rows, () => candidates.shift());
  const code = await shortStore.create('Collision handled');
  assert.equal(code, 'Fg3Hi4');
  assert.equal((await shortStore.get(code)).name, 'Collision handled');
  assert.equal(await shortStore.get(code.toLowerCase()), null);
});

test('migration assigns short codes without changing internal keys or history; old links stop working', async () => {
  const { backfillRoomCodes, legacyRoomCode } = await import('../server/room-codes.js');
  const legacy = new PGlite();
  try {
    const oldSchema = (await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8')).split('-- Additive migration:')[0];
    await legacy.exec(oldSchema);
    const id = '22222222-2222-4222-8222-222222222222';
    await legacy.query('INSERT INTO luncher_rooms (id, name, revision) VALUES ($1, $2, 1)', [id, 'The Access Group']);
    await legacy.query('INSERT INTO luncher_meal_choices VALUES ($1, $2, $3)', [id, today, 'mi-quang']);
    await legacy.exec(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
    const query = async (sql, params) => (await legacy.query(sql, params)).rows;
    await backfillRoomCodes(query);
    const migratedStore = roomStore(query);
    const room = await migratedStore.get(legacyRoomCode(id));
    assert.equal(await migratedStore.get(id), null);
    assert.match(room.id, /^[A-Za-z0-9]{6}$/);
    assert.equal(room.revision, 1);
    assert.equal((await query("SELECT is_nullable FROM information_schema.columns WHERE table_name = 'luncher_rooms' AND column_name = 'code'"))[0].is_nullable, 'NO');
    assert.deepEqual(room.history, [{ foodId: 'mi-quang', date: today }]);
    assert.deepEqual(await migratedStore.get(room.id), room);
    await backfillRoomCodes(query);
    assert.deepEqual(await migratedStore.get(room.id), room, 'rerun preserves public link');
    assert.equal((await query('SELECT room_id::text FROM luncher_meal_choices'))[0].room_id, id);
  } finally { await legacy.close(); }
});

test('backfill retries collisions without changing internal identity', async () => {
  const id = '33333333-3333-4333-8333-333333333333';
  await db.query('INSERT INTO luncher_rooms (id, name) VALUES ($1, $2)', [id, 'Old deployment']);
  const codes = ['Ab1Cd2', 'Zz9Xx8'];
  const { assignRoomCode } = await import('../server/room-codes.js');
  const query = async (sql, params) => (await db.query(sql, params)).rows;
  assert.equal(await assignRoomCode(query, id, () => codes.shift()), 'Zz9Xx8');
  assert.equal((await store.get('Zz9Xx8')).name, 'Old deployment');
});

test('rename is revision-checked, validates names, and keeps history and link', async () => {
  const id = await store.create('Old name');
  assert.equal(await choose(id, 0, 'mi-quang'), true);
  const invalid = await request({ body: {action:'rename',id,revision:1,name:'   '} });
  assert.equal(invalid.code,400);
  assert.equal((await request({ body: {action:'rename',id,revision:1,name:'x'.repeat(61)} })).code,400);
  const renamed = await request({ body: {action:'rename',id,revision:1,name:'  Hội <b>ăn trưa</b>  '} });
  assert.equal(renamed.code,200);
  assert.equal(renamed.data.room.id,id);
  assert.equal(renamed.data.room.name,'Hội <b>ăn trưa</b>');
  assert.deepEqual(renamed.data.room.history,[{foodId:'mi-quang',date:today}]);
  const stale = await request({ body: {action:'rename',id,revision:1,name:'Stale name'} });
  assert.equal(stale.code,409);
  assert.equal(stale.data.room.name,'Hội <b>ăn trưa</b>');
  assert.equal(await store.undo({id,revision:1,today}),false);
});

test('API only accepts six alphanumeric characters, not legacy UUIDs', async () => {
  for (const id of ['f75bfda7-b815-46bc-b3f9-dc237617c8a0', 'abc12', 'abc1234', 'abc_12']) {
    assert.equal((await request({method:'GET',query:{id}})).code,400);
  }
});
