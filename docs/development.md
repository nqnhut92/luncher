# Development and deployment

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | JavaScript (ES modules), CSS, Vite, `morphdom` |
| API | Vercel Functions |
| Shared persistence | Neon Postgres via `@neondatabase/serverless` |
| Personal persistence | Browser `localStorage` |
| Tests | Node.js test runner, PGlite, Playwright |

The frontend never connects directly to Postgres.

## Catalogs and assets

- **Food catalog (`src/foods.json`):** Eight active choices (*Bún bò*, *Bún chả / Bún thịt nướng*, *Cơm gà*, *Bánh canh cua*, *Mì Quảng*, *Cơm tấm*, *Mì hoành thánh*, *Bún mọc*) with bundled illustrations in `public/images/food-atlas.png`. Entries marked `active: false` are hidden from new spins and the menu but remain valid for reading saved meals/journals and backwards-compatible API confirmation. Keep existing IDs stable.
- **Drink catalog (`src/drinks.json`):** Twelve tea/milk-tea shops with 320×320 JPEG logos in `public/images/drinks/<id>.jpg` (non-square originals padded with their background color). Shops without a `logo` fall back to a colored initials badge using optional `mark` and `color` fields. Shop logos belong to their respective owners and are used solely for identification.

## Local development

### Requirements

- Node.js **22.12 or later** (Node.js 24 recommended)
- npm
- A Neon database connection string (only required for Neon-backed shared-group development)

Install dependencies:

```sh
npm ci
```

### Personal mode only

```sh
npm run dev
```

Starts the Vite frontend only. Shared-group API requests require `dev:full` or `dev:local`.

### Review without Neon (in-memory PGlite)

```sh
npm run dev:local
```

Serves the full app and API backed by an in-memory PGlite database and prints links to two demo groups (one without a meal today, one with a confirmed meal and a synthetic Grab link). Set `PORT` to override the port. Data is discarded on exit.

### Shared groups with Neon

1. Copy [`.env.example`](../.env.example) to `.env.local` and set `DATABASE_URL` (or `POSTGRES_URL`) to your Neon Postgres connection string. Local env files are gitignored.
2. Apply schema and code backfill, then start the full dev server on port `5173`:

```sh
npm run db:setup
npm run dev:full
```

Run `npm run db:setup` for both new and existing databases—it applies [`db/schema.sql`](../db/schema.sql), backfills 6-character public codes, and enforces `NOT NULL` constraints without deleting existing records. Never commit connection strings or expose them via `VITE_` variables.

## Validation and testing

```sh
npm test               # Calendar rules, API validation, and SQL behavior using PGlite
npm run test:e2e       # Full app E2E tests with Playwright and an isolated PGlite DB
npm run test:analytics # Production SDK/filter integration with a test-only delivery fixture
npm run build          # Frontend production build (no database access required)
npm run preview        # Preview the frontend build (does not serve the group API)
```

Browser tests use `/usr/bin/chromium` if present, or `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when set. Otherwise install Playwright's Chromium binary:

```sh
npx playwright install chromium
```

Automated tests use an in-memory Postgres-compatible database and never modify Neon data. Verify the deployed API, Neon connection, and Teams/chat link previews separately after deployment.

## Deploy to Vercel

1. Import this repository into Vercel and connect a Neon database.
2. Set `DATABASE_URL` in the target environment (e.g., Production) using a **Postgres connection string** (not a Neon management API key).
3. Configure build settings:

   | Setting | Value |
   | --- | --- |
   | Framework preset | Vite |
   | Install command | `npm ci` |
   | Build command | `npm run build:vercel` |
   | Output directory | `dist` |

4. Deploy. `npm run build:vercel` runs `npm run db:setup` before `npm run build`, so the database role must have permission to create tables on first deployment.
5. Open the production site, create a group, and verify shared confirmations from a second browser session.

[`vercel.json`](../vercel.json) defines the build command and rewrites for `/g/:id` (routed to [`api/group-page.js`](../api/group-page.js) for Open Graph metadata) and `/chieunayuonggi` (built from [`chieunayuonggi/index.html`](../chieunayuonggi/index.html) via [`vite.config.js`](../vite.config.js)). [`api/qr.js`](../api/qr.js) serves QR images and [`api/rooms.js`](../api/rooms.js) handles group data.

Share group links from a **stable production domain** rather than deployment-specific preview URLs, and use separate Neon branches for Production and Preview.

## Further reading

- [Database design](database-design.md)
- [Vercel Web Analytics](vercel-analytics.md)
