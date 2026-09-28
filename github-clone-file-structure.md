# GitHub Clone — File Structure

Companion to `github-clone-plan.md`. This document defines the repository layout, what each folder owns, and the rules that keep the codebase consistent.

**Approach:** a single TypeScript monorepo (pnpm workspaces) with three packages: the web app, the API, and shared types. No microservices.

---

## 1. Top-Level Layout

```
gitclone/
├── apps/
│   ├── web/                    # React + Vite SPA (frontend)
│   └── api/                    # Node + Hono backend
├── packages/
│   └── shared/                 # Types, schemas, constants used by both apps
├── infra/
│   ├── docker-compose.yml      # Local Postgres + Redis
│   ├── fly.toml                # Backend deploy config (or railway.json)
│   └── Dockerfile.api
├── docs/
│   ├── github-clone-plan.md
│   ├── github-clone-file-structure.md
│   └── runbooks/               # Token rotation, incident notes, deploy steps
├── scripts/                    # One-off dev scripts (seed, smoke test, key generation)
├── .github/
│   └── workflows/ci.yml        # Lint, typecheck, test, build
├── .env.example
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md
```

---

## 2. Frontend — `apps/web`

```
apps/web/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx                        # App bootstrap, providers
    ├── App.tsx
    ├── router.tsx                      # Route table, route-level code splitting
    │
    ├── app/
    │   ├── providers/
    │   │   ├── QueryProvider.tsx       # TanStack Query + IndexedDB persister
    │   │   ├── AuthProvider.tsx        # Session state (/api/me)
    │   │   └── RealtimeProvider.tsx    # SSE connection, cache patching
    │   └── layout/
    │       ├── AppShell.tsx
    │       ├── Sidebar.tsx
    │       └── TopBar.tsx
    │
    ├── features/                       # One folder per product feature
    │   ├── auth/
    │   │   ├── ConnectPage.tsx         # OAuth button + PAT entry
    │   │   ├── PatForm.tsx
    │   │   ├── ReconnectBanner.tsx     # 401 / missing-permission prompts
    │   │   └── api.ts
    │   ├── repos/
    │   │   ├── RepoListPage.tsx
    │   │   ├── RepoOverviewPage.tsx
    │   │   ├── CreateRepoDialog.tsx
    │   │   ├── DeleteRepoDialog.tsx    # Type-the-name-to-confirm
    │   │   ├── hooks.ts                # useRepos, useRepo, useDeleteRepo (optimistic)
    │   │   └── api.ts
    │   ├── files/
    │   │   ├── FileTree.tsx            # Virtualized
    │   │   ├── FileViewer.tsx          # Shiki highlighting
    │   │   ├── FileEditor.tsx          # Monaco, lazy-loaded
    │   │   ├── CommitDialog.tsx
    │   │   ├── DeleteFileDialog.tsx
    │   │   ├── DeleteFolderDialog.tsx  # Shows list of files to be removed
    │   │   ├── hooks.ts
    │   │   └── api.ts
    │   ├── branches/
    │   │   ├── BranchList.tsx
    │   │   ├── BranchSwitcher.tsx
    │   │   ├── hooks.ts
    │   │   └── api.ts
    │   ├── commits/
    │   │   ├── CommitList.tsx          # Virtualized
    │   │   ├── CommitDiffPage.tsx
    │   │   ├── DiffViewer.tsx          # Lazy per-file diffs
    │   │   ├── hooks.ts
    │   │   └── api.ts
    │   ├── pulls/
    │   │   ├── PullListPage.tsx
    │   │   ├── PullDetailPage.tsx
    │   │   ├── CreatePullDialog.tsx
    │   │   ├── ReviewPanel.tsx
    │   │   ├── MergeButton.tsx         # merge / squash / rebase
    │   │   ├── hooks.ts
    │   │   └── api.ts
    │   ├── issues/
    │   │   ├── IssueListPage.tsx
    │   │   ├── IssueDetailPage.tsx
    │   │   ├── CreateIssueDialog.tsx
    │   │   ├── hooks.ts
    │   │   └── api.ts
    │   ├── notifications/
    │   │   ├── InboxPage.tsx
    │   │   ├── hooks.ts
    │   │   └── api.ts
    │   ├── audit/
    │   │   └── AuditLogPage.tsx        # Week 5
    │   └── ai/                         # Week 5, behind a feature flag
    │       ├── PrSummaryPanel.tsx
    │       └── CommitMessageSuggest.tsx
    │
    ├── components/                     # Shared, feature-agnostic UI
    │   ├── ui/                         # Button, Dialog, Input, Toast, Skeleton
    │   ├── Markdown.tsx                # Sanitized Markdown renderer (XSS-safe)
    │   ├── ConfirmDialog.tsx
    │   ├── RateLimitBanner.tsx
    │   └── GithubDegradedBanner.tsx
    │
    ├── lib/
    │   ├── http.ts                     # fetch wrapper: credentials, CSRF header, error mapping
    │   ├── queryClient.ts              # Query defaults (staleTime, gcTime)
    │   ├── persister.ts                # IndexedDB persistence for the query cache
    │   ├── prefetch.ts                 # Hover/focus intent prefetching
    │   ├── optimistic.ts               # Helpers: apply, rollback
    │   ├── realtime.ts                 # SSE client, event → query invalidation/patch
    │   └── errors.ts                   # Typed errors (AuthExpired, MissingPermission, RateLimited)
    │
    ├── styles/
    │   └── globals.css
    └── test/
        └── setup.ts
```

