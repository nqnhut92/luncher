# Luncher

**English** · [Tiếng Việt](README.vi.md)

Luncher is a lightweight lunch and afternoon drink picker for individuals and shared groups—spin the reel, confirm a dish, and keep Monday–Sunday meals varied without accounts or room admins.

[Open Luncher](https://truanayangi.congtynhu.cc/) — Vietnamese UI with System, Light, and Dark themes.

## Tech Stack

- **Frontend:** JavaScript (ES modules), CSS, Vite, `morphdom`, `@vercel/analytics`
- **API & Runtime:** Node.js (`>=22.12.0`), Vercel Functions (`api/`, `server/`)
- **Persistence:** Neon Postgres (`@neondatabase/serverless`) for shared groups; browser `localStorage` for personal mode
- **Testing:** Node.js built-in test runner (`node --test`), PGlite (`@electric-sql/pglite`), Playwright

## Prerequisites & Quick Start

- **Prerequisites:** Node.js **22.12+** (Node.js 24 recommended), `npm`, and an optional Neon Postgres connection string for Neon-backed shared-group development.

Install dependencies:

```sh
npm ci
```

Run locally in one of three modes:

```sh
# 1. Personal mode only (Vite frontend, no shared-group API)
npm run dev

# 2. Full app + API without Neon (in-memory PGlite, data discarded on exit)
npm run dev:local

# 3. Full app + API with Neon (copy .env.example to .env.local and set DATABASE_URL first)
npm run db:setup
npm run dev:full
```

## Documentation

- [Usage guide](docs/usage-guide.md) — Personal mode, shared groups (`/g/<code>`), afternoon drinks (`/chieunayuonggi`), Grab links, PWA installation, and Web Share Target
- [Development and deployment](docs/development.md) — Stack, food/drink catalogs, local setup, testing commands, and Vercel deployment
- [Database design](docs/database-design.md) — Schema, constraints, optimistic concurrency, storage keys, and migrations
- [Web Analytics](docs/vercel-analytics.md) — Fail-closed homepage-only analytics filter and verification
- [Decisions log](docs/decisions.md) — Key architectural and product decisions
- [Agent instructions](AGENTS.md) — Execution rules for AI coding agents ([CLAUDE.md](CLAUDE.md) points here)

## Inspiration & License

Inspired by [truanayangi.com](https://truanayangi.com/), written independently with no reused code or assets.

Code, documentation, and food illustrations are released under the [MIT License](LICENSE). Drink shop logos in [`public/images/drinks/`](public/images/drinks/) are trademarks of their respective owners and are used solely for identification.
