import './style.css';
import {showToast} from './toast.js';
import foods from './foods.json';
import {dateKey,weekStart,availableFoods,confirmFood,pickIndex,readState} from './logic.js';
import {roomRequest, escapeHtml} from './groups.js';
const app = document.querySelector('#app');
let groupId = location.pathname.startsWith('/g/') ? location.pathname.split('/')[2] || 'invalid' : null;
let group = null, groupToday = null, loading = Boolean(groupId), busy = false, refreshing = false, editingName = false, nameDraft = '';
let history = [], category = 'all', repeat = false, result = null, spinning = false, rotation = 0;
try { history = readState(localStorage.getItem('luncher-history-v1'),foods.map(f=>f.id)); } catch { showToast('Trình duyệt không cho lưu dữ liệu. Bạn vẫn có thể quay trong phiên này.','error'); }
if (groupId) history = [];
const labels = {all:'Tất cả',rice:'🍚 Cơm',noodle:'🍜 Bún / Mì',light:'🥖 Ăn nhẹ',veg:'🌱 Ăn chay'};
const colors = ['#f5d9ba','#dfe7d0','#f4e6cc','#e9d7c8','#d6e5df','#f0d7cb'];
const displayDate = value => new Date(value+'T12:00:00').toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit'});
function save() { try { localStorage.setItem('luncher-history-v1',JSON.stringify(history)); } catch { showToast('Không lưu được trên trình duyệt. Lịch sử chỉ còn trong phiên này.','error'); } }
function calendarDate() { return groupToday ? new Date(groupToday+'T12:00:00') : new Date(); }
function render() {
 const blocked = spinning || busy || Boolean(groupId && (!group || loading));
 const today=dateKey(calendarDate()), start=weekStart(calendarDate()), pool=availableFoods(foods,history,category,repeat,calendarDate()), used=history.filter(h=>h.date>=start&&h.date<=today), chosen=history.find(h=>h.date===today), todayFood=foods.find(f=>f.id===chosen?.foodId);
 const size=pool.length, step=360/(size||1);
 const gradient=size?pool.map((f,i)=>`${colors[i%colors.length]} ${i*step}deg ${(i+1)*step}deg`).join(','):'#e6e0d7 0deg 360deg';
 app.innerHTML=`<header><a class="brand" href="/"><span class="brand-icon">✳</span> luncher<span class="brand-dot">.</span></a><div class="header-right"><span class="tiny">BỚT NGHĨ · ĂN NGON</span><button id="theme" class="icon-button" aria-label="Đổi giao diện sáng tối">${document.documentElement.dataset.theme==='dark'?'☀':'☾'}</button></div></header>
 <main><section class="intro"><div class="eyebrow"><span></span> CỨ ĐỂ CHIẾC BỤNG DẪN LỐI</div><h1>Trưa nay <br>ăn <em>gì nhỉ?</em></h1><p>Một vòng quay nhỏ. Một quyết định ngon lành.<br>Để Luncher chọn giùm bạn hôm nay.</p></section>
 ${groupId ? `<section class="group-bar"><div><div class="eyebrow">NHÓM ĂN CHUNG · GIỜ VIỆT NAM</div>${group && editingName ? `<form id="rename-group" class="rename-form"><label class="sr-only" for="rename-name">Tên nhóm mới</label><input id="rename-name" name="name" value="${escapeHtml(nameDraft)}" maxlength="60" required ${blocked?'disabled':''}><button class="small-primary" ${blocked?'disabled':''}>${busy?'Đang lưu…':'Lưu tên'}</button><button id="cancel-rename" type="button" class="chip" ${busy?'disabled':''}>Hủy</button></form>` : `<div class="group-title"><h2>${group ? escapeHtml(group.name) : loading ? 'Đang mở nhóm…' : 'Chưa mở được nhóm'}</h2>${group ? `<button id="edit-name" class="edit-name" aria-label="Sửa tên nhóm" title="Sửa tên nhóm" ${blocked?'disabled':''}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z"/><path d="m15 5 4 4"/></svg></button>` : ''}</div>`}<p>Ai có link cũng có thể chốt và bỏ chốt. Giữ link cho những người cùng ăn nhé.</p></div><div class="group-buttons"><button id="copy-group" class="chip" ${spinning || busy ? 'disabled' : ''}>Copy link nhóm</button><button id="refresh-group" class="chip" ${spinning || busy || loading ? 'disabled' : ''}>Tải lại kết quả</button><a class="text-button" href="/">Quay cá nhân</a></div></section>` : `<section class="group-bar"><div><div class="eyebrow">ĂN CHUNG, CHỐT CHUNG</div><h2>Trưa nay cả nhóm ăn gì?</h2><p>Tạo một link cố định. Cùng xem món đã chốt, cùng tránh lặp trong tuần.</p></div><form id="create-group"><label class="sr-only" for="group-name">Tên nhóm ăn trưa</label><input id="group-name" name="name" placeholder="Tên nhóm, ví dụ: Hội đói tầng 3" maxlength="60" required ${busy ? 'disabled' : ''}><button class="small-primary" ${busy ? 'disabled' : ''}>${busy ? 'Đang tạo…' : 'Tạo nhóm ↗'}</button></form></section>`}
 <section class="workspace"><div class="spin-panel"><div class="panel-top"><span class="eyebrow">VÒNG QUAY CHIẾC BỤNG</span><span class="count">${size} món đang chờ</span></div><div class="wheel-area"><div class="pointer"></div><div class="wheel" style="background:conic-gradient(${gradient});transform:rotate(${rotation}deg)">${pool.map((f,i)=>`<div class="wheel-label" style="--angle:${(i+.5)*step}deg"><span>${f.emoji}</span><b>${f.name}</b></div>`).join('')}</div><div class="hub">🍽️</div>${!size?'<div class="empty-wheel">Hết món phù hợp rồi!</div>':''}</div>
 <div class="spin-actions"><button class="primary" id="spin" ${blocked||!size?'disabled':''}>${spinning?'Đang chọn món ngon…':'✳  '+(result?'Quay món khác':'Quay đi, đói rồi!')}</button><span class="hint">${repeat?'Đang cho phép lặp món trong tuần':'Không lặp món đã chốt trong tuần'}</span></div>
 <div class="result" aria-live="polite">${result?`<span class="result-emoji">${result.emoji}</span><div><small>CHIẾC BỤNG ĐÃ CHỌN</small><h2>${result.name}</h2><p>${groupId && todayFood?'Nhóm đang chốt: '+todayFood.name:'Nghe cũng ngon đó chứ?'}</p></div><button id="confirm" class="small-primary" ${blocked?'disabled':''}>${busy?'Đang lưu…':groupId?(todayFood?'Đổi món đã chốt ↗':'Chốt cho nhóm ↗'):'Chốt món này ↗'}</button>`:todayFood?`<span class="result-emoji">${todayFood.emoji}</span><div><small>HÔM NAY ĐÃ CHỐT</small><h2>${todayFood.name}</h2><p>Chúc bạn một bữa trưa ngon!</p></div><button id="undo" class="text-button" ${blocked?'disabled':''}>${busy?'Đang lưu…':'Bỏ chốt'}</button>`:'<span class="result-emoji">💭</span><div><h2>Món ngon đang đợi</h2><p>Bấm quay, để chuyện ăn trưa nhẹ đầu hơn.</p></div>'}</div></div>
 <aside><section class="side-card"><div class="eyebrow">KHẨU VỊ HÔM NAY</div><h2>Bạn đang thèm gì?</h2><div class="chips">${Object.entries(labels).map(([id,name])=>`<button data-category="${id}" class="chip ${category===id?'active':''}" ${blocked?'disabled':''}>${name}</button>`).join('')}</div><label class="repeat"><input type="checkbox" id="repeat" ${repeat?'checked':''} ${blocked?'disabled':''}> Cho phép lặp món trong tuần</label></section>
 <section class="side-card weekly"><div class="card-heading"><div class="eyebrow">THỰC ĐƠN TUẦN NÀY</div><span>${used.length}/7</span></div><h2>Mỗi ngày một món.</h2><p class="muted">Tuần bắt đầu từ thứ Hai. Món đã chốt sẽ nhường lượt cho món khác.</p><div class="week-list">${used.length?used.slice().reverse().map(h=>{const f=foods.find(f=>f.id===h.foodId);return `<div class="week-row"><span>${f.emoji}</span><div><b>${f.name}</b><small>${displayDate(h.date)}</small></div><span class="check">✓</span></div>`}).join(''):'<div class="empty-history">🥢<p>Chưa có kèo ăn nào.<br>Quay một món để bắt đầu nhé!</p></div>'}</div></section><div class="local-note">${groupId?'↳ Lịch sử chung của nhóm trên Neon.<br>Quay thử riêng, chốt món chung.':'↳ Lưu trên trình duyệt của bạn.<br>Không tài khoản, không nghĩ nhiều.'}</div></aside></section>
 <section class="menu-section"><div class="menu-heading"><div><div class="eyebrow">CÓ GÌ TRONG VÒNG QUAY?</div><h2>Một chút cảm hứng cho bữa trưa</h2></div><span class="count">${foods.length} món quen, dễ chọn</span></div><div class="food-grid">${foods.map(f=>{const h=used.find(h=>h.foodId===f.id);return `<div class="food-card ${h?'eaten':''}"><span>${f.emoji}</span><div><b>${f.name}</b><small>${h?'Đã chọn · '+displayDate(h.date):labels[f.type].split(' ').slice(1).join(' ')}</small></div>${h?'<span class="check">✓</span>':''}</div>`}).join('')}</div></section>
 </main><footer><span>luncher. <span class="muted">/ bớt phân vân, thêm ngon miệng.</span></span><span>Một bữa trưa vui vẻ nhé ☺</span></footer>`;
 document.querySelector('#theme').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('luncher-theme',theme)}catch{}document.querySelector('#theme').textContent=theme==='dark'?'☀':'☾';};
 document.querySelector('#spin').onclick=spin;
 document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;result=null;rotation=0;render()});
 document.querySelector('#repeat').onchange=e=>{repeat=e.target.checked;result=null;rotation=0;render()};
 document.querySelector('#confirm')?.addEventListener('click',()=>{if(groupId){mutateGroup(chosen?'replace':'confirm');return;}history=confirmFood(history,result.id);save();result=null;rotation=0;render()});
 document.querySelector('#undo')?.addEventListener('click',()=>{if(groupId){mutateGroup('undo');return;}history=history.filter(h=>h.date!==dateKey());save();render()});
 document.querySelector('#create-group')?.addEventListener('submit',createGroup);
 document.querySelector('#copy-group')?.addEventListener('click',copyGroup);
 document.querySelector('#refresh-group')?.addEventListener('click',refreshGroup);
 document.querySelector('#edit-name')?.addEventListener('click',()=>{editingName=true;nameDraft=group.name;render();document.querySelector('#rename-name').focus();document.querySelector('#rename-name').select()});
 document.querySelector('#rename-name')?.addEventListener('input',e=>{nameDraft=e.target.value});
 document.querySelector('#rename-group')?.addEventListener('submit',renameGroup);
 document.querySelector('#cancel-rename')?.addEventListener('click',cancelRename);
 document.querySelector('#rename-name')?.addEventListener('keydown',e=>{if(e.key==='Escape'&&!busy){e.preventDefault();cancelRename()}});
}
function spin() {
 if(spinning||busy||(groupId&&(!group||loading)))return;
 const pool=availableFoods(foods,history,category,repeat,calendarDate());if(!pool.length)return;
 const index=pickIndex(pool.length);spinning=true;result=null;render();
 const target=(360-((index+.5)*360/pool.length))%360;
 rotation+=360*5+((target-rotation%360+360)%360);
 requestAnimationFrame(()=>requestAnimationFrame(()=>{document.querySelector('.wheel').style.transform=`rotate(${rotation}deg)`}));
 setTimeout(()=>{spinning=false;result=pool[index];render()},matchMedia('(prefers-reduced-motion: reduce)').matches?50:4250);
}
function applyGroup(data) {
 group=data.room; groupToday=data.today;
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
 if(action!=='undo'){payload.foodId=result.id;payload.repeat=repeat;}
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
async function copyGroup() {
 try {await navigator.clipboard.writeText(location.origin+'/g/'+groupId);showToast('Đã copy link nhóm. Gửi vào chat rồi ghim lại nhé!','success');}
 catch {showToast('Copy link từ thanh địa chỉ để gửi cho nhóm nhé.');}
}
render();
if(groupId) refreshGroup();
// Re-evaluate day/week boundaries when returning to the tab.
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!spinning&&!busy){if(groupId){if(!editingName)refreshGroup();}else{result=null;render()}}});
