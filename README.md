# Luncher

**English** · [Tiếng Việt](README.vi.md)

**Less deciding. More lunch.**

Luncher is a lightweight lunch and afternoon drink picker for individuals and shared groups—spin the reel, confirm a dish, and keep the week's meals varied without accounts or room admins.

[Open Luncher](https://truanayangi.congtynhu.cc/)

The interface is in Vietnamese and supports System, Light, and Dark themes.

## Features

- **Vertical food reel:** Slot-machine picker with rice/noodle filters, a side lever, keyboard support, and reduced-motion support.
- **No streaky spins:** Draw-without-replacement picker (`src/spin-bag.js`) cycles through every available option once before repeating.
- **Personal mode:** Stores daily meal choices and history locally in browser `localStorage`.
- **Afternoon drinks (`/chieunayuonggi`):** Personal-only reel for picking milk-tea and tea shops with no stored history.
- **Shared groups (`/g/<code>`):** Shareable six-character group links with daily meal locks, explicit replacements, and optimistic concurrency.
- **Weekly variety & change journal:** Excludes confirmed dishes for the rest of the Monday–Sunday week and logs confirmations/replacements.
- **Grab group orders & previews:** Saves validated Grab links with QR codes, server-fetched share details, and Open Graph previews.
- **Installable group PWA & Web Share Target:** Installs per-group home-screen apps and receives shared Grab links on Android Chrome/Chromium.
- **Recent groups & responsive UI:** Lists up to 10 browser-local group shortcuts in a Liquid Glass layout with Light/Dark/System themes.

## Requirements

- Node.js **22.12 or later** (Node.js 24 recommended)
- npm
- Neon Postgres connection string (optional; only needed for Neon-backed shared-group development)

## Quick start

Install dependencies:

```sh
npm ci
```

Run personal mode (frontend only):

```sh
npm run dev
```

Run full app + API locally without Neon (in-memory PGlite):

```sh
npm run dev:local
```

Run full app + API with Neon (copy [`.env.example`](.env.example) to `.env.local` and set `DATABASE_URL` first):

```sh
npm run db:setup
npm run dev:full
```

## Documentation

- [Usage guide](docs/usage-guide.md) — Shared groups, Grab links, PWA installation, Web Share Target, and appearance
- [Development and deployment](docs/development.md) — Stack, catalogs, testing commands, and Vercel deployment
- [Database design](docs/database-design.md) — Schema, constraints, concurrency, storage keys, and migrations
- [Web Analytics](docs/vercel-analytics.md) — Homepage-only analytics filter and verification
- [Decisions log](docs/decisions.md) — Key architectural and product decisions
- [Agent instructions](AGENTS.md) — Rules for contributing with AI agents ([CLAUDE.md](CLAUDE.md) points here)

## Inspiration and license

Inspired by [truanayangi.com](https://truanayangi.com/), written independently with no reused code or assets.

Code, documentation, and food illustrations are released under the [MIT License](LICENSE). Drink shop logos in [`public/images/drinks/`](public/images/drinks/) are trademarks of their respective owners and are used solely for identification.