**Rules for `apps/web`:**
- The browser never sees a GitHub token and never calls `api.github.com`. It only calls `/api/*`.
- Each feature owns its `api.ts` (raw calls) and `hooks.ts` (TanStack Query hooks). Components import hooks, not `api.ts`.
- Optimistic mutations live in `hooks.ts` and must implement rollback.
- Monaco and heavy diff code are loaded with dynamic `import()` only.

---

## 3. Backend — `apps/api`

```
apps/api/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
└── src/
    ├── index.ts                        # Server entry (Node adapter)
    ├── app.ts                          # Hono app: middleware + route mounting
    ├── config/
    │   ├── env.ts                      # Zod-validated environment variables
    │   └── constants.ts
    │
    ├── middleware/
    │   ├── session.ts                  # Cookie session → user
    │   ├── requireAuth.ts
    │   ├── csrf.ts                     # CSRF protection on writes
    │   ├── rateLimit.ts                # Per-user limiter for our own API
    │   ├── errorHandler.ts             # Maps gateway errors → HTTP responses
    │   ├── securityHeaders.ts          # CSP, HSTS, etc.
    │   └── requestLog.ts               # Structured logs, token redaction
    │
    ├── routes/                         # Thin: validate input, call a service, return
    │   ├── auth.routes.ts              # /api/auth/*
    │   ├── me.routes.ts
    │   ├── repos.routes.ts
    │   ├── files.routes.ts             # file + folder + tree
    │   ├── branches.routes.ts
    │   ├── commits.routes.ts
    │   ├── pulls.routes.ts
    │   ├── issues.routes.ts
    │   ├── notifications.routes.ts
    │   ├── stream.routes.ts            # SSE /api/stream
    │   └── webhooks.routes.ts          # /api/webhooks/github
    │
    ├── services/                       # Business logic. Only layer that talks to the gateway.
    │   ├── auth/
    │   │   ├── pat.service.ts          # Validate (GET /user), encrypt, store
    │   │   ├── oauth.service.ts        # Device flow / GitHub App flow, refresh
    │   │   ├── fallback.service.ts     # Decides when to prompt reconnect
    │   │   └── session.service.ts
    │   ├── repos.service.ts
    │   ├── files.service.ts            # includes deleteFile
    │   ├── folder-delete.service.ts    # Git Data API: tree → commit → ref, single commit
    │   ├── branches.service.ts
    │   ├── commits.service.ts
    │   ├── pulls.service.ts
    │   ├── issues.service.ts
    │   ├── notifications.service.ts
    │   ├── audit.service.ts            # Writes audit_log for every write action
    │   └── ai/                         # Later
    │       ├── pr-summary.service.ts
    │       └── commit-message.service.ts
    │
    ├── github/                         # GitHub gateway (the ONLY place that calls GitHub)
    │   ├── client.ts                   # getGithubClient(userId): Promise<Octokit>
    │   ├── graphql/
    │   │   ├── queries.ts              # Batched read queries
    │   │   └── fragments.ts
    │   ├── rest.ts                     # Write helpers
    │   ├── etag.ts                     # If-None-Match handling, 304 → cached body
    │   ├── retry.ts                    # Backoff for idempotent reads; never for writes
    │   ├── rateLimit.ts                # Reads X-RateLimit-*, Retry-After
    │   ├── permissions.ts              # Feature → required scope/permission map
    │   └── errors.ts                   # Maps 401/403/404/409/422/5xx to typed errors
    │
    ├── security/
    │   ├── crypto.ts                   # AES-256-GCM encrypt/decrypt
    │   ├── vault.ts                    # Store/load credentials, rotate encryption key
    │   ├── webhookSignature.ts         # Verify X-Hub-Signature-256 (timing-safe)
    │   └── redact.ts                   # Strip tokens from logs and error output
    │
    ├── cache/
    │   ├── redis.ts                    # Connection
    │   ├── keys.ts                     # user:endpoint:params key builder
    │   ├── cache.ts                    # get/set with ETag, TTL, invalidate by tag
    │   └── invalidation.ts             # Webhook event → affected cache keys
    │
    ├── realtime/
    │   ├── hub.ts                      # Per-user SSE connections
    │   └── events.ts                   # Event types pushed to clients
    │
    ├── jobs/
    │   ├── queue.ts                    # BullMQ setup
    │   ├── worker.ts                   # Worker entry (can run in the same process at first)
    │   ├── prefetch.job.ts
    │   ├── pat-sync.job.ts             # Periodic sync for PAT users (no webhooks)
    │   └── credential-check.job.ts     # Re-validate tokens, flag expired ones
    │
    ├── db/
    │   ├── client.ts
    │   ├── schema/
    │   │   ├── users.ts
    │   │   ├── credentials.ts
    │   │   ├── sessions.ts
    │   │   ├── audit-log.ts
    │   │   ├── settings.ts
    │   │   └── webhook-deliveries.ts
    │   └── migrations/                 # Generated by drizzle-kit
    │
    └── test/
        ├── unit/
        ├── integration/                # Against test Postgres + Redis
        └── fixtures/                   # Recorded GitHub API responses
```

