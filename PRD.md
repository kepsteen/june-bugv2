# PRD: JuneBug MVP — Developer Journaling with AI Memory & Prompts

## Problem Statement

Developers struggle to maintain a consistent journaling habit that actually improves their work. General-purpose tools like Notion, Obsidian, and Day One are either too structured, too freeform, or completely disconnected from the context of being a developer. Most importantly, they have no memory — every session starts from scratch, with no awareness of your goals, recent wins, or ongoing blockers.

JuneBug solves this by combining frictionless daily journaling (one entry per day, Markdown-first editor) with an AI memory layer that learns about you over time and uses that knowledge to surface prompts that are actually meaningful — not generic.

## Solution

A web-first, mobile-responsive journaling app for developers that:

1. **Provides a fast, familiar Markdown editing experience** — free-form writing without the complexity of a block editor, closer to what developers already use (Obsidian, GitHub, README files).
2. **Learns from your writing over time** — a memory pipeline extracts long-lived facts (your stack, current projects, recurring goals and blockers) and persists them.
3. **Surfaces those memories as personalized prompts on demand** — four structured focus areas (goal, win, blocker, learning) seeded by what JuneBug knows about you.
4. **Automatically generates an entry title** — after enough writing, AI names the entry so you never have to.
5. **Degrades gracefully** — basic journaling always works; AI features require a paid plan.

## User Stories

### Onboarding
1. As a new developer user, I want to complete a short onboarding questionnaire, so that JuneBug can personalize my prompts from day one.
2. As a new user, I want to tell JuneBug my role, tech stack, and journaling habits, so that the prompts feel relevant to my work immediately.
3. As a user, I want onboarding to feel conversational and low-friction, so that I don't abandon setup before reaching the editor.

### Daily Journaling
4. As a developer, I want one entry automatically created for today when I open the app, so that I can start writing immediately without any setup.
5. As a developer, I want to write in Markdown, so that formatting feels natural and familiar.
6. As a developer, I want my entry to auto-save as I type, so that I never lose work.
7. As a developer, I want to navigate between past entries in a sidebar, so that I can review what I wrote on previous days.
8. As a developer, I want to delete an entry I no longer need, so that I can keep my journal clean.
9. As a developer, I want to search my past entries, so that I can quickly find context I wrote about before.

### AI Titles
10. As a developer, I want JuneBug to automatically generate a title for my entry after I've written enough, so that I don't have to name each entry manually.
11. As a developer, I want to keep the AI-generated title or dismiss it if it's wrong, so that I retain control over my entry names.

### Prompts
12. As a developer, I want to open a prompts panel on demand, so that I can get writing inspiration without it cluttering my editing experience.
13. As a developer, I want prompts organized around four focus areas (goal, win, blocker, learning), so that I'm reminded to reflect on what matters most.
14. As a developer, I want prompts to be personalized based on what JuneBug knows about me, so that they feel relevant rather than generic.
15. As a developer, I want to dismiss or act on individual prompts, so that I can integrate them into my writing naturally.
16. As a developer, I want prompts to work even when AI is unavailable, so that the experience doesn't break.

### Memory
17. As a developer, I want JuneBug to quietly extract and remember facts about me as I write (my current projects, goals, recurring blockers), so that future prompts are grounded in my actual context.
18. As a developer, I want to view what JuneBug remembers about me in Settings, so that I understand how my experience is being personalized.
19. As a developer, I want to delete individual memories in Settings, so that I can correct things JuneBug got wrong.
20. As a developer, I want memories to be visible but read-only at MVP, so that there's transparency without over-engineering memory management at launch.

### Auth & Account
21. As a new user, I want to sign up with email and password, so that I can create an account quickly.
22. As a user, I want to sign in with GitHub, so that I don't have to manage another password.
23. As a user, I want to access my settings to update my profile and preferences, so that I can keep my account up to date.

### Free vs. Paid
24. As a free user, I want to journal with the Markdown editor, save entries, and search past entries, so that I get real value without paying.
25. As a free user, I want to understand what AI features I'm missing, so that I can decide whether a paid plan is worth it.
26. As a paid user, I want AI-generated titles, personalized prompts, and the memory system, so that my journaling experience is meaningfully enhanced by AI.

### Mobile / Responsive
27. As a developer on my phone, I want the editor and sidebar to be usable on a small screen, so that I can journal from anywhere.
28. As a mobile user, I want touch-friendly tap targets and readable text, so that the experience feels native even in a web browser.

### Internal / Admin
29. As an admin, I want to see AI usage metrics, queue job statuses, and platform stats, so that I can monitor health and costs in production.

## Implementation Decisions

