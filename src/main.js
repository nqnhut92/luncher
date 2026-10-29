import './style.css';
import {initializeAnalytics} from './analytics.js';
import morphdom from 'morphdom';
import {showToast} from './toast.js';
import foods from './foods.json';
import {dateKey,weekStart,availableFoods,readState} from './logic.js';
import {readPersonal, confirmPersonal} from './activity.js';
import {RECENT_GROUPS_KEY, readRecentGroups, rememberGroup, updateRememberedGroup} from './recent-groups.js';
import {roomRequest, escapeHtml} from './groups.js';
import {icon} from './icons.js';
import {createSpinBag} from './spin-bag.js';
import {leverSvg, reelSequence, runReel} from './slot.js';
initializeAnalytics();
const app = document.querySelector('#app');
let groupId = location.pathname.startsWith('/g/') ? location.pathname.split('/')[2] || 'invalid' : null;
let group = null, groupToday = null, loading = Boolean(groupId), busy = false, refreshing = false, editingName = false, nameDraft = '';
let changingMeal = false, activityOpen = false, events = [], editingGrab = false, grabDraft = '';
let recentGroups=[], recordedVisit=false, recentStorageFailed=false, menuOpen=false, celebrate=false;
try{recentGroups=readRecentGroups(localStorage.getItem(RECENT_GROUPS_KEY));}catch{}
const bag = createSpinBag();
let history = [], category = 'all', repeat = false, result = null, spinning = false, rotation = 0;
if (!groupId) {
 try {
  const personal=readPersonal(localStorage.getItem('luncher-personal-v2'),localStorage.getItem('luncher-history-v1'),foods.map(f=>f.id));
  history=personal.history; events=personal.events;
  localStorage.setItem('luncher-personal-v2',JSON.stringify(personal));
 } catch {showToast('Không lưu được dữ liệu. Bạn vẫn có thể dùng trong phiên này.','error');}
}
const labels = {all:'Tất cả',rice:'Cơm',noodle:'Bún / Mì',light:'Ăn nhẹ',veg:'Ăn chay'};
const menuFoods = foods.filter(f=>f.active!==false);
function foodArt(food) {
 if(!food)return '';
 return Number.isInteger(food.art) ? `<span class="food-art" style="--art-x:${food.art%4*100/3}%;--art-y:${Math.floor(food.art/4)*100}%" aria-hidden="true"></span>` : `<span aria-hidden="true">${food.emoji}</span>`;
}
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
function grabCard(blocked) {
 const head='<div class="eyebrow">ĐƠN NHÓM GRAB</div>';
 if(editingGrab) return `<section class="side-card grab-card">${head}<form id="grab-form" class="grab-form"><label for="grab-url">Dán link chia sẻ đơn nhóm từ app Grab</label><input id="grab-url" name="grabUrl" type="url" inputmode="url" value="${escapeHtml(grabDraft)}" placeholder="https://app.grab.com/s/…" maxlength="500" ${blocked?'disabled':''}><div class="form-actions"><button class="small-primary" ${blocked?'disabled':''}>${busy?'Đang lưu…':'Lưu link'}</button>${group.grabUrl?`<button id="clear-grab" type="button" class="chip" ${blocked?'disabled':''}>Xóa link</button>`:''}<button id="cancel-grab" type="button" class="chip" ${busy?'disabled':''}>Hủy</button></div></form></section>`;
 if(!group.grabUrl) return `<section class="side-card grab-card">${head}<h2>Gom đơn trên Grab</h2><p class="muted">Dán link đơn nhóm để mọi người quét QR và thêm món. Khi chia sẻ link nhóm, ảnh xem trước cũng là mã QR này.</p><button id="edit-grab" class="button" ${blocked?'disabled':''}>${icon('plus')}Thêm link Grab</button></section>`;
 const art=group.grabImage?`<figure class="grab-art"><img src="${escapeHtml(group.grabImage)}" alt="${escapeHtml(group.grabTitle||'Đơn nhóm Grab')}: thông tin quán từ Grab" width="600" height="450" loading="lazy" referrerpolicy="no-referrer"></figure>`:'';
 return `<section class="side-card grab-card has-link">${head}${art}<div class="grab-body"><img class="grab-qr" src="/api/qr?id=${encodeURIComponent(group.id)}&v=${group.revision}&layout=square" alt="Mã QR đơn nhóm Grab" width="128" height="128"><div class="grab-info"><h2>Quét để thêm món</h2><p class="muted">Ảnh xem trước của link nhóm cũng hiện mã này.</p><a class="button button-primary" href="${escapeHtml(group.grabUrl)}" target="_blank" rel="noopener noreferrer">${icon('external')}Mở đơn Grab</a></div></div><div class="grab-meta"><span class="grab-url" title="${escapeHtml(group.grabUrl)}">${escapeHtml(group.grabUrl)}</span><button id="edit-grab" class="text-button" ${blocked?'disabled':''}>Sửa link</button></div></section>`;
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
 const size=pool.length;
 const reelRows=reelSequence(pool);
 const todayEvent=events.filter(e=>e.date===today).at(-1);
 const chosenAt=todayEvent&&todayEvent.action!=='snapshot'?`Chốt lúc ${eventTime(todayEvent)} · `:'';
 const markup=`<header><div class="header-inner"><a class="brand" href="/" aria-label="Luncher, về trang chủ"><span class="brand-icon">${icon('brand',30)}</span>luncher<span class="brand-dot">.</span></a><div class="header-right"><span class="tiny">BỚT NGHĨ · ĂN NGON</span><a class="header-link" href="/chieunayuonggi"><span aria-hidden="true">🧋</span><span>Chiều nay uống gì?</span></a><a class="icon-button" href="https://github.com/nqnhut92/luncher" target="_blank" rel="noopener noreferrer" aria-label="Mã nguồn Luncher trên GitHub (mở tab mới)" title="Mã nguồn trên GitHub">${icon('github',20)}</a><button id="theme" class="icon-button" aria-label="Đổi giao diện sáng tối">${icon(document.documentElement.dataset.theme==='dark'?'sun':'moon',20)}</button></div></div></header>
 <main class="${groupId?'is-group':'is-home'}">${groupId?'':`<section class="intro"><div class="eyebrow"><span></span> CỨ ĐỂ CHIẾC BỤNG DẪN LỐI</div><h1>Trưa nay <br>ăn <em>gì nhỉ?</em></h1><p>Một vòng quay nhỏ. Một quyết định ngon lành.<br>Để Luncher chọn giùm bạn hôm nay.</p></section>`}
 ${!groupId&&recentGroups.length?`<section class="recent-groups" aria-labelledby="recent-heading"><div class="recent-heading"><h2 id="recent-heading">Nhóm gần đây</h2><p>Những nhóm bạn đã mở trên trình duyệt này.</p></div><div class="recent-grid">${recentGroups.map(room=>`<article class="recent-card" id="recent-${room.id}"><a class="recent-link" href="/g/${room.id}"><span class="recent-icon" aria-hidden="true">🍱</span><span class="recent-name"><b title="${escapeHtml(room.name)}">${escapeHtml(room.name)}</b><small>Mở lại nhóm</small></span></a><button type="button" class="recent-remove" data-forget-group="${room.id}" aria-label="Bỏ ${escapeHtml(room.name)} khỏi danh sách gần đây" title="Bỏ khỏi danh sách gần đây">${icon('close',16)}</button></article>`).join('')}</div></section>`:''}
 ${groupId ? `<section class="group-bar"><div class="group-info"><div class="eyebrow">NHÓM ĂN CHUNG · GIỜ VIỆT NAM</div>${group && editingName ? `<form id="rename-group" class="rename-form"><label class="sr-only" for="rename-name">Tên nhóm mới</label><input id="rename-name" name="name" value="${escapeHtml(nameDraft)}" maxlength="60" required ${blocked?'disabled':''}><button class="small-primary" ${blocked?'disabled':''}>${busy?'Đang lưu…':'Lưu tên'}</button><button id="cancel-rename" type="button" class="chip" ${busy?'disabled':''}>Hủy</button></form>` : `<div class="group-title"><h2>${group ? escapeHtml(group.name) : loading ? 'Đang mở nhóm…' : 'Chưa mở được nhóm'}</h2>${group ? `<button id="edit-name" class="edit-name" aria-label="Sửa tên nhóm" title="Sửa tên nhóm" ${blocked?'disabled':''}>${icon('edit')}</button>` : ''}</div>`}<p>Ai có link đều xem, chốt và đổi món được. Chỉ gửi link cho những người cùng ăn nhé.</p></div><div class="group-buttons"><button id="copy-group" class="button button-primary" ${spinning || busy ? 'disabled' : ''}>${icon('share')}Copy link nhóm</button><button id="refresh-group" class="button" ${spinning || busy || loading ? 'disabled' : ''}>${icon('refresh')}Tải lại kết quả</button><a class="button button-ghost" href="/">${icon('back')}Quay cá nhân</a></div></section>` : `<section class="group-bar"><div class="group-info"><div class="eyebrow">ĂN CHUNG, CHỐT CHUNG</div><h2>Trưa nay cả nhóm ăn gì?</h2><p>Tạo một link cố định. Cùng xem món đã chốt, cùng tránh lặp trong tuần.</p></div><form id="create-group"><label class="sr-only" for="group-name">Tên nhóm ăn trưa</label><input id="group-name" name="name" placeholder="Tên nhóm, ví dụ: Hội đói tầng 3" maxlength="60" required ${busy ? 'disabled' : ''}><button class="small-primary" ${busy ? 'disabled' : ''}>${busy ? 'Đang tạo…' : 'Tạo nhóm'}</button></form></section>`}
 <section class="workspace"><div class="spin-panel ${locked?'is-locked':''} ${celebrate?'celebrate':''}"><div class="panel-top"><span class="eyebrow">VÒNG QUAY CHIẾC BỤNG</span><span class="count">${locked?'Đã chốt hôm nay':size+' món đang chờ'}</span></div><div class="machine-stage ${spinning?'is-spinning':''}"><div class="slot-machine ${spinning?'is-spinning':''}"><div class="slot-title"><span aria-hidden="true">✦</span> ĂN GÌ CŨNG ĐƯỢC <span aria-hidden="true">✦</span></div><div class="slot-count"><i aria-hidden="true"></i>${size} món đang chờ<i aria-hidden="true"></i></div><div class="slot-window" aria-hidden="true"><div class="wheel" style="transform:translateY(-${rotation*112}px)">${reelRows.map(f=>`<div class="reel-row">${foodArt(f)}<b class="reel-name">${f.id==='bun-thit'?'<span class="reel-name-line">Bún chả /</span> <span class="reel-name-line">Bún thịt nướng</span>':f.name}</b></div>`).join('')}</div><div class="slot-selection"></div>${!size?'<div class="slot-empty">Hết món phù hợp rồi!<br>Thử bộ lọc khác hoặc cho phép lặp món.</div>':''}</div><div class="machine-controls"><div class="spin-actions"><button class="primary ${locked?'is-locked':''}" id="spin" ${controlsBlocked||!size?'disabled':''}>${locked?`${icon('check')}Hôm nay đã chốt`:spinning?'Đang chọn món ngon…':`${icon('spark')}${result?'Quay món khác':'QUAY CHỌN MÓN'}`}</button><span class="hint">${repeat?'Đang cho phép lặp món trong tuần':'Không lặp món đã chốt trong tuần'}</span></div><p class="slot-caption">${spinning?'Chiếc bụng đang chọn…':'Kéo cần hoặc bấm quay'}</p></div></div><button id="slot-lever" class="slot-lever" aria-label="Kéo cần chọn món" ${controlsBlocked||!size?'disabled':''}>
${leverSvg}
</button></div>

 ${changingMeal?`<div class="change-banner"><span>Món hiện tại vẫn giữ cho tới khi bạn chốt món mới.</span><button id="cancel-change" class="text-button" ${blocked?'disabled':''}>Hủy đổi món</button></div>`:''}
 <div class="result" aria-live="polite">${result?`<span class="result-emoji" aria-hidden="true">${foodArt(result)}</span><div class="result-text"><small>CHIẾC BỤNG ĐÃ CHỌN</small><h2>${result.name}</h2><p>${groupId && todayFood?'Nhóm đang chốt: '+todayFood.name:'Nghe cũng ngon đó chứ?'}</p></div><button id="confirm" class="small-primary" ${blocked?'disabled':''}>${busy?'Đang lưu…':groupId?(todayFood?'Đổi món đã chốt':'Chốt cho nhóm'):'Chốt món này'}</button>`:todayFood?`<span class="result-emoji" aria-hidden="true">${foodArt(todayFood)}</span><div class="result-text"><small>${groupId?'HÔM NAY CẢ NHÓM ĂN':'HÔM NAY ĂN'}</small><h2>${todayFood.name}</h2><p>${chosenAt}Chúc ${groupId?'cả nhóm':'bạn'} một bữa trưa ngon!</p></div>${!changingMeal?`<button id="change-meal" class="button" ${blocked?'disabled':''}>Đổi món hôm nay</button>`:''}`:'<span class="result-emoji" aria-hidden="true">💭</span><div class="result-text"><h2>Món ngon đang đợi</h2><p>Bấm quay, để chuyện ăn trưa nhẹ đầu hơn.</p></div>'}</div></div>
 <aside>${groupId&&group?grabCard(blocked):''}<section class="side-card"><div class="eyebrow">KHẨU VỊ HÔM NAY</div><h2>Bạn đang thèm gì?</h2><div class="chips">${Object.entries(labels).filter(([id])=>id==='all'||menuFoods.some(f=>f.type===id)).map(([id,name])=>`<button data-category="${id}" class="chip ${category===id?'active':''}" aria-pressed="${category===id}" ${controlsBlocked?'disabled':''}>${name}</button>`).join('')}</div><label class="repeat"><input type="checkbox" id="repeat" ${repeat?'checked':''} ${controlsBlocked?'disabled':''}> Cho phép lặp món trong tuần</label></section>
 <section class="side-card weekly"><div class="card-heading"><div class="eyebrow">THỰC ĐƠN TUẦN NÀY</div><span>${used.length}/7</span></div><h2>Mỗi ngày một món.</h2><div class="week-list">${weekDays.map(day=>`<div class="week-row ${day.choice?'is-chosen':''} ${day.key===today?'is-today':''}"><span class="week-day">${day.day}<small>${day.date}</small></span><span class="week-emoji" aria-hidden="true">${foodArt(day.food)}</span><b title="${day.food?.name||'Chưa chốt'}">${day.food?.name||(day.key===today?'Hôm nay chưa chốt':'<span aria-hidden="true">—</span><span class="sr-only">Chưa chốt</span>')}</b>${day.choice?`<span class="check"><span class="sr-only">Đã chốt</span>${icon('check',16)}</span>`:''}</div>`).join('')}</div></section></aside></section>
 <section class="history-section"><details class="activity-log side-card" ${activityOpen?'open':''}><summary>Lịch sử thay đổi <span>${events.length}</span></summary><div class="activity-list">${events.length?events.slice().reverse().map(event=>`<div class="activity-row"><small>${escapeHtml(displayDate(event.date))} · ${escapeHtml(eventTime(event))}</small><p>${escapeHtml(eventLabel(event))}</p>${event.action==='snapshot'?'<small>Món có sẵn trước khi bật nhật ký; không rõ giờ chốt ban đầu.</small>':''}</div>`).join(''):'<p class="muted">Chưa có lần chốt món nào.</p>'}</div></details></section>
 <details class="menu-section side-card" ${menuOpen?'open':''}><summary><h2><span class="eyebrow">CÓ GÌ TRONG VÒNG QUAY?</span>Thực đơn · ${menuFoods.length} món</h2><span class="count">${menuOpen?'Thu gọn':'Xem tất cả'}</span></summary><div class="food-grid">${menuFoods.map(f=>{const h=used.find(h=>h.foodId===f.id);return `<div class="food-card ${h?'eaten':''}"><span aria-hidden="true">${foodArt(f)}</span><div><b>${f.name}</b><small>${h?'Đã chọn · '+displayDate(h.date):labels[f.type]}</small></div>${h?`<span class="check"><span class="sr-only">Đã chốt</span>${icon('check',16)}</span>`:''}</div>`}).join('')}</div></details>
 </main><footer><span>luncher. <span class="muted">/ bớt phân vân, thêm ngon miệng.</span></span><span>Một bữa trưa vui vẻ nhé</span></footer>`;
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
 document.querySelector('#theme').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('luncher-theme',theme)}catch{}document.querySelector('#theme').innerHTML=icon(theme==='dark'?'sun':'moon',20);};
 document.querySelectorAll('[data-forget-group]').forEach(button=>button.onclick=()=>forgetGroup(button.dataset.forgetGroup));
 document.querySelector('#spin').onclick=spin;
 document.querySelector('#slot-lever').onclick=spin;
 document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;result=null;rotation=0;render()});
 document.querySelector('#repeat').onchange=e=>{repeat=e.target.checked;result=null;rotation=0;render()};
 const confirmButton=document.querySelector('#confirm');
 if(confirmButton)confirmButton.onclick=()=>{
  if(groupId){mutateGroup(chosen?'replace':'confirm');return;}
  const next=confirmPersonal({history,events},result.id);history=next.history;events=next.events;
  save();changingMeal=false;result=null;rotation=0;celebrateChoice();
 };
 const changeButton=document.querySelector('#change-meal');
 if(changeButton)changeButton.onclick=()=>{changingMeal=true;result=null;rotation=0;render();document.querySelector('#spin').focus({preventScroll:true});};
 const cancelChangeButton=document.querySelector('#cancel-change');
 if(cancelChangeButton)cancelChangeButton.onclick=()=>{changingMeal=false;result=null;rotation=0;render();document.querySelector('#change-meal')?.focus({preventScroll:true});};
 document.querySelector('.activity-log').ontoggle=e=>{activityOpen=e.target.open};
 document.querySelector('.menu-section').ontoggle=e=>{if(menuOpen!==e.target.open){menuOpen=e.target.open;render();}};
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
 const editGrabButton=document.querySelector('#edit-grab');
 if(editGrabButton)editGrabButton.onclick=()=>{editingGrab=true;grabDraft=group.grabUrl||'';render();document.querySelector('#grab-url').focus();};
 const grabInput=document.querySelector('#grab-url');
 if(grabInput){grabInput.oninput=e=>{grabDraft=e.target.value};grabInput.onkeydown=e=>{if(e.key==='Escape'&&!busy){e.preventDefault();cancelGrab();}};}
 const grabForm=document.querySelector('#grab-form');
 if(grabForm)grabForm.onsubmit=e=>{e.preventDefault();saveGrab(grabDraft);};
 const clearGrabButton=document.querySelector('#clear-grab');
 if(clearGrabButton)clearGrabButton.onclick=()=>saveGrab('');
 const cancelGrabButton=document.querySelector('#cancel-grab');
 if(cancelGrabButton)cancelGrabButton.onclick=cancelGrab;
}
function spin() {
 if(spinning||busy||(currentChoice()&&!changingMeal)||(groupId&&(!group||loading)))return;
 const pool=availableFoods(foods,history,category,repeat,calendarDate()).filter(f=>!changingMeal||f.id!==currentChoice()?.foodId);if(!pool.length)return;
 const pickedId=bag.draw(pool.map(f=>f.id)),index=pool.findIndex(f=>f.id===pickedId);spinning=true;result=null;rotation=0;render();
 rotation=pool.length*5+index;
 runReel(document.querySelector('.wheel'),rotation,()=>{spinning=false;result=pool[index];render()});
}
// A short pop on the confirmed dish; CSS drops the animation for reduced motion.
function celebrateChoice(){celebrate=true;render();setTimeout(()=>{celebrate=false;render()},900);}
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
 try { applyGroup(await roomRequest(payload)); celebrateChoice(); }
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
function cancelGrab(){editingGrab=false;render();document.querySelector('#edit-grab')?.focus({preventScroll:true});}
async function saveGrab(value) {
  if(busy||spinning||loading||!group)return;
  const payload={action:'grab',id:groupId,revision:group.revision,grabUrl:value.trim()};
  busy=true;render();
  try {applyGroup(await roomRequest(payload));editingGrab=false;showToast(!group.grabUrl?'Đã xóa link Grab.':group.grabImage?'Đã lưu link Grab và lấy được thông tin quán cho ảnh xem trước.':'Đã lưu link Grab. Chưa đọc được thông tin quán, ảnh xem trước chỉ có mã QR.','success');}
  catch(error){if(error.data?.room)applyGroup(error.data);showToast(connectionError(error),'error');}
  finally{busy=false;render();if(!editingGrab)document.querySelector('#edit-grab')?.focus({preventScroll:true});}
}
async function copyGroup() {
 try {await navigator.clipboard.writeText(location.origin+'/g/'+groupId);showToast('Đã copy link nhóm. Gửi vào chat rồi ghim lại nhé!','success');}
 catch {showToast('Copy link từ thanh địa chỉ để gửi cho nhóm nhé.');}
}
render();
if(groupId) refreshGroup();
// Re-evaluate day/week boundaries when returning to the tab.
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!spinning&&!busy){if(groupId){if(!editingName&&!editingGrab)refreshGroup();}else{try{recentGroups=readRecentGroups(localStorage.getItem(RECENT_GROUPS_KEY));}catch{}changingMeal=false;result=null;render()}}});
