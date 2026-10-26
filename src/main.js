import './style.css';
import foods from './foods.json';
import {dateKey,weekStart,availableFoods,confirmFood,pickIndex,readState} from './logic.js';
const app = document.querySelector('#app');
let history = [], category = 'all', repeat = false, result = null, spinning = false, rotation = 0, notice = '';
try { history = readState(localStorage.getItem('luncher-history-v1'),foods.map(f=>f.id)); } catch { notice='Trình duyệt không cho lưu dữ liệu. Bạn vẫn có thể quay trong phiên này.'; }
const labels = {all:'Tất cả',rice:'🍚 Cơm',noodle:'🍜 Bún / Mì',light:'🥖 Ăn nhẹ',veg:'🌱 Ăn chay'};
const colors = ['#f5d9ba','#dfe7d0','#f4e6cc','#e9d7c8','#d6e5df','#f0d7cb'];
const displayDate = value => new Date(value+'T12:00:00').toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit'});
function save() { try { localStorage.setItem('luncher-history-v1',JSON.stringify(history)); } catch { notice='Không lưu được trên trình duyệt. Lịch sử chỉ còn trong phiên này.'; } }
function render() {
 const today=dateKey(), start=weekStart(), pool=availableFoods(foods,history,category,repeat), used=history.filter(h=>h.date>=start&&h.date<=today), chosen=history.find(h=>h.date===today), todayFood=foods.find(f=>f.id===chosen?.foodId);
 const size=pool.length, step=360/(size||1);
 const gradient=size?pool.map((f,i)=>`${colors[i%colors.length]} ${i*step}deg ${(i+1)*step}deg`).join(','):'#e6e0d7 0deg 360deg';
 app.innerHTML=`<header><a class="brand" href="./"><span class="brand-icon">✳</span> luncher<span class="brand-dot">.</span></a><div class="header-right"><span class="tiny">BỚT NGHĨ · ĂN NGON</span><button id="theme" class="icon-button" aria-label="Đổi giao diện sáng tối">${document.documentElement.dataset.theme==='dark'?'☀':'☾'}</button></div></header>
 <main><section class="intro"><div class="eyebrow"><span></span> CỨ ĐỂ CHIẾC BỤNG DẪN LỐI</div><h1>Trưa nay <br>ăn <em>gì nhỉ?</em></h1><p>Một vòng quay nhỏ. Một quyết định ngon lành.<br>Để Luncher chọn giùm bạn hôm nay.</p></section>
 <section class="workspace"><div class="spin-panel"><div class="panel-top"><span class="eyebrow">VÒNG QUAY CHIẾC BỤNG</span><span class="count">${size} món đang chờ</span></div><div class="wheel-area"><div class="pointer"></div><div class="wheel" style="background:conic-gradient(${gradient});transform:rotate(${rotation}deg)">${pool.map((f,i)=>`<div class="wheel-label" style="--angle:${(i+.5)*step}deg"><span>${f.emoji}</span><b>${f.name}</b></div>`).join('')}</div><div class="hub">🍽️</div>${!size?'<div class="empty-wheel">Hết món phù hợp rồi!</div>':''}</div>
 <div class="spin-actions"><button class="primary" id="spin" ${spinning||!size?'disabled':''}>${spinning?'Đang chọn món ngon…':'✳  '+(result?'Quay món khác':'Quay đi, đói rồi!')}</button><span class="hint">${repeat?'Đang cho phép lặp món trong tuần':'Không lặp món đã chốt trong tuần'}</span></div>
 <div class="result" aria-live="polite">${result?`<span class="result-emoji">${result.emoji}</span><div><small>CHIẾC BỤNG ĐÃ CHỌN</small><h2>${result.name}</h2><p>Nghe cũng ngon đó chứ?</p></div><button id="confirm" class="small-primary">Chốt món này ↗</button>`:todayFood?`<span class="result-emoji">${todayFood.emoji}</span><div><small>HÔM NAY ĐÃ CHỐT</small><h2>${todayFood.name}</h2><p>Chúc bạn một bữa trưa ngon!</p></div><button id="undo" class="text-button">Bỏ chốt</button>`:'<span class="result-emoji">💭</span><div><h2>Món ngon đang đợi</h2><p>Bấm quay, để chuyện ăn trưa nhẹ đầu hơn.</p></div>'}</div></div>
 <aside><section class="side-card"><div class="eyebrow">01 / KHẨU VỊ HÔM NAY</div><h2>Bạn đang thèm gì?</h2><div class="chips">${Object.entries(labels).map(([id,name])=>`<button data-category="${id}" class="chip ${category===id?'active':''}" ${spinning?'disabled':''}>${name}</button>`).join('')}</div><label class="repeat"><input type="checkbox" id="repeat" ${repeat?'checked':''} ${spinning?'disabled':''}> Cho phép lặp món trong tuần</label></section>
 <section class="side-card weekly"><div class="card-heading"><div class="eyebrow">02 / THỰC ĐƠN TUẦN NÀY</div><span>${used.length}/7</span></div><h2>Mỗi ngày một món.</h2><p class="muted">Tuần bắt đầu từ thứ Hai. Món đã chốt sẽ nhường lượt cho món khác.</p><div class="week-list">${used.length?used.slice().reverse().map(h=>{const f=foods.find(f=>f.id===h.foodId);return `<div class="week-row"><span>${f.emoji}</span><div><b>${f.name}</b><small>${displayDate(h.date)}</small></div><span class="check">✓</span></div>`}).join(''):'<div class="empty-history">🥢<p>Chưa có kèo ăn nào.<br>Quay một món để bắt đầu nhé!</p></div>'}</div></section><div class="local-note">↳ Lưu trên trình duyệt của bạn.<br>Không tài khoản, không nghĩ nhiều.</div></aside></section>
 <section class="menu-section"><div class="menu-heading"><div><div class="eyebrow">CÓ GÌ TRONG VÒNG QUAY?</div><h2>Một chút cảm hứng cho bữa trưa</h2></div><span class="count">${foods.length} món quen, dễ chọn</span></div><div class="food-grid">${foods.map(f=>{const h=used.find(h=>h.foodId===f.id);return `<div class="food-card ${h?'eaten':''}"><span>${f.emoji}</span><div><b>${f.name}</b><small>${h?'Đã chọn · '+displayDate(h.date):labels[f.type].split(' ').slice(1).join(' ')}</small></div>${h?'<span class="check">✓</span>':''}</div>`}).join('')}</div></section>
 <p role="status" class="notice">${notice}</p></main><footer><span>luncher. <span class="muted">/ bớt phân vân, thêm ngon miệng.</span></span><span>Một bữa trưa vui vẻ nhé ☺</span></footer>`;
 document.querySelector('#theme').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('luncher-theme',theme)}catch{}document.querySelector('#theme').textContent=theme==='dark'?'☀':'☾';};
 document.querySelector('#spin').onclick=spin;
 document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;result=null;rotation=0;render()});
 document.querySelector('#repeat').onchange=e=>{repeat=e.target.checked;result=null;rotation=0;render()};
 document.querySelector('#confirm')?.addEventListener('click',()=>{history=confirmFood(history,result.id);save();result=null;rotation=0;render()});
 document.querySelector('#undo')?.addEventListener('click',()=>{history=history.filter(h=>h.date!==dateKey());save();render()});
}
function spin() {
 if(spinning)return;
 const pool=availableFoods(foods,history,category,repeat);if(!pool.length)return;
 const index=pickIndex(pool.length);spinning=true;result=null;render();
 const target=(360-((index+.5)*360/pool.length))%360;
 rotation+=360*5+((target-rotation%360+360)%360);
 requestAnimationFrame(()=>requestAnimationFrame(()=>{document.querySelector('.wheel').style.transform=`rotate(${rotation}deg)`}));
 setTimeout(()=>{spinning=false;result=pool[index];render()},matchMedia('(prefers-reduced-motion: reduce)').matches?50:4250);
}
render();
// Re-evaluate day/week boundaries when returning to the tab.
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!spinning){result=null;render()}});
