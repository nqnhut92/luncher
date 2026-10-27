import './style.css';
import morphdom from 'morphdom';
import {showToast} from './toast.js';
import foods from './foods.json';
import {dateKey,weekStart,availableFoods,pickIndex,readState} from './logic.js';
import {readPersonal, confirmPersonal} from './activity.js';
import {RECENT_GROUPS_KEY, readRecentGroups, rememberGroup, updateRememberedGroup} from './recent-groups.js';
import {roomRequest, escapeHtml} from './groups.js';
const app = document.querySelector('#app');
let groupId = location.pathname.startsWith('/g/') ? location.pathname.split('/')[2] || 'invalid' : null;
let group = null, groupToday = null, loading = Boolean(groupId), busy = false, refreshing = false, editingName = false, nameDraft = '';
let changingMeal = false, activityOpen = false, events = [];
let recentGroups=[], recordedVisit=false, recentStorageFailed=false;
try{recentGroups=readRecentGroups(localStorage.getItem(RECENT_GROUPS_KEY));}catch{}
let history = [], category = 'all', repeat = false, result = null, spinning = false, rotation = 0;
if (!groupId) {
 try {
  const personal=readPersonal(localStorage.getItem('luncher-personal-v2'),localStorage.getItem('luncher-history-v1'),foods.map(f=>f.id));
  history=personal.history; events=personal.events;
  localStorage.setItem('luncher-personal-v2',JSON.stringify(personal));
 } catch {showToast('Không lưu được dữ liệu. Bạn vẫn có thể dùng trong phiên này.','error');}
}
const labels = {all:'Tất cả',rice:'🍚 Cơm',noodle:'🍜 Bún / Mì',light:'🥖 Ăn nhẹ',veg:'🌱 Ăn chay'};
const colors = ['#f5d9ba','#dfe7d0','#f4e6cc','#e9d7c8','#d6e5df','#f0d7cb'];
const displayDate = value => new Date(value+'T12:00:00').toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit'});
function save() { try { localStorage.setItem('luncher-personal-v2',JSON.stringify({history,events})); } catch { showToast('Không lưu được trên trình duyệt. Lịch sử chỉ còn trong phiên này.','error'); } }
function calendarDate() { return groupToday ? new Date(groupToday+'T12:00:00') : new Date(); }
function currentChoice() {return history.find(h=>h.date===dateKey(calendarDate()));}
function eventLabel(event) {
 const name=id=>foods.find(f=>f.id===id)?.name || id;
 return event.action==='replace' ? `Đổi ${name(event.previousFoodId)} → ${name(event.foodId)}`
  : event.action==='snapshot' ? `Đã có: ${name(event.foodId)}` : `Chốt ${name(event.foodId)}`;
}
function eventTime(event) {
 return new Date(event.occurredAt).toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit',...(groupId?{timeZone:'Asia/Ho_Chi_Minh'}:{})});
}
function render() {
 const blocked = spinning || busy || Boolean(groupId && (!group || loading));
 const today=dateKey(calendarDate()), start=weekStart(calendarDate()), chosen=currentChoice(), todayFood=foods.find(f=>f.id===chosen?.foodId);
 const locked=Boolean(todayFood&&!changingMeal), controlsBlocked=blocked||locked;
 const pool=availableFoods(foods,history,category,repeat,calendarDate()).filter(f=>!changingMeal||f.id!==todayFood?.id), used=history.filter(h=>h.date>=start&&h.date<=today);
 const weekDays=Array.from({length:7},(_,i)=>{
  const date=new Date(start+'T12:00:00');date.setDate(date.getDate()+i);
  const key=dateKey(date), choice=used.find(h=>h.date===key);
  return {key,choice,food:foods.find(f=>f.id===choice?.foodId),day:i===6?'CN':`T${i+2}`,date:date.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})};
 });
 const size=pool.length, step=360/(size||1);
 const gradient=size?pool.map((f,i)=>`${colors[i%colors.length]} ${i*step}deg ${(i+1)*step}deg`).join(','):'#e6e0d7 0deg 360deg';
 const markup=`<header><a class="brand" href="/"><span class="brand-icon">✳</span> luncher<span class="brand-dot">.</span></a><div class="header-right"><span class="tiny">BỚT NGHĨ · ĂN NGON</span><button id="theme" class="icon-button" aria-label="Đổi giao diện sáng tối">${document.documentElement.dataset.theme==='dark'?'☀':'☾'}</button></div></header>
 <main><section class="intro"><div class="eyebrow"><span></span> CỨ ĐỂ CHIẾC BỤNG DẪN LỐI</div><h1>Trưa nay <br>ăn <em>gì nhỉ?</em></h1><p>Một vòng quay nhỏ. Một quyết định ngon lành.<br>Để Luncher chọn giùm bạn hôm nay.</p></section>
 ${!groupId&&recentGroups.length?`<section class="recent-groups" aria-labelledby="recent-heading"><div class="recent-heading"><h2 id="recent-heading">Nhóm gần đây</h2><p>Những nhóm bạn đã mở trên trình duyệt này.</p></div><div class="recent-grid">${recentGroups.map(room=>`<article class="recent-card" id="recent-${room.id}"><a class="recent-link" href="/g/${room.id}"><span class="recent-icon" aria-hidden="true">🍱</span><span class="recent-name"><b title="${escapeHtml(room.name)}">${escapeHtml(room.name)}</b><small>Mở lại nhóm ↗</small></span></a><button type="button" class="recent-remove" data-forget-group="${room.id}" aria-label="Bỏ ${escapeHtml(room.name)} khỏi danh sách gần đây" title="Bỏ khỏi danh sách gần đây"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></article>`).join('')}</div></section>`:''}
 ${groupId ? `<section class="group-bar"><div><div class="eyebrow">NHÓM ĂN CHUNG · GIỜ VIỆT NAM</div>${group && editingName ? `<form id="rename-group" class="rename-form"><label class="sr-only" for="rename-name">Tên nhóm mới</label><input id="rename-name" name="name" value="${escapeHtml(nameDraft)}" maxlength="60" required ${blocked?'disabled':''}><button class="small-primary" ${blocked?'disabled':''}>${busy?'Đang lưu…':'Lưu tên'}</button><button id="cancel-rename" type="button" class="chip" ${busy?'disabled':''}>Hủy</button></form>` : `<div class="group-title"><h2>${group ? escapeHtml(group.name) : loading ? 'Đang mở nhóm…' : 'Chưa mở được nhóm'}</h2>${group ? `<button id="edit-name" class="edit-name" aria-label="Sửa tên nhóm" title="Sửa tên nhóm" ${blocked?'disabled':''}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z"/><path d="m15 5 4 4"/></svg></button>` : ''}</div>`}<p>Ai có link cũng có thể chốt và đổi món. Giữ link cho những người cùng ăn nhé.</p></div><div class="group-buttons"><button id="copy-group" class="chip" ${spinning || busy ? 'disabled' : ''}>Copy link nhóm</button><button id="refresh-group" class="chip" ${spinning || busy || loading ? 'disabled' : ''}>Tải lại kết quả</button><a class="text-button" href="/">Quay cá nhân</a></div></section>` : `<section class="group-bar"><div><div class="eyebrow">ĂN CHUNG, CHỐT CHUNG</div><h2>Trưa nay cả nhóm ăn gì?</h2><p>Tạo một link cố định. Cùng xem món đã chốt, cùng tránh lặp trong tuần.</p></div><form id="create-group"><label class="sr-only" for="group-name">Tên nhóm ăn trưa</label><input id="group-name" name="name" placeholder="Tên nhóm, ví dụ: Hội đói tầng 3" maxlength="60" required ${busy ? 'disabled' : ''}><button class="small-primary" ${busy ? 'disabled' : ''}>${busy ? 'Đang tạo…' : 'Tạo nhóm ↗'}</button></form></section>`}
 <section class="workspace"><div class="spin-panel"><div class="panel-top"><span class="eyebrow">VÒNG QUAY CHIẾC BỤNG</span><span class="count">${size} món đang chờ</span></div><div class="wheel-area"><div class="pointer"></div><div class="wheel" style="background:conic-gradient(${gradient});transform:rotate(${rotation}deg)">${pool.map((f,i)=>`<div class="wheel-label" style="--angle:${(i+.5)*step}deg"><span>${f.emoji}</span><b>${f.name}</b></div>`).join('')}</div><div class="hub">🍽️</div>${!size?'<div class="empty-wheel">Hết món phù hợp rồi!</div>':''}</div>
 <div class="spin-actions"><button class="primary ${locked?'is-locked':''}" id="spin" ${controlsBlocked||!size?'disabled':''}>${locked?'Hôm nay đã chốt ✓':spinning?'Đang chọn món ngon…':'✳  '+(result?'Quay món khác':'Quay đi, đói rồi!')}</button><span class="hint">${repeat?'Đang cho phép lặp món trong tuần':'Không lặp món đã chốt trong tuần'}</span></div>
 ${changingMeal?`<div class="change-banner"><span>Món hiện tại vẫn giữ cho tới khi bạn chốt món mới.</span><button id="cancel-change" class="text-button" ${blocked?'disabled':''}>Hủy đổi món</button></div>`:''}
 <div class="result" aria-live="polite">${result?`<span class="result-emoji">${result.emoji}</span><div><small>CHIẾC BỤNG ĐÃ CHỌN</small><h2>${result.name}</h2><p>${groupId && todayFood?'Nhóm đang chốt: '+todayFood.name:'Nghe cũng ngon đó chứ?'}</p></div><button id="confirm" class="small-primary" ${blocked?'disabled':''}>${busy?'Đang lưu…':groupId?(todayFood?'Đổi món đã chốt ↗':'Chốt cho nhóm ↗'):'Chốt món này ↗'}</button>`:todayFood?`<span class="result-emoji">${todayFood.emoji}</span><div><small>HÔM NAY ĐÃ CHỐT</small><h2>${todayFood.name}</h2><p>Chúc bạn một bữa trưa ngon!</p></div>${!changingMeal?`<button id="change-meal" class="text-button" ${blocked?'disabled':''}>Đổi món hôm nay</button>`:''}`:'<span class="result-emoji">💭</span><div><h2>Món ngon đang đợi</h2><p>Bấm quay, để chuyện ăn trưa nhẹ đầu hơn.</p></div>'}</div></div>
 <aside><section class="side-card"><div class="eyebrow">KHẨU VỊ HÔM NAY</div><h2>Bạn đang thèm gì?</h2><div class="chips">${Object.entries(labels).map(([id,name])=>`<button data-category="${id}" class="chip ${category===id?'active':''}" ${controlsBlocked?'disabled':''}>${name}</button>`).join('')}</div><label class="repeat"><input type="checkbox" id="repeat" ${repeat?'checked':''} ${controlsBlocked?'disabled':''}> Cho phép lặp món trong tuần</label></section>
 <section class="side-card weekly"><div class="card-heading"><div class="eyebrow">THỰC ĐƠN TUẦN NÀY</div><span>${used.length}/7</span></div><h2>Mỗi ngày một món.</h2><p class="muted">Từ thứ Hai đến Chủ nhật.</p><div class="week-list">${weekDays.map(day=>`<div class="week-row ${day.choice?'is-chosen':''} ${day.key===today?'is-today':''}"><span class="week-day">${day.day}<small>${day.date}</small></span><span class="week-emoji" aria-hidden="true">${day.food?.emoji||'·'}</span><b title="${day.food?.name||'Chưa chọn món'}">${day.food?.name||'Chưa chọn món'}</b>${day.choice?'<span class="check" aria-label="Đã chốt">✓</span>':''}</div>`).join('')}</div></section></aside></section>
 <section class="history-section"><details class="activity-log side-card" ${activityOpen?'open':''}><summary>Lịch sử thay đổi <span>${events.length}</span></summary><div class="activity-list">${events.length?events.slice().reverse().map(event=>`<div class="activity-row"><small>${escapeHtml(displayDate(event.date))} · ${escapeHtml(eventTime(event))}</small><p>${escapeHtml(eventLabel(event))}</p>${event.action==='snapshot'?'<small>Món có sẵn trước khi bật nhật ký; không rõ giờ chốt ban đầu.</small>':''}</div>`).join(''):'<p class="muted">Chưa có lần chốt món nào.</p>'}</div></details></section>
 <section class="menu-section"><div class="menu-heading"><div><div class="eyebrow">CÓ GÌ TRONG VÒNG QUAY?</div><h2>Một chút cảm hứng cho bữa trưa</h2></div><span class="count">${foods.length} món quen, dễ chọn</span></div><div class="food-grid">${foods.map(f=>{const h=used.find(h=>h.foodId===f.id);return `<div class="food-card ${h?'eaten':''}"><span>${f.emoji}</span><div><b>${f.name}</b><small>${h?'Đã chọn · '+displayDate(h.date):labels[f.type].split(' ').slice(1).join(' ')}</small></div>${h?'<span class="check">✓</span>':''}</div>`}).join('')}</div></section>
 </main><footer><span>luncher. <span class="muted">/ bớt phân vân, thêm ngon miệng.</span></span><span>Một bữa trưa vui vẻ nhé ☺</span></footer>`;
 // Reconcile changed nodes instead of discarding forms, scroll containers and the wheel.
 morphdom(app, `<div id="app">${markup}</div>`, {
  childrenOnly:true,
  onBeforeElUpdated(from,to){
   if(from.isEqualNode(to))return false;
   // Preserve the caret/selection while typing when unrelated UI is updated.
   if(from===document.activeElement&&from.matches('input:not([type=checkbox])')&&from.disabled===to.disabled)return false;
   return true;
  },
 });
 document.querySelector('#theme').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('luncher-theme',theme)}catch{}document.querySelector('#theme').textContent=theme==='dark'?'☀':'☾';};
 document.querySelectorAll('[data-forget-group]').forEach(button=>button.onclick=()=>forgetGroup(button.dataset.forgetGroup));
 document.querySelector('#spin').onclick=spin;
 document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;result=null;rotation=0;render()});
 document.querySelector('#repeat').onchange=e=>{repeat=e.target.checked;result=null;rotation=0;render()};
 const confirmButton=document.querySelector('#confirm');
 if(confirmButton)confirmButton.onclick=()=>{
  if(groupId){mutateGroup(chosen?'replace':'confirm');return;}
  const next=confirmPersonal({history,events},result.id);history=next.history;events=next.events;
  save();changingMeal=false;result=null;rotation=0;render();
 };
 const changeButton=document.querySelector('#change-meal');
 if(changeButton)changeButton.onclick=()=>{changingMeal=true;result=null;rotation=0;render();document.querySelector('#spin').focus({preventScroll:true});};
 const cancelChangeButton=document.querySelector('#cancel-change');
 if(cancelChangeButton)cancelChangeButton.onclick=()=>{changingMeal=false;result=null;rotation=0;render();document.querySelector('#change-meal')?.focus({preventScroll:true});};
 document.querySelector('.activity-log').ontoggle=e=>{activityOpen=e.target.open};
 const createForm=document.querySelector('#create-group');
 if(createForm)createForm.onsubmit=createGroup;
 const copyButton=document.querySelector('#copy-group');
 if(copyButton)copyButton.onclick=copyGroup;
 const refreshButton=document.querySelector('#refresh-group');
 if(refreshButton)refreshButton.onclick=refreshGroup;
 const editButton=document.querySelector('#edit-name');
 if(editButton)editButton.onclick=()=>{editingName=true;nameDraft=group.name;render();document.querySelector('#rename-name').focus();document.querySelector('#rename-name').select();};
 const nameInput=document.querySelector('#rename-name');
 if(nameInput)nameInput.oninput=e=>{nameDraft=e.target.value};
 const renameForm=document.querySelector('#rename-group');
 if(renameForm)renameForm.onsubmit=renameGroup;
 const cancelRenameButton=document.querySelector('#cancel-rename');
 if(cancelRenameButton)cancelRenameButton.onclick=cancelRename;
 if(nameInput)nameInput.onkeydown=e=>{if(e.key==='Escape'&&!busy){e.preventDefault();cancelRename();}};
}
function spin() {
 if(spinning||busy||(currentChoice()&&!changingMeal)||(groupId&&(!group||loading)))return;
 const pool=availableFoods(foods,history,category,repeat,calendarDate()).filter(f=>!changingMeal||f.id!==currentChoice()?.foodId);if(!pool.length)return;
 const index=pickIndex(pool.length);spinning=true;result=null;render();
 const target=(360-((index+.5)*360/pool.length))%360;
 rotation+=360*5+((target-rotation%360+360)%360);
 requestAnimationFrame(()=>requestAnimationFrame(()=>{document.querySelector('.wheel').style.transform=`rotate(${rotation}deg)`}));
 setTimeout(()=>{spinning=false;result=pool[index];render()},matchMedia('(prefers-reduced-motion: reduce)').matches?50:4250);
}
function applyGroup(data) {
 group=data.room; groupToday=data.today; events=group.events||[];changingMeal=false;
 recordRecentGroup(group);
 if(groupId!==group.id){groupId=group.id;window.history.replaceState(null,'','/g/'+groupId);}
 history=readState(JSON.stringify(group.history),foods.map(f=>f.id));
 result=null; rotation=0;
}
function connectionError(error) {
 return error.name === 'TimeoutError' || error.name === 'TypeError'
   ? 'Không kết nối được nhóm. Kiểm tra mạng rồi bấm tải lại nhé.' : error.message;
}
async function refreshGroup() {
 if(!groupId||spinning||busy||refreshing)return;
 refreshing=true; loading=true;  render();
 try { applyGroup(await roomRequest({id:groupId})); }
 catch(error) { showToast(connectionError(error),'error'); }
 finally { refreshing=false; loading=false; render(); }
}
async function createGroup(event) {
 event.preventDefault(); if(busy)return;
 const name=new FormData(event.target).get('name').trim();
 if(!name)return;
 busy=true;  render();
 try {
   const data=await roomRequest({action:'create',name});
   location.assign('/g/'+data.room.id);
 } catch(error) { showToast(connectionError(error),'error'); busy=false; render(); }
}
async function mutateGroup(action) {
 if(busy||spinning||loading||!group)return;
 const payload={action,id:groupId,revision:group.revision,today:groupToday};
 payload.foodId=result.id;payload.repeat=repeat;
 busy=true;render();
 try { applyGroup(await roomRequest(payload)); }
 catch(error) {
   if(error.data?.room) applyGroup(error.data);
   showToast(connectionError(error),'error');
   // Never retry a mutation automatically: a timed-out request may have committed.
   result=null;
 } finally {busy=false;render();}
}
function cancelRename(){editingName=false;render();document.querySelector('#edit-name')?.focus({preventScroll:true});}
async function renameGroup(event) {
 event.preventDefault();
 if(busy||spinning||loading||!group)return;
 const name=nameDraft.trim();if(!name)return;
 const payload={action:'rename',id:groupId,revision:group.revision,name};
 busy=true;render();
 try {applyGroup(await roomRequest(payload));editingName=false;showToast('Đã cập nhật tên nhóm.','success');}
 catch(error){if(error.data?.room)applyGroup(error.data);showToast(connectionError(error),'error');}
 finally{busy=false;render();if(!editingName)document.querySelector('#edit-name')?.focus({preventScroll:true});}
}
function recordRecentGroup(room){
 try{
  const raw=localStorage.getItem(RECENT_GROUPS_KEY), saved=readRecentGroups(raw);
  recentGroups=recordedVisit?updateRememberedGroup(saved,room):rememberGroup(saved,room);
  const next=JSON.stringify(recentGroups);if(next!==raw)localStorage.setItem(RECENT_GROUPS_KEY,next);
  recordedVisit=true;
 }catch{if(!recentStorageFailed){recentStorageFailed=true;showToast('Không lưu được nhóm gần đây trên thiết bị này. Bạn vẫn có thể dùng link nhóm.','error');}}
}
function forgetGroup(id){
 try{
  recentGroups=readRecentGroups(localStorage.getItem(RECENT_GROUPS_KEY)).filter(room=>room.id!==id);
  localStorage.setItem(RECENT_GROUPS_KEY,JSON.stringify(recentGroups));
  render();
  (document.querySelector('.recent-link')||document.querySelector('#group-name'))?.focus({preventScroll:true});
  showToast('Đã bỏ khỏi nhóm gần đây. Link nhóm vẫn dùng được.');
 }catch{showToast('Không cập nhật được danh sách nhóm gần đây.','error');}
}
async function copyGroup() {
 try {await navigator.clipboard.writeText(location.origin+'/g/'+groupId);showToast('Đã copy link nhóm. Gửi vào chat rồi ghim lại nhé!','success');}
 catch {showToast('Copy link từ thanh địa chỉ để gửi cho nhóm nhé.');}
}
render();
if(groupId) refreshGroup();
// Re-evaluate day/week boundaries when returning to the tab.
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!spinning&&!busy){if(groupId){if(!editingName)refreshGroup();}else{try{recentGroups=readRecentGroups(localStorage.getItem(RECENT_GROUPS_KEY));}catch{}changingMeal=false;result=null;render()}}});
