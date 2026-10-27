# Agent instructions

These instructions apply throughout this repository. Read more specific instructions in a directory before editing it. Claude Code loads these shared rules through the root `CLAUDE.md`.

## Before changing code

- Read `README.md`, `README.vi.md`, and the relevant implementation and tests. For persistence or API work, also read `docs/database-design.md`.
- Check `git status` and recent commits. Preserve collaborators' work and uncommitted changes. Check the current upstream version when the task depends on newly pushed features; report if it cannot be retrieved.
- Keep changes focused on the requested behavior and follow the existing JavaScript ES modules, CSS, and npm conventions. Add dependencies only when justified; update `package-lock.json` with `package.json`.

## Documentation is part of the change

- Ship documentation with any change to user-visible behavior, API contracts, stored data, configuration, commands, or deployment. Do not mark a feature complete while its relevant docs describe the old behavior.
- Update **both** `README.md` and `README.vi.md` for user-facing features, limitations, setup, and deployment changes. Keep their meaning aligned; use natural English and Vietnamese rather than translating code identifiers.
- Update `docs/database-design.md` for schema, constraints, API payloads/actions, concurrency, storage keys, migration, or access-model changes. Include affected diagrams, examples, and source-map entries.
- Update `.env.example` for new configuration using placeholders only. Keep documented npm commands consistent with `package.json` and deployment behavior consistent with `vercel.json`.
- Describe implemented behavior and practical limitations. Do not imply real-time sync, authentication, actor attribution, or guaranteed chat previews unless implemented and verified. Chat services may cache previews.
- If no documentation change is needed, explain why in the final handoff or PR description. Avoid cosmetic doc edits solely to satisfy this rule.

## Project map and behavior to preserve

- `src/`: Vietnamese UI, wheel/calendar logic, browser persistence, activity journal, and recent-group shortcuts. Preserve keyboard access, focus, mobile layouts, both themes, and reduced-motion support.
- `api/` and `server/`: Vercel handlers, request validation, parameterized SQL, shared-group calendar, Grab URL validation, and server-rendered link previews. Keep database access server-side.
- `db/schema.sql`, `db/migrations/`, and `scripts/setup-db.js`: additive schema setup, rerunnable data migrations, and public-code backfill. Preserve existing group codes, meals, events, and stable food IDs.
- Shared groups use `Asia/Ho_Chi_Minh` and Monday–Sunday weeks; personal mode uses the device's date. Keep daily confirmation locks, explicit replacements, cancellation without writes, and journal history intact.
- Group links grant read/write access; recent groups are browser-local shortcuts, not memberships or a public directory. Forgetting a shortcut must not delete server data.
- Keep revision checks and atomic meal/journal writes. Failed group requests must not become local-only confirmations, and uncertain writes must not retry automatically.
- Validate Grab links on the server: HTTPS, no embedded credentials, maximum 500 characters, and only `grab.com`, its subdomains, or `grab.onelink.me`. Preserve escaping in UI/metadata and fallback page loading when preview lookup fails.
- Never commit secrets, print connection strings, expose credentials via `VITE_` variables, or return raw database errors. Treat group codes and Grab order links as access-bearing data; use synthetic examples.
- Use isolated test data. Schema setup and `build:vercel` can write to the configured database; use `npm run build` for ordinary build verification. Production data corrections or deployment require authorization covering that action.

## Verification and handoff

- Use Node.js >=22.12 and npm; install reproducibly with `npm ci` when needed.
- For application changes, run `npm test` and `npm run build`. Add focused regression coverage for changed behavior, especially calendar boundaries, stale revisions, persistence, and validation.
- Run `npm run test:e2e` for UI, routing, or shared-group flow changes. It uses Playwright and an isolated PGlite database, without Neon credentials. Respect `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when configured.
- For documentation-only changes, check factual accuracy, relative links, examples, commands, and English/Vietnamese parity; application tests are unnecessary unless executable behavior changed.
- Review the final diff for unrelated edits, generated output, secrets, and missing docs. Report what changed, which docs were updated (or why none were needed), checks actually run, and any remaining limitation. Never claim a check passed if it was not run.
