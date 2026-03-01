# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Origin

This repo is a ground-up rewrite of `~/repos/june-bug` — the original JuneBug journaling app built on Convex. The v2 stack replaces Convex with Express + Postgres + Drizzle + Better Auth. If asked about original design decisions, prior behavior, or reference implementations, consult `~/repos/june-bug`.

## Package Manager

This project uses **pnpm** workspaces. Always use `pnpm` instead of `npm`.

## Commands

Run from the **repo root** unless otherwise noted:

- `pnpm dev` — Start both frontend (`:5173`) and backend (`:3000`) in parallel
- `pnpm type-check` — Type check all packages
- `pnpm test` — Run all tests across workspaces
- `pnpm build` — Build all packages
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
- `RABBITMQ_URL` — Background jobs
- `RESEND_API_KEY` — Email

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
