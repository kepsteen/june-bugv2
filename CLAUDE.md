# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Origin

This repo is a ground-up rewrite of `~/repos/june-bug` — the original JuneBug journaling app built on Convex. The v2 stack replaces Convex with Express + Postgres + Drizzle + Better Auth. If asked about original design decisions, prior behavior, or reference implementations, consult `~/repos/june-bug`.

## Package Manager

This project uses **pnpm** workspaces. Always use `pnpm` instead of `npm`.

## Commands

Run from the **repo root** unless otherwise noted:

- `pnpm dev` — Start both frontend (`:5174`) and backend (`:3000`) in parallel (always assume it's already running)
- `pnpm type-check` — Type check all packages
- `pnpm test` — Run all tests across workspaces
- `pnpm build` — Build all packages
- `pnpm build:deploy` — Production build: web SPA + API, copy web dist into `apps/api/public/`
- `pnpm start` — Run migrations then start the API (serves SPA when `apps/api/public/` exists)
- `pnpm lint` — Lint all packages

Run from **`apps/api`**:

- `pnpm test:run` — Run tests once (non-watch)
- `pnpm db:generate` — Generate Drizzle migration files from schema changes
- `pnpm db:migrate` — Apply pending migrations to the database
- `pnpm db:push` — Push schema directly (dev only, skips migration files)
- `pnpm db:studio` — Open Drizzle Studio UI

Run from **`apps/web`**:

- `pnpm test:run` — Run tests once
- `pnpm test:ui` — Open Vitest UI

To run a single test file: `cd apps/api && pnpm vitest run src/middleware/validate.test.ts`

## Environment Setup

Copy `apps/api/.env.example` to `apps/api/.env`. Required variables:

- `DATABASE_URL` — Neon Postgres connection string
- `BETTER_AUTH_SECRET` — Min 32-char random string

Optional (features degrade gracefully without them):

- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — GitHub OAuth
- `OPENAI_API_KEY` — AI title generation
- `AWS_*` + `AWS_S3_BUCKET` — File uploads
- `RESEND_API_KEY` — Email

## Database: Creating & Migrating

Migrations live in `apps/api/src/lib/db/drizzle/`. Each migration is a `NNNN_<name>.sql` file plus a matching `meta/NNNN_snapshot.json`, and **every** migration must have a corresponding entry in `meta/_journal.json`. The schema is defined in `src/lib/db/schema.ts` (which aggregates each feature's table file).

`drizzle-kit migrate` replays the journal in order, so the journal, the `.sql` files, and the snapshots must stay in sync. **Migration `0004_pretty_black_crow` is the baseline** — it creates every table from scratch (its snapshot has the zero `prevId`). Migrations `0000`–`0003` were squashed into it and intentionally no longer exist; the journal starts at idx 4. Never re-add `0000`–`0003`.

### Set up a fresh database

1. Create a Neon Postgres database and put its connection string in `apps/api/.env` as `DATABASE_URL`.
2. From `apps/api`, run `pnpm db:migrate`. This creates the `drizzle.__drizzle_migrations` tracking table and applies `0004` → latest. You should end up with all `public` tables and one row per applied migration.

### Make schema changes

1. Edit the relevant table file under `src/features/<name>/` (and ensure it's exported into `src/lib/db/schema.ts`).
2. From `apps/api`, run `pnpm db:generate`. Drizzle diffs the schema against the latest snapshot and writes a new `NNNN_*.sql` + snapshot, appending an entry to `_journal.json`. Review the generated SQL.
3. Run `pnpm db:migrate` to apply it.
4. Commit the new `.sql`, its snapshot, and the updated `_journal.json` **together**.

### Rules & gotchas

- **Keep the journal honest.** A `_journal.json` entry without a matching `.sql` file breaks `pnpm db:migrate` for everyone on a fresh DB (it errors trying to read the missing file), even though `pnpm db:generate` keeps working because it only reads the latest snapshot. This exact drift was the cause of a past migration-history bug.
- **`db:push` does not use migrations.** It diffs the schema straight onto the DB and never creates `__drizzle_migrations`. Use it only for throwaway local experimentation; a `push`-built database is not "migrate-managed" and `db:migrate` will later try to re-create existing tables. Prefer `db:migrate` so prod and CI stay reproducible.
- **Squashing/editing history:** if you ever consolidate migrations, delete the obsolete `.sql` files, their snapshots, **and** their `_journal.json` entries in the same change.
- **Validate risky migration changes on a disposable Neon branch** (create a branch, reset its `public` schema, run `pnpm db:migrate` against the branch's connection string) before touching the primary database.

## Architecture

### Monorepo Structure

```
apps/api/     Express backend (port 3000)
apps/web/     React + Vite frontend (port 5173)
packages/shared/  Shared TypeScript types
```

### Backend (`apps/api`)

**Feature-based structure**: each feature lives in `src/features/<name>/` containing a table definition, service, routes, and barrel `index.ts`.

**Auth pattern**: Two user tables exist side by side:

- Better Auth manages its own `user`/`session`/`account` tables (in `features/auth/auth.table.ts`)
- `app_users` table (in `features/app-users/`) stores app-specific profile data and onboarding state, linked via `app_users.auth_id → better_auth.user.id`

Every authenticated route resolves the app user via `appUsersService.findOrCreate(authUser.id, authUser.email)` — this lazily creates the `app_users` row on first access.

**Request flow**: `AuthMiddleware` → route handler → service → Drizzle query. `AuthMiddleware` calls `auth.api.getSession()` and stores the Better Auth user in `res.locals.user`. Routes never call auth directly.

**Error handling**: Throw subclasses of `AppError` (from `src/lib/errors/`) inside routes/services. The `errorHandler` middleware in `src/middleware/error-middleware.ts` catches them and returns structured JSON responses.

**Validation**: Use `ValidationMiddleware`, `validateBody`, `validateQuery`, or `validateParams` from `src/middleware/validation-middleware.ts` with Zod schemas. These replace the raw request fields with validated values.

**DB schema**: All tables are aggregated in `src/lib/db/schema.ts` and imported by `drizzle.config.ts`. The db client is a singleton at `src/lib/db/index.ts`.

**Static routes that must come before parameterized ones**: `/search` and `/range` are registered before `/:id` in entries routes — maintain this order when adding similar endpoints.

### Frontend (`apps/web`)

**API layer**: `src/lib/api.ts` contains all API client functions (grouped by resource: `entriesApi`, `tagsApi`, etc.) using a shared `request()` helper that always sends `credentials: 'include'`.

**Data fetching**: `src/hooks/api/` contains React Query hooks wrapping `api.ts` functions. Mutation hooks automatically invalidate relevant query keys on success. Use these hooks in components rather than calling `api.ts` directly.

**Auth**: `src/lib/auth-client.ts` exports the Better Auth browser client. Use `useSession()` for session state. `ProtectedRoute` and `AuthRoute` in `App.tsx` handle redirects.

**Styling**: Tailwind CSS v4 with OKLCH color variables defined in `src/index.css`. Shadcn UI components (new-york style) live in `src/components/ui/`. Add new Shadcn components with `cd apps/web && pnpm dlx shadcn@latest add <component>`.

**Editor**: Tiptap v3 with custom slash commands (`/`) implemented via `@tiptap/suggestion` + tippy.js. The slash command list component is in `src/components/editor/`. Tippy is configured with `theme: 'none'` and `arrow: false` to avoid rendering its own dark box.

**Entries model**: One entry per user per calendar date (enforced by a unique index). `POST /api/entries` is idempotent — it calls `createOrGetByDate` and returns the existing entry if one already exists for that date.

## Deployment (Railway single service)

Production is a **single Railway service** — one Node process (Express) serves both the API and the built React SPA from the same origin. There is no separate frontend host or reverse proxy in front of the app; [`railway.toml`](railway.toml) configures the full build/deploy lifecycle via [Railpack](https://railpack.com/).

### How it works

1. **Build** (`buildCommand`): `pnpm build:deploy` builds the Vite SPA, compiles the API (`tsc`), then copies `apps/web/dist/` → `apps/api/public/` (`scripts/copy-web-dist.mjs`).
2. **Pre-deploy** (`preDeployCommand`): `pnpm --filter @starter/api db:migrate` applies pending Drizzle migrations before the new container goes live.
3. **Start** (`startCommand`): `pnpm --filter @starter/api start` → `node dist/index.js` on `PORT` (Railway injects this).
4. **Health check**: Railway polls `GET /api/health` (30s timeout). The route is defined in `apps/api/src/index.ts`.
5. **Static + SPA routing**: When `apps/api/public/` exists, Express serves static assets and falls back to `index.html` for non-API GET requests (client-side routing).

In development, the web app runs on Vite (`:5174`) and the API on Express (`:3000`). In production, both are same-origin — the SPA uses relative `/api/...` URLs (`VITE_API_URL` is unset in prod builds).

### Railway environment variables

Set these in the Railway dashboard (see also `.env.example` production comments):

| Variable | Required | Notes |
|----------|----------|-------|
| `RAILPACK_NO_SPA` | Yes | `1` — prevents Railpack from auto-serving the Vite SPA via Caddy; Express serves it from `apps/api/public/` |
| `NODE_ENV` | Yes | `production` |
| `PUBLIC_URL` | Yes | e.g. `https://${{RAILWAY_PUBLIC_DOMAIN}}` — canonical app URL |
| `DATABASE_URL` | Yes | Neon or Railway Postgres connection string |
| `BETTER_AUTH_SECRET` | Yes | Min 32-char random string |
| `BETTER_AUTH_URL` | No | Defaults to `PUBLIC_URL` |
| `CLIENT_URL` | No | Defaults to `PUBLIC_URL` |
| `GITHUB_CLIENT_*`, `OPENAI_API_KEY`, `AWS_*`, `RESEND_API_KEY` | No | Same optional keys as local dev |

`VITE_API_URL` is **not** needed in production. GitHub OAuth callback (if enabled): `https://<your-domain>/api/auth/callback/github`.

### Local production smoke test

From repo root:

```bash
pnpm build:deploy   # build SPA + API, copy dist into apps/api/public/
pnpm start          # migrate + start (same as Railway minus Railpack)
```

Or from `apps/api` after `build:deploy`: `node dist/index.js`.

### `railway.toml` reference

- **Builder:** `RAILPACK` (Node ≥ 22 per root `package.json` `engines`)
- **Watch patterns:** `apps/**`, `packages/**`, `scripts/**`, lockfile/workspace manifests — redeploy on changes to these paths
- **Restart policy:** `ON_FAILURE`, max 10 retries

## Design Context

Guidance for any UI/design work. The canonical copy lives in `.impeccable.md` at the repo root (used by the `impeccable` design skill); keep the two in sync.

**Users**: Developers who keep a daily journal — one entry per calendar day, with AI-assisted titles, "memories," and personalized prompts. The job is **reflection, not productivity tracking**. Sessions often happen at night, so the UI must be comfortable in low light and never demanding.

**Brand personality**: Warm, gentle, human. The interface should make the user feel **calm and safe** — a quiet, low-pressure space to think. Personality (the "june bug" mascot, the happy-wiggle, the floating logo button) shows up in *restraint and small touches*, not loudness.

**Aesthetic direction** — keep and refine the current warm, organic look; do not redesign the brand:

- **Palette**: warm sand/cream neutrals (light) and warm dark-brown (dark), olive/sage **green primary**, amber-leaning accents. Authored in **OKLCH** in `apps/web/src/index.css`, with neutrals tinted toward the warm brand hue (~80). Never introduce cold grays, pure `#000`/`#fff`, or the cyan-on-dark / purple-gradient "AI" palette.
- **Type**: Nunito (sans / UI + body), PT Serif (serif, for editorial/journal reading), JetBrains Mono (code & metadata). Favor the serif in entry-reading moments; keep UI chrome in Nunito.
- **Shape**: soft rounded corners (`--radius: 0.625rem`), gentle borders, the notched editor panel. Tactile and cozy like a worn notebook — not glassy, neon, or flat-corporate.
- **Themes**: support **both**; dark mode must feel genuinely warm (brown, not slate).
- **Anti-references**: generic SaaS dashboards, glassmorphism, glowing dark-mode accents, gradient text, colored side-stripe borders, identical card grids, hero-metric layouts.

**Design principles**: (1) calm over clever, (2) warm never cold, (3) the journal is the hero — typography and reading comfort first, (4) delight is earned and rare (respect `prefers-reduced-motion`), (5) sensible accessibility — readable contrast, visible focus states, real labels, reduced-motion fallbacks (no formal WCAG target).
