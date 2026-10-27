import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canTrackPage, filterAnalyticsEvent } from '../src/analytics-privacy.js';
const root = 'https://luncher.example/';
const context = { href: root, referrer: '', doNotTrack: false, globalPrivacyControl: false };
const view = { type: 'pageview', url: root };

test('analytics only forwards the canonical public homepage and minimal pageview fields', () => {
  assert.deepEqual(filterAnalyticsEvent({ ...view, name: 'Private group', data: { form: 'private' } }, context), view);
  assert.equal(filterAnalyticsEvent({ type: 'event', url: root, name: 'click' }, context), null);
  assert.equal(filterAnalyticsEvent(null, context), null);
  assert.equal(filterAnalyticsEvent({ ...view, url: 'https://other.example/' }, context), null);
});
test('private, unknown, tokenized, encoded and malformed URLs are never eligible', () => {
  for (const path of ['/g/Ab3xY9', '/g/Ab3xY9?secret=value', '/auth/callback?code=private',
    '/reset/token', '/invite/private', '/manage/private', '/admin', '/api/qr?id=Ab3xY9',
    '/unknown', '/?token=private', '/?utm_source=campaign', '/#access_token=private', '/%67/Ab3xY9']) {
    const url = new URL(path, root).href;
    assert.equal(canTrackPage({ ...context, href: url }), false, path);
    assert.equal(filterAnalyticsEvent({ ...view, url }, context), null, path);
    assert.equal(filterAnalyticsEvent(view, { ...context, href: url }), null, 'current location also checked: '+path);
  }
  for (const url of ['bad url', 'javascript:alert(1)', 'https://user:password@luncher.example/']) {
    assert.equal(canTrackPage({ ...context, href: url }), false);
    assert.equal(filterAnalyticsEvent({ ...view, url }, context), null);
  }
});
test('unsafe referrers are dropped rather than forwarded outside the event URL filter', () => {
  for (const referrer of ['https://luncher.example/g/Ab3xY9', 'https://other.example/reset/private',
    'https://other.example/?token=private', 'https://other.example/#private', 'not a url']) {
    assert.equal(filterAnalyticsEvent(view, { ...context, referrer }), null);
  }
  assert.deepEqual(filterAnalyticsEvent(view, { ...context, referrer: 'https://search.example/' }), view);
});
test('browser privacy signals apply at startup and to later navigation events', () => {
  for (const signal of ['doNotTrack', 'globalPrivacyControl']) {
    const changed = { ...context, [signal]: true };
    assert.equal(canTrackPage(changed), false);
    assert.equal(filterAnalyticsEvent(view, changed), null);
  }
});
