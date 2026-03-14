---
name: ai-queue-visibility
overview: Add internal observability for per-user AI usage and queue health by instrumenting the backend, exposing protected ops endpoints, and adding an authenticated internal dashboard.
todos:
  - id: design-observability-schema
    content: Design DB tables and event model for AI usage and queue/job lifecycle history.
    status: completed
  - id: instrument-ai-service
    content: Instrument AI service calls with per-user usage, latency, model, and status capture.
    status: completed
  - id: instrument-queue-lifecycle
    content: Track publish/consume/retry/DLQ/job outcomes for the memory queue and expose queue health.
    status: completed
  - id: add-internal-observability-api
    content: Add protected backend observability endpoints with internal-only authorization.
    status: completed
  - id: build-internal-dashboard
    content: Add an authenticated internal dashboard page for AI usage and queue visibility.
    status: completed
isProject: false
---

# AI And Queue Visibility

## Goal

Give the app internal visibility into:

- per-user AI usage
- recent AI activity and failures
- queue health, retries, DLQ state, and worker status

## Current insertion points

- AI calls are centralized in [apps/api/src/lib/ai/ai.service.ts](apps/api/src/lib/ai/ai.service.ts), which currently makes live model calls but does not persist usage, latency, tokens, or failures.
- Queue publishing/processing is centralized in [apps/api/src/features/memories/memory-pipeline.service.ts](apps/api/src/features/memories/memory-pipeline.service.ts), [apps/api/src/lib/queue/rabbitmq.ts](apps/api/src/lib/queue/rabbitmq.ts), and [apps/api/src/workers/memory-worker.ts](apps/api/src/workers/memory-worker.ts).
- The frontend already has an authenticated app surface and sidebar patterns in [apps/web/src/App.tsx](apps/web/src/App.tsx) and [apps/web/src/components/sidebar/EntriesSidebar.tsx](apps/web/src/components/sidebar/EntriesSidebar.tsx), but no admin/internal page yet.

## Implementation plan

### 1. Add backend observability storage

Create dedicated DB models for AI activity and queue/job visibility instead of overloading `memory_events`.

Planned backend entities:

- `ai_usage_events`
  - app user id
  - feature name (`entry_title`, `personalized_prompts`, future AI features)
  - model
  - request status (`success`, `error`, `fallback`)
  - latency
  - token/cost metadata when available
  - lightweight request context (`entryId`, `focusCategory`)
  - created at
- `queue_job_events` or `queue_job_runs`
  - queue/job type (`memory.entry.changed`)
  - job id
  - app user id
  - entry id
  - status (`published`, `processing`, `retrying`, `completed`, `failed`, `dead_lettered`, `skipped`)
  - retry count
  - outcome/reason
  - timestamps

Files likely touched:

- [apps/api/src/lib/db/schema.ts](apps/api/src/lib/db/schema.ts)
- new feature files under `apps/api/src/features/observability/`
- Drizzle migration files under `apps/api/src/lib/db/drizzle/`

### 2. Instrument AI calls at the service boundary

Wrap the existing AI entry points in [apps/api/src/lib/ai/ai.service.ts](apps/api/src/lib/ai/ai.service.ts) so every call emits a usage event with enough context to answer:

- which user used AI
- which feature triggered it
- whether it succeeded, failed, or fell back
- how long it took
- which model was used

Use service-boundary instrumentation so both current AI features are covered without duplicating logic in routes/services:

- title generation from [apps/api/src/features/entries/entries.service.ts](apps/api/src/features/entries/entries.service.ts)
- personalized prompts from [apps/api/src/features/prompts/prompts.service.ts](apps/api/src/features/prompts/prompts.service.ts)

### 3. Add queue/job lifecycle tracking

Instrument both publish and consume paths so the system can show current and recent queue behavior.

Track at least:

- publish accepted / publish skipped when RabbitMQ is disabled
- worker started processing
- retry scheduled with retry count
- completed
- validation failure
- dead-lettered
- skipped outcomes already produced by the memory pipeline (`idempotent-duplicate`, `stale-update`, `no-entry-text`, `no-candidates`)

Primary code paths:

- [apps/api/src/features/memories/memory-pipeline.service.ts](apps/api/src/features/memories/memory-pipeline.service.ts)
- [apps/api/src/workers/memory-worker.ts](apps/api/src/workers/memory-worker.ts)
- [apps/api/src/lib/queue/rabbitmq.ts](apps/api/src/lib/queue/rabbitmq.ts)

Also add a small queue health service that can report:

- whether RabbitMQ is configured
- whether the worker is healthy/recently active
- current queue and DLQ message counts if broker inspection is available
- recent retries/failures from the app DB even when broker metrics are limited

### 4. Expose protected internal observability endpoints

Add backend endpoints for a future internal page rather than binding UI directly to raw tables.

Suggested endpoints:

- `GET /api/internal/observability/ai/overview`
- `GET /api/internal/observability/ai/events`
- `GET /api/internal/observability/queues/overview`
- `GET /api/internal/observability/queues/jobs`

Response shape should support:

- aggregate summaries for cards/charts
- recent event lists
- filtering by user, feature, status, date range

Because the repo has no real admin authorization yet, include a small internal-access guard as part of this work rather than exposing these routes to all authenticated users.

### 5. Add an authenticated internal dashboard page

Add a protected internal page in `apps/web` that consumes the new endpoints and gives one-screen visibility.

Recommended first-page sections:

- AI overview cards: total calls, unique users, success rate, fallback/error rate, last 24h
- AI recent activity table: user, feature, model, status, latency, timestamp
- Queue overview cards: queue enabled, pending count, DLQ count, retry rate, recent failures
- Queue recent jobs table: job id, user/entry, status, retry count, outcome, timestamp

Frontend insertion points:

- route in [apps/web/src/App.tsx](apps/web/src/App.tsx)
- nav entry near settings/sidebar in [apps/web/src/components/sidebar/EntriesSidebar.tsx](apps/web/src/components/sidebar/EntriesSidebar.tsx)
- new page/hooks/api client files under `apps/web/src/pages/` and `apps/web/src/hooks/api/`

## Scope decisions for v1

- Internal only; no PostHog integration in the first pass.
- Focus on the existing memory queue and current AI features only.
- Prefer DB-backed recent-history visibility plus lightweight broker health, not a full-blown metrics platform.
- Build the API layer first so the UI stays thin.

## Risks to account for

- `ai.service.ts` currently checks `AI_GATEWAY_API_KEY`, while env validation only models `OPENAI_API_KEY`; this should be reconciled during instrumentation work so observability reflects real runtime behavior.
- The app does not currently have an admin-role enforcement pattern, so internal-route authorization needs an explicit first-pass decision.
- RabbitMQ queue-depth visibility may require broker inspection support in addition to DB event history; if broker inspection is not practical, the dashboard should clearly distinguish broker counts from app-recorded lifecycle events.
