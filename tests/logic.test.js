import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dateKey,weekStart,availableFoods,confirmFood,pickIndex,readState} from '../src/logic.js';
const foods=[{id:'rice',type:'rice'},{id:'pho',type:'noodle'}];
const monday=new Date(2026,9,26,12), sunday=new Date(2026,10,1,12), next=new Date(2026,10,2,12);
test('week runs Monday to Sunday and respects local date',()=>{assert.equal(weekStart(monday),'2026-10-26');assert.equal(weekStart(sunday),'2026-10-26');assert.equal(weekStart(next),'2026-11-02');assert.equal(dateKey(monday),'2026-10-26')});
test('confirmed foods excluded this week, available next week',()=>{const h=confirmFood([],'rice',monday);assert.deepEqual(availableFoods(foods,h,'all',false,sunday),[foods[1]]);assert.equal(availableFoods(foods,h,'all',false,next).length,2)});
test('repeat override and filters; exhausted category stays empty',()=>{const h=confirmFood([],'rice',monday);assert.equal(availableFoods(foods,h,'rice',false,monday).length,0);assert.deepEqual(availableFoods(foods,h,'rice',true,monday),[foods[0]])});
test('only confirmation counts and replacing today preserves other days',()=>{const h=[{foodId:'pho',date:'2026-10-25'},{foodId:'rice',date:'2026-10-26'}];assert.deepEqual(confirmFood(h,'pho',monday),[h[0],{foodId:'pho',date:'2026-10-26'}])});
test('read persisted history validates shape, dates and food IDs',()=>{assert.deepEqual(readState('broken',['rice']),[]);assert.deepEqual(readState(JSON.stringify([{foodId:'rice',date:'2026-02-30'},{foodId:'unknown',date:'2026-10-26'},{foodId:'rice',date:'2026-10-26'}]),['rice']),[{foodId:'rice',date:'2026-10-26'}])});
test('picker handles empty and boundary indices',()=>{assert.equal(pickIndex(0),-1);assert.equal(pickIndex(12,()=>0),0);assert.equal(pickIndex(12,()=>.99999),11)});

test('retired catalog entries remain readable but never enter the spin pool',()=>{
 const catalog=[{id:'old',type:'rice',active:false},{id:'new',type:'rice'}];
 assert.deepEqual(availableFoods(catalog,[],'all',true,monday),[catalog[1]]);
 assert.deepEqual(readState(JSON.stringify([{foodId:'old',date:'2026-10-26'}]),catalog.map(f=>f.id)),[{foodId:'old',date:'2026-10-26'}]);
});
