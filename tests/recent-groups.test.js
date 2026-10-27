import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readRecentGroups,rememberGroup,updateRememberedGroup,RECENT_GROUPS_LIMIT} from '../src/recent-groups.js';
const a={id:'Ab1Cd2',name:'Hội ăn trưa'};
const b={id:'Ef3Gh4',name:'Nhóm khác'};
test('recent groups deduplicate, move revisits first, and cap at ten',()=>{
  let groups=rememberGroup([],a,100);
  groups=rememberGroup(groups,b,200);
  groups=rememberGroup(groups,{...a,name:'Tên mới'},300);
  assert.deepEqual(groups,[{...a,name:'Tên mới',lastVisited:300},{...b,lastVisited:200}]);
  for(let i=0;i<14;i++)groups=rememberGroup(groups,{id:'G'+String(i).padStart(5,'0'),name:'Nhóm '+i},400+i);
  assert.equal(groups.length,RECENT_GROUPS_LIMIT);
  assert.equal(groups[0].id,'G00013');
  assert.equal(groups[9].id,'G00004');
});
test('remembered names update without changing recency or restoring forgotten groups',()=>{
  const groups=rememberGroup(rememberGroup([],a,100),b,200);
  const updated=updateRememberedGroup(groups,{...a,name:'Đã đổi tên'});
  assert.equal(updated[0].id,b.id);assert.equal(updated[1].lastVisited,100);
  assert.equal(updated[1].name,'Đã đổi tên');
  assert.equal(groups[1].name,a.name,'input array remains unchanged');
  assert.deepEqual(updateRememberedGroup([],a),[]);
});
test('storage parser rejects malformed records, unsafe codes, and unrelated fields',()=>{
  assert.deepEqual(readRecentGroups('broken'),[]);
  assert.deepEqual(readRecentGroups('{}'),[]);
  const raw=JSON.stringify([
    {...a,lastVisited:1,unexpected:'drop'},
    {...a,lastVisited:3,name:'Most recent'},
    {id:123456,name:'Number',lastVisited:4},
    {id:'../bad',name:'Path',lastVisited:4},
    {...b,name:' ',lastVisited:5},
    {...b,lastVisited:-1},
    {...b,lastVisited:'today'},
  ]);
  assert.deepEqual(readRecentGroups(raw),[{id:a.id,name:'Most recent',lastVisited:3}]);
});
