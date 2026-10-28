# Luncher

**English** · [Tiếng Việt](README.vi.md)

**Less deciding. More lunch.**

Luncher is a lightweight lunch picker for individuals and groups. Spin the wheel, confirm a dish, and keep the week's meals varied without accounts or room administrators.

[Open Luncher](https://truanayangi.congtynhu.cc/)

The interface is in Vietnamese and supports light and dark themes.

## Features

- **Vertical food reel:** a slot-machine picker shows three rows with horizontal names and matching food illustrations. Use the spin button or side lever (also keyboard accessible). It slows down onto the selected dish; reduced-motion mode skips the animation. Filters cover rice and noodles. Food pictures stay left while names are centered in the remaining space; Bún chả / Bún thịt nướng uses two fixed lines. The cabinet has a recessed brass-trimmed reel, an integrated base button, and a separate side lever with a visible axle; clicking the lever animates its arm within the side gutter before the reel settles. The arm returns upright and stays upright while hovered or after a tap.
- **Personal mode:** keep meal history in the current browser using `localStorage`.
- **Shared groups:** create a group once and share its permanent link. Everyone with the link can view, rename the group, confirm, or replace the day's choice.
- **Stable layout:** a fixed seven-day weekly view and a separate, scrollable change journal keep long histories from stretching the wheel.
- **Today first:** once the day's meal is confirmed, the dish card leads and the wheel steps back; the full menu is collapsed until opened. In a group, the Grab order card sits beside the wheel with its QR code and an **Open Grab order** button.
- **Weekly variety:** confirmed dishes are excluded for the rest of the week unless repeats are explicitly enabled.
- **Change journal:** confirmations and replacements retain a timestamped record of the previous and new dishes.
- **Grab group order:** paste a Grab group-order link (`https://…grab.com/…`) into the group. Luncher reads the share details Grab publishes for that link: a title and a share image showing the store name, address, and rating. The group page shows them with a QR code. Sharing the `/g/<code>` link in chat apps renders a preview card with the store image and QR code (Open Graph).
- **Link previews at a glance:** the preview title and description of a shared group link name today's confirmed dish and the time it was confirmed, for example "Hôm nay ăn Mì Quảng 🍜 · Lunch crew".
- **Concurrent updates:** stale confirmations cannot silently overwrite a newer group decision.
- **Sticky header:** the logo and theme switch stay visible while scrolling. A full-width divider and translucent, blurred background work in both themes, with an opaque fallback when backdrop filters are unavailable.
- **Responsive design:** mobile layouts, persistent theme preferences, reduced-motion support, and no audio. The interface uses a Liquid Glass style: capsule controls, translucent cards, and a glass slot reel over a soft color backdrop, with denser glass behind text so it keeps WCAG AA contrast. Buttons have touch targets of at least 44px, and surfaces become opaque when the device asks for reduced transparency.

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

## Grab group orders and link previews

In a shared group, add a Grab group-order link, save it, then share the Luncher group link. Any participant with the group link can update or clear the Grab link. Accepted links use HTTPS on `grab.com`, a subdomain of `grab.com`, or `grab.onelink.me`, contain no username/password, and are at most 500 characters long. Clearing the link removes the QR without changing meals or their journal.

When a link is saved, the server reads Grab's share details for it, either from the redirect of a Grab short link or from the Open Graph tags of the Grab page. It follows only HTTPS redirects on the allowed Grab hosts, within 4 seconds and 256 KB. It keeps only a title (up to 120 characters) and a share image hosted on `grab.com`. Grab publishes no store name as text, so the store name, address, and rating appear only in Grab's share image. If reading fails, the link is still saved and the preview shows only the QR code.

The group page shows the share image and a QR code for the saved Grab URL. `/g/<code>` serves the app shell with server-rendered Open Graph metadata. Its title and description name today's confirmed dish, the time it was confirmed, and the Grab title. `/api/qr?id=<code>` produces a 1200×630 PNG with Grab's share image on the left and the QR code on the right. It shows the QR code alone when there is no usable image; Grab's image must be a PNG of at most 2 MB and 2000×2000 pixels. Chat services may show this as a preview, but can cache earlier previews or choose not to display an image. Changing the Grab link changes the image version URL; it cannot force a chat service to refresh an already shared message.

The saved link is not reset automatically each day. Replace or clear it when an order ends. Luncher does not create Grab orders, track expiry, or collect individual orders. Sharing the group link also makes its saved Grab URL and share image available to recipients and link-preview services. Luncher does not track Grab's order status. The saved share details reflect the time the link was saved, and the preview text reflects the dish confirmed when a chat service fetched the preview.

## Web Analytics

Production builds initialize the official Vercel Web Analytics SDK once on eligible public homepage visits. Group/access links, every non-homepage route, query strings, fragments, and unsafe referrers are excluded. Browser Do Not Track and Global Privacy Control are honored. There are no custom events, Speed Insights, or session replay.

See [Web Analytics setup and privacy](docs/vercel-analytics.md) for the filtering policy, local tests, and Vercel dashboard steps. Local validation does **not** confirm live event collection; dashboard enablement and real event arrival must be verified separately. No paid feature is enabled by this change.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | JavaScript, CSS, Vite, morphdom |
| API | Vercel Functions |
| Shared persistence | Neon Postgres via the Neon serverless driver |
| Personal preferences and history | Browser `localStorage` |
| Tests | Node.js test runner, PGlite, Playwright |

The default food catalog lives in [`src/foods.json`](src/foods.json). The frontend never connects directly to Postgres.

The current menu has eight choices: Bún bò, Bún chả / Bún thịt nướng (one combined choice), Cơm gà, Bánh canh cua, Mì Quảng, Cơm tấm, Mì hoành thánh, and Bún mọc. The generated illustrations are bundled in `public/images/food-atlas.png`; no image-generation request runs while using the app. Catalog entries marked `active: false` are hidden from new spins and the menu, but remain available for reading saved meals and journals. Existing IDs are preserved; older clients can still confirm legacy catalog IDs through the API.

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

### Review without Neon

```sh
npm run dev:local
```

This serves the full app and API with an in-memory database (PGlite) and prints links to two demo groups: one without a meal today, and one with a confirmed meal and a synthetic Grab link. Set `PORT` to use another port. Data is discarded when the process stops.

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

[`vercel.json`](vercel.json) defines the build command and the `/g/:id` rewrite. Vercel routes `/g/:id` through [`api/group-page.js`](api/group-page.js) for preview metadata and serves the QR image through [`api/qr.js`](api/qr.js). [`api/rooms.js`](api/rooms.js) handles group data; all three use the shared server-side Neon store. If the dashboard overrides the build command, use the value above. Redeploy after changing environment variables.

Share group links from a **stable production domain**, rather than a deployment-specific preview URL. Use separate Neon branches for Production and Preview to keep test data separate.

## Validation

```sh
npm test          # Calendar rules, API validation, and SQL behavior using PGlite
npm run test:e2e  # Full app with independent browser contexts and an isolated DB
npm run test:analytics # Production SDK/filter integration with a test-only delivery fixture
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

## Contributing with AI agents

Read [AGENTS.md](AGENTS.md) before changing this repository. Claude Code imports the same rules through [CLAUDE.md](CLAUDE.md). Changes to behavior must include the relevant documentation in the same change, including both README languages and database/API documentation when affected. Report validation performed and explain when documentation updates are unnecessary.

## Inspiration

Inspired by the lunch-selection concept at [truanayangi.com](https://truanayangi.com/). Luncher's implementation, interface, and food catalog were written independently; no source code or assets from the reference repository were reused.
