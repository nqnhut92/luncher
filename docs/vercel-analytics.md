# Vercel Web Analytics

Luncher uses `@vercel/analytics` for **public homepage pageviews only**. Group pages are excluded because a group code grants read/write access. No Speed Insights, session replay, custom events, user properties, or manual pageview calls are installed.

## Integration and setup

This repository is a vanilla JavaScript application built with Vite and npm. The official integration is `inject()` from `@vercel/analytics`; the React and Next.js components do not apply.

- `src/main.js` calls `initializeAnalytics()` once at module startup, outside `render()` and all interaction handlers.
- `src/analytics.js` guards initialization and calls `inject()` once per eligible document. Vite development mode does not load the analytics script.
- The SDK uses production mode, its standard same-origin `/_vercel/insights/script.js` loader, and automatic pageviews. No extra script tag, manual tracking call, router listener, or server-side analytics integration is needed.
- `src/analytics-privacy.js` supplies the supported `beforeSend` filter.
- `package.json` and `package-lock.json` declare the dependency. Install reproducibly with `npm ci`.

The SDK requires no browser API key, Neon credential, or new environment variable. Do not add another analytics component/snippet or accept a second automatic-install change from the dashboard.

## Privacy boundary

The filter fails closed. Both the event URL and the browser's **current** location must be a clean HTTP(S) homepage `/` on the same origin, with no query string, fragment, or embedded credentials. Only `{ type: 'pageview', url: '<current-origin>/' }` is returned. Other event types and extra properties are discarded.

| Location or condition | Behavior |
| --- | --- |
| Clean public homepage `/` | Eligible in a production build |
| `/g/<code>` and group management/Grab interactions | Excluded; group codes, names, order links, and meal journals are not submitted |
| Auth callbacks, password resets, invitations, private management links | Excluded, as are all other non-homepage paths |
| Any homepage query or fragment, including campaign parameters | Excluded rather than forwarded or partially sanitized |
| Malformed URLs, external event origins, URL credentials | Excluded |
| Incoming referrer with a path other than `/`, query, fragment, or credentials | Excluded; the SDK's independently read referrer cannot be rewritten by this URL filter |
| Do Not Track or Global Privacy Control enabled | No initialization; later events are also rejected if signals change |
| Vite development server | No analytics initialization or debug URL logging |

The initial eligibility check prevents even the analytics loader from being requested on private first loads. The `beforeSend` callback reads location, referrer, and privacy signals again **for every event**, so a public first load followed by `pushState`, `replaceState`, or back/forward navigation cannot bypass the filter.

If a document starts on an excluded page, analytics stays off in that document. A normal full navigation to a clean homepage can initialize it there. This intentionally undercounts overall app/group usage: the dashboard describes eligible homepage traffic, not every visitor or group action.

The application supplies no credentials, form contents, localStorage values, group identifiers, personal names, Grab links, or custom properties to analytics. The provider still processes the standard browser/request metadata needed for its Web Analytics service; see [Vercel's privacy documentation](https://vercel.com/docs/analytics/privacy-policy).

### Consent and security

Inspection found no existing consent banner or consent-management integration. None is added, bypassed, or replaced. The integration additionally honors browser DNT/GPC signals. If consent requirements are introduced later, gate initialization and event delivery on that existing consent state as well.

The Vercel-wide `Referrer-Policy: no-referrer` response header remains unchanged. `index.html` also declares the same policy with a meta tag, covering local/static serving and analytics loader requests. No CSP, authentication, Grab URL validation, or other security protection is weakened. Do not disable browser protections, broaden CSP wholesale, or introduce a proxy to bypass a blocked analytics request.

New public routes must be explicitly reviewed before broadening this homepage-only policy. Never put group codes, auth/reset/invitation tokens, or private management paths into analytics route names.

## Vercel dashboard steps

These are project-owner steps; committing the SDK does not enable the dashboard service or establish collection.

1. Open the **Luncher** project in the Vercel dashboard and select **Analytics / Web Analytics**.
2. Check whether Web Analytics is already enabled. If not, enable it only within the intended plan and allowance. Do not select an upgrade or paid add-on unless separately approved.
3. Use the repository's existing Git deployment workflow so a deployment includes the SDK. No extra SDK installation, manual snippet, or Speed Insights setup is needed. Changing the service setting may require a new deployment.
4. Open the stable production homepage with no query or fragment, in a browser that has not opted out through DNT/GPC.
5. In browser DevTools, confirm one successful request to `/_vercel/insights/script.js`. Inspect the actual subsequent analytics requests and their responses; ingestion URLs can vary by SDK/service version.
6. Confirm eligible event URLs are only the public root. Do not copy real access links or sensitive payloads into logs/screenshots. Group, callback, reset, invitation, and management URLs should produce no pageview event.
7. Allow for processing delay, then confirm the visit appears in the project's Web Analytics dashboard. Select the appropriate domain and time range. A script response alone is not evidence that an event was accepted or displayed.

Ad blockers, browser privacy settings, network policy, unavailable platform endpoints, or project settings may prevent collection. Diagnose the observed response without turning those protections off globally.

## Local verification

```sh
npm ci
npm test
npm run test:e2e
npm run test:analytics
npm run build
```

- `npm test` includes URL, current-location, referrer, extra-field, custom-event rejection, and DNT/GPC filter tests.
- `npm run test:e2e` runs the existing application/Grab/group tests against an isolated PGlite database. Analytics is disabled on that development server.
- `npm run test:analytics` builds the real production bundle and serves it with Vite preview. Playwright intercepts the analytics loader and ingestion **inside the test only**. A clearly labeled script fixture consumes the real SDK's queued `beforeSend` hook and simulates initial/history-navigation pageviews.
- That production-build test checks one loader/hook, no duplicate events on UI rerenders, minimal accepted data, sensitive first-load exclusion, unsafe referrers, DNT/GPC, client-side navigation, no-referrer loader requests, and continued app use when the loader is blocked.

The fixture is not a production analytics endpoint and is not shipped as one. It does not verify the remote collector's implementation, Vercel ingestion, dashboard processing, or live event collection. Ordinary `npm run preview` may return 404 for Vercel-managed endpoints; do not add a local API to make collection appear successful.

The browser test uses the same Chromium selection as existing tests: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, then `/usr/bin/chromium`, then Playwright's installed browser. If needed, use `npx playwright install chromium`.

## Validation status

Local tests establish SDK wiring, application behavior, and filtering under the test's simulated delivery/navigation paths. **Live event collection has not been confirmed.** No Vercel dashboard setting, paid feature, or billing option was changed by this integration. Confirm real requests and the dashboard using the steps above before reporting production collection as working.

## References

- [Official Web Analytics quickstart](https://vercel.com/docs/analytics/quickstart)
- [Official SDK documentation](https://vercel.com/docs/analytics/package)
- [Supported beforeSend filtering](https://vercel.com/docs/analytics/package#beforesend)
- Installed official SDK README and types: `node_modules/@vercel/analytics/README.md` and `dist/index.d.ts`.
