---
name: subscription-feature-gating
overview: Introduce subscription-based feature gating built on a single code-config entitlement policy in packages/shared. v1 gates exactly one action — personalized prompt regeneration becomes Pro-only (initial generation stays free for everyone across all categories) — enforced by a reusable Express middleware and surfaced as a visible-but-locked refresh button on the client.
todos:
  - id: shared-policy
    content: Add packages/shared/src/entitlements.ts (Plan, ACTIVE_SUBSCRIPTION_STATUSES, resolvePlan, feature policy map, can()) and re-export from the shared barrel.
    status: pending
  - id: refactor-resolver
    content: Refactor apps/api billing.helpers.ts and apps/web api.ts to derive plan/active-status from the shared resolver; keep existing exported signatures and tests green.
    status: pending
  - id: api-error
    content: Add UpgradeRequiredError (402, code='upgrade_required', feature) and extend error-middleware to serialize code/feature.
    status: pending
  - id: api-middleware
    content: Add requireEntitlement(feature) middleware (resolves app user + subscription, admin bypass, throws UpgradeRequiredError) and apply it to POST /prompts/personalized/regenerate; leave initial generate ungated.
    status: pending
  - id: client-gate
    content: Add useIsPro() hook and lock the PromptsSidebar refresh button for non-Pro users (disabled + tooltip, no API call, no navigation).
    status: pending
  - id: client-safety-net
    content: Surface error code in web api.ts request() (fix error-body parsing) and show a quiet upgrade toast on a stray 402.
    status: pending
  - id: adr
    content: Write docs/adr/0002-subscription-feature-gating.md.
    status: pending
  - id: tests
    content: Add shared can()/resolvePlan tests and API middleware + regenerate-route tests (402 for Free, success for Pro/admin).
    status: pending
isProject: false
---

## Subscription Feature Gating

Documentation has been captured during grilling: [CONTEXT.md](CONTEXT.md) holds the resolved vocabulary (Plan, Pro/Free, Entitlement, Capability gate, and the deferred Quota/Cap/Period terms). This plan also adds an ADR.

### Model (decided)

- **Source of truth:** a single typed policy in `packages/shared` (deploy to change, no DB/admin UI).
- **Plan resolution:** `Pro = subscription status active|trialing`; everything else `Free`; `isAdmin` bypasses all gates. Centralized in shared so server and client agree.
- **v1 gate:** `prompts.regenerate` is a **capability gate** (Pro-only). The **initial** generation (`getOrCreate`, all 4 categories) stays free for everyone. No usage counter, no daily reset in v1.
- **Denial:** HTTP `402` + `{ error, code: 'upgrade_required', feature }`.
- **Client:** refresh button stays visible but locked for non-Pro, with a tooltip; **no navigation** to upgrade on click. 402 is a safety net.

```mermaid
flowchart LR
  click["Free user clicks refresh"] --> ui["PromptsSidebar (useIsPro)"]
  ui -->|"not Pro"| locked["Locked button + tooltip, no API call"]
  ui -->|"Pro/Admin"| call["POST /prompts/personalized/regenerate"]
  call --> mw["requireEntitlement('prompts.regenerate')"]
  mw -->|"allowed"| svc["promptsService.regenerateForEntry"]
  mw -->|"denied (safety net)"| err["402 upgrade_required"]
```



### 1. Shared entitlement policy (single source of truth)

New `packages/shared/src/entitlements.ts`:

- `export type Plan = 'free' | 'pro'`
- `export const ACTIVE_SUBSCRIPTION_STATUSES = ['active','trialing'] as const` (canonical; remove duplicates elsewhere)
- `resolvePlan(status: string | null | undefined): Plan`
- Feature keys + policy map, e.g. `{ 'prompts.regenerate': { requires: 'pro' } }`, shaped so future `quota`/`cap` entitlements slot in without new plumbing.
- `can(plan: Plan, feature: FeatureKey, opts?: { isAdmin?: boolean }): boolean`

Re-export from the package barrel [packages/shared/src/types/index.ts](packages/shared/src/types/index.ts) (`export * from '../entitlements'`) so `@starter/shared` resolves it.

### 2. Refactor existing plan logic onto shared

- [apps/api/.../billing.helpers.ts](apps/api/src/features/subscriptions/helpers/billing.helpers.ts): import `ACTIVE_SUBSCRIPTION_STATUSES` / make `isActiveSubscriptionStatus` delegate to shared `resolvePlan`.
- [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts): `isActiveSubscription` delegates to shared `resolvePlan` (keep the existing exported signature).
- Keep existing tests in `billing.helpers.test.ts` green.

### 3. API enforcement

- New `UpgradeRequiredError` (statusCode `402`, carries `code='upgrade_required'` + `feature`) in `apps/api/src/lib/errors/` + export from its `index.ts`. Add an optional `code`/`feature` to `AppError`.
- Extend [error-middleware.ts](apps/api/src/middleware/error-middleware.ts) to serialize `code` and `feature` when present (backward-compatible).
- New `requireEntitlement(feature)` middleware in `apps/api/src/middleware/`: resolves app user via `appUsersService.findOrCreate`, loads subscription via `subscriptionsService.getByAppUserId`, computes `resolvePlan`, allows admins, throws `UpgradeRequiredError` when `!can(...)`.
- Apply it on the regenerate route in [prompts/routes.ts](apps/api/src/features/prompts/routes.ts): `router.post('/personalized/regenerate', AuthMiddleware(), requireEntitlement('prompts.regenerate'), validateBody(...), handler)`. Leave `/personalized` (initial generate) ungated.

### 4. Client gating UX

- New `useIsPro()` hook in `apps/web/src/hooks/api/` deriving from `useSubscriptionQuery` (+ `useGetMeQuery().isAdmin`) via shared `resolvePlan`/`can`.
- [PromptsSidebar.tsx](apps/web/src/components/sidebar/PromptsSidebar.tsx): when not Pro, render the refresh button disabled with a tooltip ("Refreshing prompts is a Pro feature"); do not fire the mutation and do not navigate.
- Safety net: in [api.ts `request()](apps/web/src/lib/api.ts)` surface `code` from error bodies (also fixes the latent `{error}` vs `.message` mismatch) so a stray 402 can show a quiet upgrade toast.

### 5. Docs

- Add `docs/adr/0002-subscription-feature-gating.md`: code-config policy in shared, capability-gate model for v1, 402 denial, and the deliberate deferral of the Quota/Cap counter system.

### 6. Tests

- Shared: `can()` / `resolvePlan()` unit tests (free vs pro vs admin).
- API: `requireEntitlement` middleware test + a prompts regenerate route test asserting 402 for Free and success for Pro/admin.

### Out of scope (v1)

Usage-counter table, daily Quotas, memory Caps, AI-title gating, and any rewrite of UpgradePage marketing copy. The policy module is structured to add these later by adding entries, not plumbing.