import { chromium } from 'playwright';
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { startDevServer } from './dev.js';
import { roomStore } from '../server/rooms.js';
import { createHandler } from '../server/handler.js';
import { createQrHandler } from '../server/preview.js';
import { roomToday } from '../server/calendar.js';

// Real app + real SQL queries against isolated embedded Postgres. No Neon secrets.
const db = new PGlite();
await db.exec(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
const store = roomStore(async (sql, params) => (await db.query(sql, params)).rows);
let testClockNow = new Date();
const app = await startDevServer(createHandler(() => store, () => testClockNow), 0, () => store, createQrHandler(() => store));
const origin = `http://127.0.0.1:${app.server.address().port}`;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
let browser;
try {
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  const a = await browser.newContext({ reducedMotion: 'reduce' });
  const b = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  const first = await a.newPage(), second = await b.newPage();
  const errors = [];
  for (const page of [first, second]) page.on('pageerror', error => errors.push(error.message));
  await first.goto(origin);
  assert.equal(await first.locator('script[src*="/_vercel/insights/"]').count(),0,'development server must not initialize analytics');
  // Personal confirmation remains independent of shared-room data.
  await first.locator('#slot-lever').click(); await first.locator('#confirm').waitFor();
  const centeredFood=await first.locator('.reel-row').evaluateAll(rows=>{
    const window=document.querySelector('.slot-window').getBoundingClientRect();
    return rows.find(row=>{const rect=row.getBoundingClientRect();return Math.abs((rect.top+rect.bottom-window.top-window.bottom)/2)<1;})?.innerText;
  });
  assert.equal(centeredFood?.replace(/\s+/g,' ').trim(),await first.locator('.result h2').innerText(),'the centered reel dish matches the chosen result');
  await first.locator('.menu-section summary').click();
  assert.equal(await first.locator('.food-card').count(),8);
  assert.equal(await first.locator('.food-card .food-art').count(),8);
  await first.locator('.menu-section summary').click();
  await first.locator('#confirm').click();
  assert.equal(await first.locator('.week-row.is-chosen').count(), 1);
  assert.equal(await first.locator('#spin').isDisabled(),true);
  assert.equal(await first.locator('#undo').count(),0);
  const personalChoice=await first.locator('.result h2').innerText();
  await first.locator('#change-meal').click();
  await first.locator('#spin').click();await first.locator('#confirm').waitFor();
  await first.locator('#cancel-change').click();
  assert.equal(await first.locator('.result h2').innerText(),personalChoice);
  assert.equal(await first.locator('#spin').isDisabled(),true);
  assert.equal(await first.locator('.activity-row').count(),1);
  await first.locator('#group-name').fill('Hội đói <b>tầng 3</b>');
  await first.locator('#create-group button').click();
  await first.waitForURL('**/g/**');
  await first.waitForFunction(() => !document.querySelector('#spin').disabled);
  const roomUrl = first.url();
  const code = new URL(roomUrl).pathname.split('/')[2];
  assert.match(code, /^[A-Za-z0-9]{6}$/);

  assert.ok(await first.locator('.group-bar h2').innerText() === 'Hội đói <b>tầng 3</b>');
  assert.equal(await first.locator('.group-bar h2 b').count(), 0, 'room name is escaped');
  assert.equal(await first.locator('.week-row.is-chosen').count(), 0, 'personal history not copied into group');
  await second.goto(roomUrl);
  await second.waitForFunction(() => !document.querySelector('#spin').disabled);
  // Member B keeps a stale revision and a rolled suggestion while A confirms.
  await second.locator('#spin').click(); await second.locator('#confirm').waitFor();
  await first.locator('#spin').click(); await first.locator('#confirm').click();
  await first.locator('#change-meal').waitFor();
  const picked = await first.locator('.result h2').innerText();
  // Confirmed day: the dish card leads, the menu stays collapsed, and the reel keeps a fixed window.
  assert.equal(await first.locator('.spin-panel.is-locked').count(), 1);
  assert.equal(await first.locator('.menu-section').evaluate(el => el.open), false);
  assert.equal(await first.locator('.slot-window').evaluate(el=>el.clientHeight),336);
  assert.equal(await first.locator('#slot-lever').isDisabled(),true);
  await second.locator('#confirm').click();
  await second.locator('.toast').waitFor();
  assert.equal(await second.locator('.result h2').innerText(), picked, 'conflict shows winner');
  assert.equal(await second.locator('.week-row.is-chosen').count(), 1);
  assert.ok(!(await second.locator('.reel-row b').allTextContents()).includes(picked));
  // Confirmed choices stay locked; cancelling a replacement never deletes them.
  assert.equal(await second.locator('#spin').isDisabled(),true);
  assert.equal(await second.locator('#undo').count(),0);
  await second.locator('#change-meal').click();
  await second.locator('#spin').click();await second.locator('#confirm').waitFor();
  assert.equal((await store.get(code)).history[0].foodId,(await store.get(code)).events[0].foodId);
  assert.equal((await store.get(code)).events.length,1);
  await second.locator('#cancel-change').click();
  assert.equal(await second.locator('.result h2').innerText(),picked);
  assert.equal(await second.locator('#spin').isDisabled(),true);
  await second.locator('#change-meal').click();
  await second.locator('#spin').click();
  assert.match(await second.locator('#confirm').innerText(), /Đổi món/);
  await second.locator('#confirm').click(); await second.locator('#change-meal').waitFor();
  const replacement = await second.locator('.result h2').innerText();
  assert.notEqual(replacement,picked);
  assert.equal(await second.locator('#spin').isDisabled(),true);
  await second.locator('.activity-log summary').click();
  assert.equal(await second.locator('.activity-row').count(),2);
  const activityText=await second.locator('.activity-list').innerText();
  assert.ok(activityText.includes(picked)&&activityText.includes(replacement));
  await first.locator('#refresh-group').click();
  await first.waitForFunction(name => document.querySelector('.result h2')?.textContent === name, replacement);
  await second.reload(); await second.locator('#change-meal').waitFor();
  assert.equal(await second.locator('.result h2').innerText(), replacement);
  assert.equal(await second.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const smallTargets = await second.evaluate(() => [...document.querySelectorAll('#app button, #app a.button, #app summary')]
    .filter(el => el.getClientRects().length).filter(el => el.getBoundingClientRect().height < 44).map(el => el.id || el.className || el.textContent));
  assert.deepEqual(smallTargets, [], 'mobile touch targets must be at least 44px tall');
  await second.locator('#theme').click();
  const theme = await second.locator('html').getAttribute('data-theme');
  await second.reload(); await second.locator('#change-meal').waitFor();
  assert.equal(await second.locator('html').getAttribute('data-theme'), theme);
  await second.locator('#edit-name').click();
  await second.locator('#rename-name').fill('Hội ăn trưa mới');
  await second.locator('#cancel-rename').click();
  assert.equal(await second.locator('.group-bar h2').innerText(), 'Hội đói <b>tầng 3</b>');
  await second.locator('#edit-name').click();
  await second.locator('#rename-name').fill('Hội ăn trưa mới');
  await second.locator('#rename-group .small-primary').click();
  await second.waitForFunction(() => document.querySelector('.group-bar h2')?.textContent === 'Hội ăn trưa mới');
  await first.locator('#refresh-group').click();
  await first.waitForFunction(() => document.querySelector('.group-bar h2')?.textContent === 'Hội ăn trưa mới');
  // Grab link: invalid input is rejected, a saved link shows a QR and reaches link previews.
  await second.locator('#edit-grab').click();
  await second.locator('#grab-url').fill('https://evil.example/x');
  await second.locator('#grab-form .small-primary').click();
  await second.locator('.toast').waitFor();
  assert.equal((await store.get(code)).grabUrl, null);
  await second.locator('#grab-url').fill('https://r.grab.com/g/2-1-6-TEST');
  await second.locator('#grab-form .small-primary').click();
  await second.locator('.grab-qr').waitFor();
  assert.equal(await second.locator('.grab-qr').evaluate(img => img.complete && img.naturalWidth === 1200), true);
  const preview = await (await fetch(roomUrl)).text();
  assert.match(preview, /<meta property="og:image" content="http:\/\/127\.0\.0\.1:\d+\/api\/qr\?id=/);
  assert.match(preview, /<title>Hội ăn trưa mới · Luncher<\/title>/);
  assert.equal(second.url(), roomUrl);
  assert.equal(await second.locator('.result h2').innerText(), replacement);
  const headings = await second.locator('.side-card .eyebrow').allTextContents();
  assert.ok(headings.every(text => !/^0[12] \//.test(text)));
  // A new toast replaces the old one and gets a fresh three-second timer.
  await first.evaluate(() => { navigator.clipboard.writeText = async () => {}; });
  await first.clock.install();
  await first.clock.pauseAt(new Date(Date.now() + 1000));
  const beforeToast = await first.locator('.workspace').boundingBox();
  await first.locator('#copy-group').click();
  assert.match(await first.locator('.toast-message').innerText(), /Đã copy link nhóm/);
  assert.equal((await first.locator('.workspace').boundingBox()).y, beforeToast.y);
  await first.clock.fastForward(2000);
  assert.equal(await first.locator('.toast').isVisible(), true);
  await first.locator('#copy-group').click();
  await first.clock.fastForward(1200);
  assert.equal(await first.locator('.toast').isVisible(), true, 'previous timer cannot close a new toast');
  await first.locator('#edit-name').click();
  await first.locator('#rename-name').fill('Draft stays focused');
  await first.clock.fastForward(1800);
  assert.equal(await first.locator('.toast').isVisible(), false);
  assert.equal(await first.locator('#rename-name').inputValue(), 'Draft stays focused');
  assert.equal(await first.locator('#rename-name').evaluate(el => el === document.activeElement), true);
  await first.locator('#cancel-rename').click();
  await first.locator('#copy-group').click();
  await first.locator('.toast-close').click();
  assert.equal(await first.locator('.toast').isVisible(), false);
  await first.clock.resume();
  await second.screenshot({ path: '/tmp/luncher-group-mobile.png', fullPage: true });
  await first.screenshot({ path: '/tmp/luncher-group-desktop.png', fullPage: true });
  assert.equal((await store.get(code)).events.length,2);
  // Regression for the sidebar stretching/shrinking both columns on journal toggle.
  const savedClockNow=testClockNow;
  testClockNow=new Date('2026-11-01T05:00:00Z'); // Sunday: exercise a full seven-day week.
  const layoutCode=await store.create('Layout regression');
  const weekFoods=['com-tam','pho','banh-mi','com-ga','bun-bo','com-chay','mi-quang'];
  for(let i=0;i<7;i++){
    const day=new Date('2026-10-26T05:00:00Z');day.setUTCDate(day.getUTCDate()+i);
    await store.choose({id:layoutCode,revision:i,foodId:weekFoods[i],today:roomToday(day),replace:false,repeat:false});
  }
  for(let i=0;i<24;i++)await store.choose({id:layoutCode,revision:7+i,foodId:i%2?'mi-quang':'pho',today:roomToday(testClockNow),replace:true,repeat:true});
  const normalContext=await browser.newContext({reducedMotion:'no-preference'});
  const layoutPage=await normalContext.newPage();
  await layoutPage.goto(origin+'/g/'+layoutCode);await layoutPage.locator('#change-meal').waitFor();
  assert.equal(await layoutPage.locator('.week-row').count(),7);
  assert.equal(await layoutPage.locator('.week-row.is-chosen').count(),7);
  assert.equal(await layoutPage.locator('.workspace .activity-log').count(),0,'journal must live outside both columns');
  const settle=()=>layoutPage.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const geometry=()=>layoutPage.evaluate(()=>({
    scrollY,
    boxes:['.weekly','.spin-panel','.wheel','.activity-log summary'].map(selector=>{
      const {x,y,width,height}=document.querySelector(selector).getBoundingClientRect();return {x,y,width,height};
    }),
  }));
  for(const width of [1440,800,390]){
    await layoutPage.setViewportSize({width,height:900});
    for(const theme of ['light','dark']){
      await layoutPage.evaluate(theme=>{document.documentElement.dataset.theme=theme;document.querySelector('.activity-log').open=false;},theme);
      await settle();await layoutPage.locator('.activity-log summary').scrollIntoViewIfNeeded();await settle();
      assert.equal(await layoutPage.locator('.week-list').evaluate(el=>el.scrollHeight===el.clientHeight),true,'seven meals must fit without growing the weekly card');
      assert.equal(await layoutPage.locator('header').evaluate(el=>el.getBoundingClientRect().top),0,`header stays pinned at ${width}px in ${theme}`);
      assert.notEqual(await layoutPage.locator('header').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
      assert.equal(await layoutPage.locator('header').evaluate(el=>Math.abs(el.getBoundingClientRect().width-document.body.getBoundingClientRect().width)<1),true,'header divider spans the full page width outside the scrollbar gutter');
      assert.equal(await layoutPage.locator('header').evaluate(el=>getComputedStyle(el).borderBottomWidth),'1px');
      assert.match(await layoutPage.locator('header').evaluate(el=>getComputedStyle(el).backdropFilter),/blur\(16px\)/);
      assert.equal(await layoutPage.locator('.header-inner').evaluate(el=>Math.abs(el.getBoundingClientRect().left-document.querySelector('main').getBoundingClientRect().left)<1),true,'header content stays aligned with main');
      assert.equal(await layoutPage.locator('#theme').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'sticky theme switch remains clickable');
      assert.equal(await layoutPage.locator('.slot-lever').evaluate(el=>el.getBoundingClientRect().left>=document.querySelector('.slot-window').getBoundingClientRect().right),true,'lever assembly stays outside the reel window');
      assert.equal(await layoutPage.locator('#spin').evaluate(el=>Boolean(el.closest('.slot-machine'))),true,'spin button belongs to the cabinet base');
      const closed=await geometry();
      await layoutPage.locator('.activity-log summary').click();await settle();
      assert.equal(await layoutPage.locator('.activity-list').evaluate(el=>el.clientHeight<=240&&el.scrollHeight>el.clientHeight),true,'long journal must scroll inside its bounded area');
      assert.deepEqual(await geometry(),closed,`opening history must not resize/move wheel or weekly card (${width}px, ${theme})`);
      await layoutPage.evaluate(()=>{
        window.layoutNodes=['.weekly','.spin-panel','.wheel','.activity-log'].map(s=>document.querySelector(s));
        document.querySelector('.activity-list').scrollTop=60;
      });
      await layoutPage.locator('.activity-log summary').focus();
      await Promise.all([
        layoutPage.waitForResponse(r=>r.url().includes('/api/rooms')&&r.request().method()==='GET'),
        layoutPage.evaluate(()=>document.querySelector('#refresh-group').click()),
      ]);
      await layoutPage.waitForFunction(()=>!document.querySelector('#refresh-group').disabled);
      assert.equal(await layoutPage.evaluate(()=>window.layoutNodes.every((el,i)=>el===document.querySelector(['.weekly','.spin-panel','.wheel','.activity-log'][i]))),true,'refresh must reuse existing DOM nodes');
      assert.equal(await layoutPage.evaluate(()=>document.activeElement===document.querySelector('.activity-log summary')),true);
      assert.equal(await layoutPage.locator('.activity-list').evaluate(el=>el.scrollTop),60);
      assert.deepEqual(await geometry(),closed,'background data refresh must keep layout and scroll position');
      await layoutPage.locator('.activity-log summary').click();await settle();
      assert.deepEqual(await geometry(),closed,`closing history must not move the cards (${width}px, ${theme})`);
    }
  }
  // Exercise a real four-second spin, not just reduced-motion rendering.
  await layoutPage.locator('#change-meal').click();
  await layoutPage.evaluate(()=>{window.originalWheel=document.querySelector('.wheel');});
  await layoutPage.locator('#spin').click();
  await layoutPage.waitForFunction(()=>document.querySelector('.wheel').getAnimations().some(a=>a.playState==='running'));
  await layoutPage.locator('.activity-log summary').click();
  await layoutPage.locator('#confirm').waitFor({timeout:7000});
  assert.equal(await layoutPage.evaluate(()=>window.originalWheel===document.querySelector('.wheel')),true,'spin completion must not recreate the animated wheel');
  await normalContext.close();
  testClockNow=savedClockNow;
  // A new group day unlocks the wheel without losing yesterday's journal.
  testClockNow=new Date(testClockNow.getTime()+86400000);
  await second.reload();await second.waitForFunction(()=>!document.querySelector('#spin').disabled);
  assert.equal(await second.locator('.activity-row').count(),2);
  await first.goto(origin); assert.equal(await first.locator('.week-row.is-chosen').count(), 1);
  // Recent groups are remembered only on this browser after a successful visit.
  const recent=first.locator(`.recent-link[href="/g/${code}"]`);
  assert.equal(await recent.count(),1);
  assert.equal(await recent.locator('b').innerText(),'Hội ăn trưa mới');
  await recent.click();await first.waitForFunction(()=>document.querySelector('.group-title h2')?.textContent==='Hội ăn trưa mới');
  await first.goto(origin);
  await first.locator(`[data-forget-group="${code}"]`).click();
  assert.equal(await first.locator('.recent-card').count(),0);
  assert.equal((await store.get(code)).name,'Hội ăn trưa mới','forgetting must not delete the group');
  await first.goto(roomUrl);await first.waitForFunction(()=>document.querySelector('.group-title h2')?.textContent==='Hội ăn trưa mới');
  await first.goto(origin);assert.equal(await first.locator('.recent-card').count(),1);
  const cleanContext=await browser.newContext({reducedMotion:'reduce'});
  const home=await cleanContext.newPage();const homeApiCalls=[];
  home.on('request',req=>{if(req.url().includes('/api/rooms'))homeApiCalls.push(req.url());});
  await home.goto(origin);
  assert.equal(await home.locator('.recent-card').count(),0,'another browser must not receive a public directory');
  await home.evaluate(()=>localStorage.setItem('luncher-recent-groups-v1',JSON.stringify(Array.from({length:12},(_,i)=>({
    id:'R'+String(i).padStart(5,'0'),name:i===0?'<b>Nhóm ăn trưa</b>':'Nhóm ăn trưa có một cái tên khá dài để kiểm tra '+i,lastVisited:Date.now()-i,
  })))));
  await home.reload();assert.equal(await home.locator('.recent-card').count(),10);
  assert.equal(await home.locator('.recent-name b b').count(),0,'saved names render as text');
  for(const width of[1440,800,390]){
    await home.setViewportSize({width,height:900});
    for(const theme of['light','dark']){
      await home.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);
      assert.equal(await home.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`recent groups overflow at ${width}px`);
      const rows=await home.locator('.recent-card').evaluateAll(cards=>new Set(cards.map(c=>Math.round(c.getBoundingClientRect().top))).size);
      assert.ok(rows<=(width<=650?1:2),'recent groups must stay within the planned number of rows');
      if(width<=1100)assert.equal(await home.locator('.recent-grid').evaluate(el=>el.scrollWidth>el.clientWidth),true,'narrow layouts use a contained horizontal scroller');
      assert.equal(await home.locator('.recent-name b').first().evaluate(el=>getComputedStyle(el).textOverflow),'ellipsis');
      const name=await home.locator('.recent-name b').first().boundingBox(),remove=await home.locator('.recent-remove').first().boundingBox();
      assert.ok(name.x+name.width<=remove.x,'remove button must not cover the group name');
    }
  }
  await home.screenshot({path:'/tmp/luncher-recent-mobile.png',fullPage:true});
  await home.setViewportSize({width:1440,height:1000});
  await home.screenshot({path:'/tmp/luncher-recent-desktop.png',fullPage:true});
  assert.deepEqual(homeApiCalls,[],'homepage must not fetch or publish a database group directory');
  await cleanContext.close();
  // Invalid links must never fall back to editable personal mode.
  await second.goto(origin + '/g/no-such-room'); await second.locator('.toast').waitFor();
  assert.equal(await second.locator('#spin').isDisabled(), true);
  assert.equal(await second.evaluate(()=>JSON.parse(localStorage.getItem('luncher-recent-groups-v1')).some(g=>g.id==='no-such-room')),false);
  assert.equal(await second.locator('#refresh-group').isEnabled(), true);
  await second.locator('#refresh-group').click(); await second.locator('.toast').waitFor();
  // Offline group failure: keep group context, leave personal data untouched.
  await second.route('**/api/rooms*', route => route.abort());
  await second.goto(roomUrl); await second.locator('.toast').waitFor();
  assert.equal(await second.locator('#spin').isDisabled(), true);
  assert.deepEqual(errors, []);
  console.log('PASS: personal mode, short codes, rename/cancel, create/share/deep link, escaped group name, two independent members, conflict, locked choices, cancellable replacement, persistent change journal, next-day unlock, refresh, reload persistence, mobile, theme, stable sidebar/wheel geometry at desktop/tablet/mobile in both themes, DOM/scroll/focus preservation, real spin continuity, toast expiry/replacement/dismissal without layout or focus changes, browser-private recent groups, renamed labels, forget/revisit, bounded 10-group layouts, and failed/offline room handling.');
} finally {
  await browser?.close();
  await app.close();
  await db.close();
}
