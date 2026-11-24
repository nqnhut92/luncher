# Agent Instructions

## 1. Project Overview & Stack

- **Purpose:** Lightweight lunch (`/`) and afternoon drink (`/chieunayuonggi`) picker with local personal history and Neon-backed shared groups (`/g/<code>`).
- **Stack:** Vanilla JavaScript (ES modules), CSS, Vite, `morphdom`, Vercel Functions (`api/`, `server/`), Neon Postgres (`@neondatabase/serverless`), PGlite (local/test), Node.js (`>=22.12.0`), Playwright.
- **Docs Map:**
  - `docs/usage-guide.md` — User-facing behavior, shared-group rules, Grab links, PWA/Web Share Target, and limitations.
  - `docs/development.md` — Local modes, catalogs (`src/foods.json`, `src/drinks.json`), test suite, and Vercel deployment.
  - `docs/database-design.md` — Read before any persistence, schema, migration, concurrency, or API work.
  - `docs/vercel-analytics.md` — Homepage-only analytics privacy filter and verification.
  - `docs/decisions.md` — Architectural and product decisions log.

## 2. Essential Commands

- **Build:** `npm run build` (frontend production build; never use `npm run build:vercel` for routine verification because it runs `db:setup` against the configured database)
- **Test (Single):** `node --test tests/<file>.test.js` (e.g., `node --test tests/logic.test.js`)
- **Test (Full):** `npm test` (unit/API/SQL tests with PGlite) and `npm run test:e2e` (Playwright + isolated PGlite; respects `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`); `npm run test:analytics` builds and verifies the analytics filter
- **Lint / Format / Typecheck:** None configured in `package.json`

## 3. Hard Constraints & Guardrails

- **Never:**
  - Commit secrets, print connection strings, expose credentials via `VITE_` variables, or return raw database errors to clients.
  - Auto-retry timed-out/uncertain group writes, or fall back to `localStorage` when a shared-group request fails.
  - Rewrite or delete existing group codes, confirmed meals, journal events, or stable food IDs in `src/foods.json` (retire dishes with `active: false` instead).
  - Run `db:setup`, `build:vercel`, production data edits, or deployments against live Neon data without explicit authorization.
  - Imply real-time sync, authentication, actor attribution, or guaranteed chat previews unless implemented and verified.
- **Always:**
  - Keep database access server-side (`api/`, `server/`).
  - Preserve optimistic concurrency (`revision` checks) and atomic meal/journal writes.
  - Validate Grab links on the server: HTTPS only, no embedded credentials, max 500 characters, host in `grab.com`, subdomains of `grab.com`, or `grab.onelink.me`. Preserve UI/metadata escaping and graceful fallback when preview fetch fails.
  - Treat group codes and Grab order links as access-bearing data; use synthetic examples in docs/tests.
  - Keep `package-lock.json` updated alongside `package.json` and `.env.example` updated with placeholders only.
- **Gotchas:**
  - Shared groups use `Asia/Ho_Chi_Minh` and Monday–Sunday weeks; personal mode uses the device's local date.
  - Recent groups (`localStorage`) are browser-local shortcuts, not memberships or a public directory—forgetting one must not delete server data.
  - `npm run dev` serves only the Vite frontend; use `npm run dev:local` (in-memory PGlite) or `npm run dev:full` (Neon) for `/api/*` and `/g/<code>`.

## 4. Code Style & Patterns

- Use JavaScript ES modules (`"type": "module"`) and standard CSS without adding frameworks or unapproved dependencies.
- Keep Vietnamese UI copy natural; preserve keyboard accessibility, focus management, mobile/Liquid Glass layouts, System/Light/Dark themes, and `prefers-reduced-motion` support.
- Keep `README.md` and `README.vi.md` aligned in meaning using natural English and Vietnamese rather than translating code identifiers.
- Use additive schema setup (`db/schema.sql`), rerunnable migrations (`db/migrations/`), and parameterized SQL.

## 5. Definition of Done

- Run `npm test` and `npm run build` for application changes; also run `npm run test:e2e` for UI, routing, or shared-group flow changes (and `npm run test:analytics` if analytics files changed).
- Update `docs/database-design.md` for schema, API, concurrency, storage key, or migration changes; update `docs/usage-guide.md`, `README.md`, and `README.vi.md` for user-facing or setup changes; update `docs/decisions.md` for non-obvious architectural choices.
- For documentation-only changes, verify factual accuracy, relative links, commands, and English/Vietnamese parity.
- If the Nicholas Hub MCP is available, sync the repository architecture via `arch_document` after new commits (skip if unavailable).
