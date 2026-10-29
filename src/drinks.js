import './style.css';
import morphdom from 'morphdom';
import drinks from './drinks.json';
import {createSpinBag} from './spin-bag.js';
import {escapeHtml} from './groups.js';
import {icon} from './icons.js';
import {leverSvg, reelSequence, runReel, ROW_HEIGHT} from './slot.js';
// Personal-only afternoon drink picker: no group, no history, nothing stored besides the theme.
const app = document.querySelector('#app');
const bag = createSpinBag();
let result = null, spinning = false, rotation = 0, celebrate = false;
function drinkArt(drink) {
 if(drink.logo)return `<img class="drink-art" src="${escapeHtml(drink.logo)}" alt="" width="104" height="104">`;
 return `<span class="drink-art" style="--drink:${drink.color}" aria-hidden="true">${escapeHtml(drink.mark)}</span>`;
}
function render() {
 const size=drinks.length;
 const markup=`<header><div class="header-inner"><a class="brand" href="/" aria-label="Luncher, về trang chủ"><span class="brand-icon">${icon('brand',30)}</span>luncher<span class="brand-dot">.</span></a><div class="header-right"><span class="tiny">BỚT NGHĨ · UỐNG NGON</span><a class="header-link" href="/"><span aria-hidden="true">🍱</span><span>Trưa nay ăn gì?</span></a><a class="icon-button" href="https://github.com/nqnhut92/luncher" target="_blank" rel="noopener noreferrer" aria-label="Mã nguồn Luncher trên GitHub (mở tab mới)" title="Mã nguồn trên GitHub">${icon('github',20)}</a><button id="theme" class="icon-button" aria-label="Đổi giao diện sáng tối">${icon(document.documentElement.dataset.theme==='dark'?'sun':'moon',20)}</button></div></div></header>
 <main class="is-drinks"><section class="intro"><div class="eyebrow"><span></span> TỈNH TÁO CHO BUỔI CHIỀU</div><h1>Chiều nay <br>uống <em>gì nhỉ?</em></h1><p>Quay một vòng là có quán.<br>Không cần tạo nhóm, không lưu lại gì.</p></section>
 <section class="workspace"><div class="spin-panel ${celebrate?'celebrate':''}"><div class="panel-top"><span class="eyebrow">VÒNG QUAY TRÀ CHIỀU</span><span class="count">${size} quán</span></div><div class="machine-stage ${spinning?'is-spinning':''}"><div class="slot-machine ${spinning?'is-spinning':''}"><div class="slot-title"><span aria-hidden="true">✦</span> UỐNG GÌ CŨNG ĐƯỢC <span aria-hidden="true">✦</span></div><div class="slot-count"><i aria-hidden="true"></i>${size} quán đang chờ<i aria-hidden="true"></i></div><div class="slot-window" aria-hidden="true"><div class="wheel" style="transform:translateY(-${rotation*ROW_HEIGHT}px)">${reelSequence(drinks).map(d=>`<div class="reel-row">${drinkArt(d)}<b class="reel-name">${escapeHtml(d.name)}</b></div>`).join('')}</div><div class="slot-selection"></div></div><div class="machine-controls"><div class="spin-actions"><button class="primary" id="spin" ${spinning?'disabled':''}>${spinning?'Đang chọn quán…':`${icon('spark')}${result?'Quay quán khác':'QUAY CHỌN QUÁN'}`}</button><span class="hint">Quay lại sẽ ra quán khác</span></div><p class="slot-caption">${spinning?'Đang lắc ly…':'Kéo cần hoặc bấm quay'}</p></div></div><button id="slot-lever" class="slot-lever" aria-label="Kéo cần chọn quán" ${spinning?'disabled':''}>
${leverSvg}
</button></div>
 <div class="result" aria-live="polite">${result?`<span class="result-emoji" aria-hidden="true">${drinkArt(result)}</span><div class="result-text"><small>CHIỀU NAY GHÉ</small><h2>${escapeHtml(result.name)}</h2><p>Chưa ưng thì quay lại nhé. Kết quả không được lưu.</p></div>`:'<span class="result-emoji" aria-hidden="true">🧋</span><div class="result-text"><h2>Ly nước đang đợi</h2><p>Bấm quay, để buổi chiều đỡ buồn ngủ hơn.</p></div>'}</div></div>
 <aside><section class="side-card"><div class="card-heading"><div class="eyebrow">CÓ GÌ TRONG VÒNG QUAY?</div><span>${size}</span></div><h2>Quán quen buổi chiều.</h2><ul class="drink-list">${drinks.map(d=>`<li class="${result?.id===d.id?'is-picked':''}">${drinkArt(d)}<b>${escapeHtml(d.name)}</b>${result?.id===d.id?`<span class="check"><span class="sr-only">Vừa chọn</span>${icon('check',16)}</span>`:''}</li>`).join('')}</ul></section></aside></section>
 </main><footer><span>luncher. <span class="muted">/ bớt phân vân, thêm ngon miệng.</span></span><span>Một buổi chiều tỉnh táo nhé</span></footer>`;
 morphdom(app, `<div id="app">${markup}</div>`, {childrenOnly:true, onBeforeElUpdated:(from,to)=>!from.isEqualNode(to)});
 document.querySelector('#theme').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('luncher-theme',theme)}catch{}render();};
 document.querySelector('#spin').onclick=spin;
 document.querySelector('#slot-lever').onclick=spin;
}
function spin() {
 if(spinning)return;
 const pickedId=bag.draw(drinks.map(d=>d.id)),index=drinks.findIndex(d=>d.id===pickedId);
 spinning=true;result=null;render();
 rotation=drinks.length*5+index;
 runReel(document.querySelector('.wheel'),rotation,()=>{spinning=false;result=drinks[index];celebrate=true;render();setTimeout(()=>{celebrate=false;render()},900);});
}
render();
