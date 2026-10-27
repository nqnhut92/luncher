# Luncher

**English** · [Tiếng Việt](README.vi.md)

**Less deciding. More lunch.**

Luncher is a lightweight lunch picker for individuals and groups. Spin the wheel, confirm a dish, and keep the week's meals varied without accounts or room administrators.

[Open Luncher](https://truanayangi.congtynhu.cc/)

The interface is in Vietnamese and supports light and dark themes.

## Features

- **Meal wheel:** randomly select from the available dishes, with filters for rice, noodles, light meals, and vegetarian options.
- **Personal mode:** keep meal history in the current browser using `localStorage`.
- **Shared groups:** create a group once and share its permanent link. Everyone with the link can view, rename the group, confirm, or replace the day's choice.
- **Stable layout:** a fixed seven-day weekly view and a separate, scrollable change journal keep long histories from stretching the wheel.
- **Weekly variety:** confirmed dishes are excluded for the rest of the week unless repeats are explicitly enabled.
- **Change journal:** confirmations and replacements retain a timestamped record of the previous and new dishes.
- **Concurrent updates:** stale confirmations cannot silently overwrite a newer group decision.
- **Responsive design:** mobile layouts, persistent theme preferences, reduced-motion support, and no audio.

## How shared groups work

1. Enter a group name on the home page.
2. Copy the generated `/g/<code>` link and pin it in your group chat.
3. Spin privately to explore options. Spinning alone does not change the group's meal.
4. Confirm a dish to save it for everyone. The wheel locks for the day.
5. To change it, select **Change today’s meal**. The existing choice remains confirmed until a replacement is saved; cancelling leaves it untouched.
6. Open **Change history** to see confirmations and replacements with timestamps. There is no destructive undo action.

Group codes contain six case-sensitive alphanumeric characters, for example `/g/Ab3xY9`. Legacy UUID URLs are no longer accepted. The group name can be edited without changing its link.

Each group has one confirmed meal per day and its own history. Group links remain valid across days and weeks as long as the underlying database records are retained.

Weeks run from Monday through Sunday. Shared groups use **Asia/Ho_Chi_Minh** so all members follow the same calendar; personal mode uses the device's local date. Previous weeks' dishes become eligible again automatically.

Use **Refresh results** to retrieve another member's changes. Returning to the browser tab also refreshes the group. Updates are not pushed in real time.

## Return to a group

The home page shows up to **10 recently visited groups** from this browser. Open a card to return to its group; no code entry is required. A successful visit saves the current name, and subsequent reads or renames update that saved label.

Desktop displays at most two rows. Narrow screens use a contained horizontal scroller, with one row on mobile. Removing a card only forgets the local shortcut; the group's link, meals, and journal remain in Neon. Opening the link again adds it back.

Recent groups are stored in `localStorage`, not a public database directory. Another browser or device starts with its own list, and clearing browser data removes these shortcuts. Keep the shared link in your group chat as well.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | JavaScript, CSS, Vite, morphdom |
| API | Vercel Functions |
| Shared persistence | Neon Postgres via the Neon serverless driver |
| Personal preferences and history | Browser `localStorage` |
| Tests | Node.js test runner, PGlite, Playwright |

The default food catalog lives in [`src/foods.json`](src/foods.json). The frontend never connects directly to Postgres.

## Local development

### Requirements

- Node.js **22.12 or later**; Node.js 24 is recommended.
- npm.
- A Neon database connection for shared-group development. Personal mode and automated tests do not require Neon.

### Personal mode

```sh
npm ci
npm run dev
```

This starts the Vite frontend. Shared-group API requests require the full development server below.

### Shared groups

Copy [`.env.example`](.env.example) to `.env.local` and set `DATABASE_URL` to your Neon Postgres connection string. `POSTGRES_URL` is also supported as a fallback. Local environment files are ignored by Git.

```sh
npm run db:setup
npm run dev:full
```

The full development server serves Vite and the API together on port `5173`.

Run `npm run db:setup` for both new and existing databases. It applies [`db/schema.sql`](db/schema.sql), assigns public codes to existing groups, and enforces non-null codes. Running the SQL file alone does not complete the data migration. Setup preserves existing records and is safe to rerun.

Connection strings are server-only credentials. Never commit them or expose them through a `VITE_` variable.

## Deploy to Vercel

1. Import this repository into Vercel and connect a Neon database.
2. Make `DATABASE_URL` available to the intended deployment environment, such as Production. Use a **Postgres connection string**, not a Neon management API key.
3. Use the following project settings:

   | Setting | Value |
   | --- | --- |
   | Framework preset | Vite |
   | Install command | `npm ci` |
   | Build command | `npm run build:vercel` |
   | Output directory | `dist` |

4. Deploy. The build command runs schema setup before building the frontend. The database role must have permission to create the application tables on the first deployment.
5. Open the production site, create a group, and use a second browser session to verify shared confirmations.

[`vercel.json`](vercel.json) defines the build command and the `/g/:id` rewrite. Vercel deploys [`api/rooms.js`](api/rooms.js) as a server function. If the dashboard overrides the build command, use the value above. Redeploy after changing environment variables.

Share group links from a **stable production domain**, rather than a deployment-specific preview URL. Use separate Neon branches for Production and Preview to keep test data separate.

## Validation

```sh
npm test          # Calendar rules, API validation, and SQL behavior using PGlite
npm run test:e2e  # Full app with two independent browser contexts and an isolated DB
npm run build     # Frontend production build; no database access required
npm run preview   # Preview the frontend build; does not serve the group API
```

Browser tests use `/usr/bin/chromium` when available. To use another installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. If neither is available, install Playwright's browser:

```sh
npx playwright install chromium
```

Automated tests use an in-memory Postgres-compatible database and do not modify Neon data. They cover group isolation, conflicting writes, locked confirmations, cancellable replacement, change journals, weekly exclusions, persistence across page reloads, and failure handling. Verify the deployed API and Neon connection separately after deployment.

## Data and access model

See [Database design](docs/database-design.md) for the ER diagram, columns, constraints, write flows, and migration details.

- `luncher_rooms` stores internal UUIDs, unique six-character public codes, names, and revisions.
- `luncher_meal_events` retains confirmation/replacement events; older choices receive a clearly labeled migration baseline when the original time is unknown. No actor identity is recorded.
- `luncher_meal_choices` stores confirmed dishes. A primary key on `(room_id, meal_date)` enforces one meal per group per day.
- Atomic SQL writes check the room revision before accepting a change. The server also validates dish IDs, the group calendar, and weekly exclusions.
- A group link grants both read and write access. There are no owners, passwords, or recovery accounts. Keep links within the intended group and avoid storing sensitive information in group names.
- Personal daily choices and their journal are saved together under `luncher-personal-v2`; existing local history is migrated without deletion.
- Personal history remains on the device. It is not copied into a group, synchronized across devices, or recovered after browser storage is cleared.
- Failed group requests never fall back to local storage. Writes are not retried automatically, because a timed-out request may already have committed.

The current version does not include custom food editing, JSON import/export, voting, individual order collection, or live push updates.

## Inspiration

Inspired by the lunch-selection concept at [truanayangi.com](https://truanayangi.com/). Luncher's implementation, interface, and food catalog were written independently; no source code or assets from the reference repository were reused.