**Rules for `apps/api`:**
- **Layering:** `routes → services → github gateway`. Routes never call GitHub directly, and services never import Octokit directly; they go through `github/client.ts`.
- `getGithubClient(userId)` is the single entry point for authenticated GitHub access, and it hides whether the credential is OAuth or PAT.
- Every write service calls `audit.service.ts` (success and failure).
- Destructive routes (`DELETE` repo, folder, file) require a confirmation token in the request body, and the service checks `permissions.ts` before calling GitHub.
- Logging passes through `redact.ts`; tokens must never appear in logs, errors, or traces.

---

## 4. Shared Package — `packages/shared`

```
packages/shared/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── schemas/                        # Zod schemas: request/response contracts
    │   ├── auth.ts
    │   ├── repos.ts
    │   ├── files.ts
    │   ├── pulls.ts
    │   ├── issues.ts
    │   └── notifications.ts
    ├── types/
    │   ├── github.ts                   # Trimmed GitHub types we actually use
    │   └── realtime.ts                 # SSE event payloads
    ├── permissions.ts                  # Feature → permission names (used by UI hints)
    └── constants.ts
```

The API validates requests with these schemas and the web app derives its types from them, so the contract is defined once.

---

## 5. Environment Variables (`.env.example`)

```
# App
NODE_ENV=development
APP_URL=http://localhost:5173
API_URL=http://localhost:8787
SESSION_SECRET=

# Database and cache
DATABASE_URL=postgres://gitclone:gitclone@localhost:5432/gitclone
REDIS_URL=redis://localhost:6379

# Token vault (32-byte key, base64)
TOKEN_ENCRYPTION_KEY=

# GitHub OAuth / GitHub App
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=

# AI (later)
AI_PROVIDER_API_KEY=
FEATURE_AI=false
```

Rules: `.env` is git-ignored, and `env.ts` fails fast at startup if a required variable is missing or malformed.

---

## 6. Scripts (root `package.json`)

| Script | Purpose |
|---|---|
| `pnpm dev` | Run web and api together |
| `pnpm dev:infra` | `docker compose up` for Postgres + Redis |
| `pnpm db:generate` | Generate a migration from schema changes |
| `pnpm db:migrate` | Apply migrations |
| `pnpm lint` / `pnpm typecheck` | Static checks across all packages |
| `pnpm test` | Unit and integration tests |
| `pnpm build` | Build web (static) and api |

---

## 7. Where Each Plan Feature Lives

| Feature (from the plan) | Frontend | Backend |
|---|---|---|
| PAT + OAuth, fallback | `features/auth` | `services/auth/*`, `github/client.ts`, `security/vault.ts` |
| Delete file / folder / repo | `features/files`, `features/repos` | `services/files.service.ts`, `folder-delete.service.ts`, `repos.service.ts` |
| Caching and ETags | `lib/persister.ts`, `lib/queryClient.ts` | `cache/*`, `github/etag.ts` |
| Optimistic updates | `features/*/hooks.ts`, `lib/optimistic.ts` | n/a |
| Real-time updates | `lib/realtime.ts`, `RealtimeProvider` | `routes/webhooks.routes.ts`, `cache/invalidation.ts`, `realtime/*` |
| PAT users' periodic sync | n/a | `jobs/pat-sync.job.ts` |
| Rate-limit handling | `RateLimitBanner.tsx` | `github/rateLimit.ts`, `github/retry.ts` |
| Audit log | `features/audit` | `services/audit.service.ts`, `db/schema/audit-log.ts` |
| AI assistant (later) | `features/ai` | `services/ai/*` |

---

## 8. Build Order Mapped to the Structure

| Week | Create first |
|---|---|
| 1 | Monorepo scaffold, `config/env.ts`, `db/schema/*`, `security/crypto.ts` + `vault.ts`, `services/auth/*`, `github/client.ts`, `routes/auth` + `me` + `repos` (list), `features/auth`, `features/repos` (list) |
| 2 | `services/files`, `branches`, `commits`, `features/files`, `branches`, `commits` |
| 3 | `services/pulls`, `issues`, `folder-delete.service.ts`, delete dialogs, `audit.service.ts` |
| 4 | `cache/*`, `github/etag.ts`, `lib/persister.ts`, `lib/optimistic.ts`, `webhooks.routes.ts`, `realtime/*`, `jobs/*`, notifications |
| 5 | `services/ai/*`, `features/ai`, `features/audit`, polish and demo flow |