### Editor Migration: Block Editor → Markdown
- **Current state:** Tiptap v3 with slash commands, bubble menu, and block-style editing.
- **Target state:** A free-form Markdown editor experience. Options to evaluate: continue using Tiptap but configured as a Markdown-first editor (Tiptap supports Markdown-style input rules), or migrate to a dedicated Markdown editor (e.g. CodeMirror with markdown mode, or `@uiw/react-md-editor`).
- **Prompt integration:** Since there are no longer slash command placeholders, prompts must be surfaced through the on-demand sidebar panel only. A "copy to editor" or "insert as quote block" action on each prompt is the bridge between the prompts panel and the writing surface.
- **Storage:** Content should continue to be stored as both structured content and `plainText` for search. If staying on Tiptap, Markdown serialization is handled by `@tiptap/pm`. If switching editors, a serialization strategy for search indexing must be defined.

### Memory Pipeline
- Memory extraction is triggered on entry create/update via a RabbitMQ job (when configured) or synchronously in dev.
- For MVP, the Settings > Memories tab exposes read-only memory cards with a delete action — matching what is already partially implemented.
- Full memory editing (rename, merge, annotate) is explicitly out of scope for MVP.

### Freemium Gating
- The free tier provides: Markdown editor, unlimited entries, entry history, client-side search.
- The paid tier adds: AI title generation, personalized prompts, memory extraction and display.
- Gating logic should live in the API (server-enforced), not just the frontend. Feature flags or a `plan` field on `app_users` should control access.
- Payment infrastructure (Stripe or equivalent) is out of scope for MVP; paid features can be unlocked manually or via a waitlist mechanism initially.

### Onboarding
- Existing multi-step questionnaire writes to `app_users` (role, tech stack, journaling habits, onboarding state).
- Onboarding doubles as user segmentation data — the same fields power both prompt personalization and internal analytics.

### Auth
- Better Auth handles session management. Email/password and GitHub OAuth are the two supported providers at MVP.
- `app_users` row is lazily created on first authenticated request via `findOrCreate`.

### Responsive Design
- Web-first, with a responsive layout breakpoint that collapses the sidebar on mobile.
- No native app — progressive enhancement of the web experience.

### Search
- Client-side filtering is already implemented in `SearchDialog`.
- Server-side semantic search endpoint exists (`/api/entries/search`) but is not prominently wired to the UI; this can be deferred post-MVP.

## Testing Decisions

**What makes a good test:** Tests should validate external behavior — the contract between a module's public interface and its callers — not internal implementation details. Tests should not assert on private methods, internal state, or the specific sequence of function calls.

**Modules to test:**

- **Memory service** — unit tests for extraction logic, merge/archive rules, and the interface between the worker and the DB. This is the highest-value test target because the memory pipeline has complex branching logic that is hard to exercise manually.
- **Entries service** — integration tests for the `createOrGetByDate` idempotency contract and the plainText extraction used for search.
- **Auth middleware** — existing pattern already tests `AuthMiddleware`; extend for plan/feature-gating middleware if added.
- **Prompt retrieval** — unit tests for the fallback heuristic path (when AI is unavailable) and the structured + semantic retrieval path.
- **Validation middleware** — already tested in `src/middleware/validate.test.ts`; use as prior art for any new route validation schemas.

**Prior art:** `apps/api/src/middleware/validate.test.ts` demonstrates the testing style and can be used as a template for new service/route tests.

## Out of Scope

- **Todos and Tags UI** — backend CRUD exists but frontend wiring is not part of MVP.
- **File uploads** — S3 stub exists but not prioritized for MVP.
- **Email notifications** — Resend env var is configured but email flows are not built.
- **Collaboration, sharing, or teams** — journaling is strictly private at MVP.
- **Native mobile apps** — responsive web only.
- **Full memory management** — editing, merging, or annotating memories is post-MVP; read + delete only at launch.
- **Semantic search in main UI** — the server-side endpoint exists but surfacing it prominently is post-MVP.
- **Payment infrastructure** — freemium gating is architected but Stripe integration is post-MVP.
- **Weekly / monthly AI summaries** — potential future feature, not part of MVP.

## Further Notes

- The shift from Tiptap block editor to Markdown is the biggest open design decision. It touches the editor component, content storage format, serialization, and how prompts are surfaced. This decision should be prototyped before the rest of the frontend work is scoped.
- The existing `~/repos/june-bug` Convex implementation is a useful reference for original UX intent and prior design decisions.
- RabbitMQ is optional — the memory pipeline degrades to synchronous processing when `RABBITMQ_URL` is not set, which is acceptable for MVP scale.
