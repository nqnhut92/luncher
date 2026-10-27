import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readPersonal,confirmPersonal} from '../src/activity.js';
const ids=['pho','mi-quang'];
const now=new Date(2026,9,27,12);
test('personal confirmation and replacement retain both events across reload',()=>{
  let state=readPersonal(null,null,ids,now);
  state=confirmPersonal(state,'pho',now);
  state=confirmPersonal(state,'mi-quang',new Date(2026,9,27,13));
  assert.deepEqual(state.history,[{foodId:'mi-quang',date:'2026-10-27'}]);
  assert.deepEqual(state.events.map(e=>[e.action,e.previousFoodId,e.foodId]),[
    ['confirm',null,'pho'],['replace','pho','mi-quang'],
  ]);
  assert.deepEqual(readPersonal(JSON.stringify(state),null,ids,now),state);
  assert.equal(confirmPersonal(state,'mi-quang',now),state,'no-op creates no event');
});
test('legacy local history gets a labeled baseline, not a fabricated old confirmation',()=>{
  const legacy=JSON.stringify([{foodId:'mi-quang',date:'2026-10-26'}]);
  const state=readPersonal(null,legacy,ids,now);
  assert.equal(state.events[0].action,'snapshot');
  assert.equal(state.events[0].date,'2026-10-26');
  assert.equal(state.events[0].occurredAt,now.toISOString());
  assert.deepEqual(readPersonal(JSON.stringify(state),legacy,ids,now),state);
});
test('malformed personal state recovers valid legacy history and drops invalid events',()=>{
  assert.deepEqual(readPersonal('{oops',null,ids,now),{history:[],events:[]});
  const raw=JSON.stringify({history:[],events:[{action:'replace',foodId:'pho',previousFoodId:'unknown',date:'2026-10-27',occurredAt:now.toISOString()}]});
  assert.equal(readPersonal(raw,null,ids,now).events.length,0);
});
