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
    ├── router/
    │   └── AppRouter.tsx               # Route table & navigation
    │
    ├── providers/
    │   ├── QueryProvider.tsx           # TanStack Query + IndexedDB persister
    │   ├── AuthProvider.tsx            # Session state (/api/me)
    │   └── RealtimeProvider.tsx        # SSE connection, cache patching
    │
    ├── features/                       # One folder per product feature
    │   ├── auth/                       # Login & PAT connect
    │   ├── repos/                      # Repository list, details, creation, deletion
    │   ├── files/                      # File tree, file viewing & editing
    │   ├── branches/                   # Branch listing, creation, deletion
    │   ├── commits/                    # Commit history & diff views
    │   ├── pulls/                      # Pull requests list, creation, review, merge
    │   ├── issues/                     # Issue list, creation, details
    │   ├── notifications/              # Notifications inbox
    │   ├── audit/                      # Audit log page
    │   └── ai/                         # Commit message & PR summary generation
    │
    ├── components/                     # Shared, feature-agnostic UI
    │   └── ui/                         # ConfirmDialog, Banners, Markdown
    │
    ├── lib/
    │   ├── http.ts                     # fetch wrapper: credentials, CSRF header, error mapping
    │   ├── queryClient.ts              # Query defaults (staleTime, retry policies)
    │   ├── persister.ts                # IndexedDB persistence for the query cache
    │   ├── optimistic.ts               # Helpers: apply, rollback
    │   ├── realtime.ts                 # SSE client, event → query invalidation
    │   └── errors.ts                   # Typed errors
    │
    └── styles/
        └── globals.css
```

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
    │   ├── webhooks.routes.ts          # /api/webhooks/github
    │   └── ai.routes.ts
    │
    ├── services/                       # Business logic. Only layer that talks to the gateway.
    │   ├── auth/
    │   │   ├── pat.service.ts          # Validate (GET /user), encrypt, store
    │   │   ├── oauth.service.ts        # Device flow / OAuth flow
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
    │   └── ai/
    │       ├── pr-summary.service.ts
    │       └── commit-message.service.ts
    │
    ├── github/                         # GitHub gateway (the ONLY place that calls GitHub)
    │   ├── client.ts                   # getGithubClient(userId): Promise<Octokit>
    │   ├── etag.ts                     # ETag caching
    │   ├── retry.ts                    # Backoff for idempotent reads
    │   ├── rateLimit.ts                # Rate limit handling
    │   ├── permissions.ts              # Feature → required scope/permission map
    │   └── errors.ts                   # Maps 401/403/404/409/422/5xx to typed errors
    │
    ├── security/
    │   ├── crypto.ts                   # AES-256-GCM encrypt/decrypt
    │   ├── vault.ts                    # Store/load credentials
    │   ├── webhookSignature.ts         # Verify X-Hub-Signature-256 (timing-safe)
    │   └── redact.ts                   # Strip tokens from logs and error output
    │
    ├── cache/
    │   ├── redis.ts                    # Connection
    │   ├── keys.ts                     # user:endpoint:params key builder
    │   ├── cache.ts                    # get/set with ETag, TTL
    │   └── invalidation.ts             # Webhook event → affected cache keys
    │
    ├── realtime/
    │   ├── hub.ts                      # Per-user SSE connections
    │   └── events.ts                   # Event types pushed to clients
    │
    ├── jobs/
    │   ├── queue.ts                    # BullMQ setup
    │   ├── worker.ts                   # Worker entry
    │   ├── prefetch.job.ts
    │   └── pat-sync.job.ts             # Periodic sync for PAT users
    │
    ├── db/
    │   ├── client.ts
    │   ├── schema.ts
    │   ├── schema/
    │   │   ├── index.ts
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
        └── integration/
```

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
    │   ├── github.ts                   # Trimmed GitHub types
    │   └── realtime.ts                 # SSE event payloads
    ├── permissions.ts                  # Feature → permission names
    └── constants.ts
```
