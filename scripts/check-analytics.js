import { preview } from 'vite';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';

// Local production-build integration test. A test-only script fixture exercises
// the real SDK's queued beforeSend callback; no requests reach Vercel Analytics.
const server = await preview({ configFile: false, preview: { host: '127.0.0.1', port: 0 } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
let browser;
const fixture = `(() => {
  const hooks=(window.vaq||[]).filter(([name])=>name==='beforeSend');
  window.fixtureHookCount=hooks.length;
  const filter=hooks.at(-1)?.[1];
  window.fixtureDecisions=[];
  function emit() {
    const event=filter?.({type:'pageview',url:location.href});
    window.fixtureDecisions.push(event);
    if(event)fetch('/_vercel/insights/view',{method:'POST',body:JSON.stringify(event)});
  }
  for(const method of ['pushState','replaceState']){
    const original=history[method];
    history[method]=function(...args){const result=original.apply(this,args);emit();return result;};
  }
  addEventListener('popstate',emit);
  emit();
})();`;
async function setup(context) {
  const records = { scripts: [], views: [] };
  await context.route('**/_vercel/insights/**', async route => {
    if (new URL(route.request().url()).pathname.endsWith('/script.js')) {
      records.scripts.push(route.request().headers());
      return route.fulfill({ contentType: 'application/javascript', body: fixture });
    }
    records.views.push(JSON.parse(route.request().postData()));
    return route.fulfill({ status: 204 });
  });
  await context.route('**/api/rooms*', route => route.fulfill({ json: {
    room: { id: 'Ab3xY9', name: 'Synthetic private group', revision: 0, history: [], events: [], grabUrl: null },
    today: '2026-10-27',
  } }));
  return records;
}
try {
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const records = await setup(context);
  const page = await context.newPage();
  await page.goto(origin, { waitUntil: 'networkidle' });
  assert.equal(records.scripts.length, 1);
  assert.equal(await page.locator('script[src*="/_vercel/insights/script.js"]').count(), 1);
  assert.equal(await page.evaluate(() => window.fixtureHookCount), 1);
  assert.deepEqual(records.views, [{ type: 'pageview', url: origin + '/' }]);
  assert.ok(records.scripts.every(headers => !headers.referer), 'script request must not carry a referrer');
  await page.locator('#group-name').fill('Synthetic private form contents');
  await page.locator('#theme').click();
  await page.locator('[data-category="rice"]').click();
  await page.locator('[data-category="all"]').click();
  assert.equal(records.views.length, 1, 'rerenders must not create duplicate pageviews');
  assert.equal(records.scripts.length, 1);
  assert.equal(await page.evaluate(() => window.fixtureHookCount), 1);
  for (const path of ['/g/Ab3xY9', '/auth/callback?code=synthetic', '/reset/synthetic',
    '/invite/synthetic', '/manage/synthetic', '/?email=synthetic@example.test', '/#manage=synthetic']) {
    await page.evaluate(path => history.pushState(null, '', path), path);
    assert.equal(await page.evaluate(() => window.fixtureDecisions.at(-1)), null, path);
  }
  await page.evaluate(() => history.replaceState(null, '', '/?reset_token=synthetic'));
  assert.equal(await page.evaluate(() => window.fixtureDecisions.at(-1)), null);
  assert.equal(records.views.length, 1);
  await Promise.all([
    page.waitForResponse(response => response.url().endsWith('/_vercel/insights/view')),
    page.evaluate(() => history.pushState(null, '', '/')),
  ]);
  assert.deepEqual(records.views, Array(2).fill({ type: 'pageview', url: origin + '/' }));
  await page.goBack();
  assert.equal(await page.evaluate(() => window.fixtureDecisions.at(-1)), null, 'back navigation to tokenized URL must be blocked');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: true });
    history.pushState(null, '', '/');
  });
  assert.equal(await page.evaluate(() => window.fixtureDecisions.at(-1)), null, 'privacy signal changes must be honored');
  assert.equal(records.views.length, 2);
  await context.close();

  // Private first loads must not even request the analytics loader.
  for (const path of ['/g/Ab3xY9', '/auth/callback?code=synthetic', '/reset/synthetic', '/invite/synthetic',
    '/manage/synthetic', '/?token=synthetic', '/#access_token=synthetic']) {
    const privateContext = await browser.newContext();
    const blocked = await setup(privateContext);
    const privatePage = await privateContext.newPage();
    await privatePage.goto(origin + path, { waitUntil: 'networkidle' });
    assert.equal(blocked.scripts.length, 0, path);
    assert.equal(blocked.views.length, 0, path);
    await privateContext.close();
  }
  for (const property of ['doNotTrack', 'globalPrivacyControl']) {
    const optedOut = await browser.newContext();
    await optedOut.addInitScript(property => Object.defineProperty(navigator, property, {
      configurable: true, value: property === 'doNotTrack' ? '1' : true,
    }), property);
    const blocked = await setup(optedOut);
    await (await optedOut.newPage()).goto(origin, { waitUntil: 'networkidle' });
    assert.equal(blocked.scripts.length, 0, property);
    await optedOut.close();
  }
  const referredContext = await browser.newContext();
  const referred = await setup(referredContext);
  await (await referredContext.newPage()).goto(origin, { referer: origin + '/g/Ab3xY9', waitUntil: 'networkidle' });
  assert.equal(referred.scripts.length, 0, 'sensitive incoming referrers must suppress analytics');
  await referredContext.close();

  const offlineContext = await browser.newContext({ reducedMotion: 'reduce' });
  await offlineContext.route('**/_vercel/insights/**', route => route.abort());
  const offline = await offlineContext.newPage();
  await offline.goto(origin);
  await offline.locator('#spin').click();
  await offline.locator('#confirm').waitFor();
  await offlineContext.close();
  console.log('PASS LOCAL ONLY: production SDK loaded once; minimal public pageviews; rerenders do not duplicate; private URLs/referrers and privacy signals blocked; pushState/replaceState/back rechecked; blocked loader leaves app usable. Script/ingestion fixture is not live collection.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
