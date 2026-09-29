# GitClone — Full Project Documentation & Setup Guide

**Repository Root:** `/mnt/c/Users/HP/Desktop/GithubApp`  
**Architecture:** TypeScript Monorepo with `pnpm` workspaces  
**Tech Stack:** React 18 + Vite (SPA) | Node.js + Hono (API) | Drizzle ORM + PostgreSQL | Redis + BullMQ | TanStack Query + IndexedDB

---

## 1. System Architecture & Core Concept

```
User ⇄ Web App (React 18 + Vite SPA) ⇄ Backend API (Hono + Node.js) ⇄ GitHub API ⇄ github.com
             │                                   │
      IndexedDB Cache                    PostgreSQL + Redis
```

### Key Architectural Principles:

1. **GitHub is the Sole Source of Truth**:
   - The local database never stores repository code, branches, issues, or pull requests.
   - It only stores users, encrypted credentials (AES-256-GCM), session tokens, audit logs, and deduplicated webhook delivery IDs.

2. **Perceived-Zero Latency & Stale-While-Revalidate**:
   - Client reads render instantly from cache (IndexedDB via TanStack Query), refreshing in the background.
   - Redis caches API responses with ETags; `304 Not Modified` responses preserve GitHub API rate limits.
   - Remote changes on GitHub trigger webhooks, which invalidate cached keys and push events via Server-Sent Events (`/api/stream`).

3. **Defense-in-Depth Token Security**:
   - Personal Access Tokens (PAT) and OAuth tokens are encrypted at rest with AES-256-GCM.
   - Tokens are never logged, exposed in error traces, or returned to the browser.
   - The browser communicates via HttpOnly, Secure, SameSite session cookies + CSRF protection headers (`x-csrf-token`).

4. **Single-Commit Atomic Folder Deletions**:
   - Deleting a folder executes an atomic tree commit via the GitHub Git Data API (`GET /git/trees` → filter → `POST /git/trees` with `sha: null` → `POST /git/commits` → `PATCH /git/refs/heads`).

---

## 2. Complete Monorepo Folder Structure

The repository is organized as a clean, single-tier TypeScript monorepo using `pnpm` workspaces:

```
GithubApp/
├── apps/
│   ├── api/                                # Node.js + Hono Backend Service
│   │   ├── src/
│   │   │   ├── config/                     # Environment validation (Zod) & constants
│   │   │   │   ├── env.ts                  # Safe process.env parsing & type inference
│   │   │   │   └── constants.ts            # Cookie names, rate limits, timeouts
│   │   │   ├── db/                         # Drizzle ORM setup & migrations
│   │   │   │   ├── client.ts               # PostgreSQL connection pool & Drizzle client
│   │   │   │   ├── schema.ts               # Unified schema exports
│   │   │   │   ├── schema/                 # Modular schema definitions
│   │   │   │   │   ├── users.ts            # User accounts
│   │   │   │   │   ├── credentials.ts      # Encrypted tokens (OAuth/PAT)
│   │   │   │   │   ├── sessions.ts         # Active sessions
│   │   │   │   │   ├── audit-log.ts        # Destructive & write action audit logs
│   │   │   │   │   ├── settings.ts         # User preferences
│   │   │   │   │   └── webhook-deliveries.ts # Webhook deduplication
│   │   │   │   └── migrations/             # Generated SQL migration files
│   │   │   ├── github/                     # GitHub Gateway (Only layer calling GitHub)
│   │   │   │   ├── client.ts               # getGithubClient(userId) with rate limit handling
│   │   │   │   ├── errors.ts               # Maps 401/403/404/409/422/5xx to typed errors
│   │   │   │   ├── etag.ts                 # ETag generation & If-None-Match support
│   │   │   │   ├── permissions.ts          # Required scopes & permission checks
│   │   │   │   ├── rateLimit.ts            # X-RateLimit-* header inspection
│   │   │   │   └── retry.ts                # Exponential backoff for idempotent reads
│   │   │   ├── security/                   # Cryptographic & hardening utilities
│   │   │   │   ├── crypto.ts               # AES-256-GCM encryption & decryption
│   │   │   │   ├── vault.ts                # Token storage & key management
│   │   │   │   ├── webhookSignature.ts     # Timing-safe HMAC-SHA256 signature verification
│   │   │   │   └── redact.ts               # Strips secrets/tokens from logs and errors
│   │   │   ├── cache/                      # Redis caching layer
│   │   │   │   ├── redis.ts                # ioredis client instance
│   │   │   │   ├── keys.ts                 # Consistent cache key generation
│   │   │   │   ├── cache.ts                # Cache read/write/invalidate
│   │   │   │   └── invalidation.ts         # Webhook event to cache key invalidation
│   │   │   ├── realtime/                   # Server-Sent Events (SSE)
│   │   │   │   ├── hub.ts                  # Per-user SSE subscriber registry & broadcast
│   │   │   │   └── events.ts               # Realtime event types & payloads
│   │   │   ├── middleware/                 # Hono middlewares
│   │   │   │   ├── session.ts              # Session extraction & validation
│   │   │   │   ├── requireAuth.ts          # 401 protection guard
│   │   │   │   ├── csrf.ts                 # CSRF protection on mutating HTTP verbs
│   │   │   │   ├── rateLimit.ts            # API rate limiter
│   │   │   │   ├── errorHandler.ts         # Global error response formatter
│   │   │   │   ├── securityHeaders.ts      # CSP, HSTS, X-Frame-Options
│   │   │   │   └── requestLog.ts           # Structured request logging with redaction
│   │   │   ├── routes/                     # HTTP route handlers
│   │   │   │   ├── auth.routes.ts          # /api/auth (PAT, OAuth start & callback, disconnect)
│   │   │   │   ├── me.routes.ts            # /api/me (Profile, audit history)
│   │   │   │   ├── repos.routes.ts         # /api/repos (List, create, get, delete, patch)
│   │   │   │   ├── files.routes.ts         # /api/repos/:o/:r/file & /tree & /folder
│   │   │   │   ├── branches.routes.ts      # /api/repos/:o/:r/branches
│   │   │   │   ├── commits.routes.ts       # /api/repos/:o/:r/commits & diffs
│   │   │   │   ├── pulls.routes.ts         # /api/repos/:o/:r/pulls & merge
│   │   │   │   ├── issues.routes.ts        # /api/repos/:o/:r/issues
│   │   │   │   ├── notifications.routes.ts # /api/notifications
│   │   │   │   ├── stream.routes.ts        # /api/stream (SSE stream)
│   │   │   │   ├── webhooks.routes.ts      # /api/webhooks/github (HMAC-verified receiver)
│   │   │   │   └── ai.routes.ts            # /api/ai (PR summary & commit generation)
│   │   │   ├── services/                   # Business logic layer
│   │   │   │   ├── auth/                   # PAT, OAuth, & Session services
│   │   │   │   ├── repos.service.ts        # Repo operations
│   │   │   │   ├── files.service.ts        # File browsing, viewing, creating, deleting
│   │   │   │   ├── folder-delete.service.ts# Atomic Git Data API folder deletion
│   │   │   │   ├── branches.service.ts     # Branch operations
│   │   │   │   ├── commits.service.ts      # Commit & patch retrieval
│   │   │   │   ├── pulls.service.ts        # PR management & merging
│   │   │   │   ├── issues.service.ts       # Issue tracking
│   │   │   │   ├── notifications.service.ts# User notifications
│   │   │   │   ├── audit.service.ts        # Audit log writer
│   │   │   │   └── ai/                     # Claude AI integration services
│   │   │   ├── jobs/                       # Background task queue (BullMQ)
│   │   │   │   ├── queue.ts                # Queue initialization
│   │   │   │   ├── worker.ts               # Background worker runner
│   │   │   │   ├── prefetch.job.ts         # Repo prefetching
│   │   │   │   └── pat-sync.job.ts         # Periodic sync for PAT users
│   │   │   ├── app.ts                      # Hono app mounting & configuration
│   │   │   └── index.ts                    # Server startup entry point
│   │   ├── src/test/                       # Test suite (Unit & Integration)
│   │   │   ├── unit/                       # Unit tests (crypto, schemas, HMAC, cache keys, etc.)
│   │   │   └── integration/                # API integration test suite
│   │   ├── drizzle.config.ts               # Drizzle migration config
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── package.json
│   │
│   └── web/                                # React 18 + Vite Frontend Application
│       ├── src/
│       │   ├── components/ui/              # Shared UI components
│       │   │   ├── ConfirmDialog.tsx       # Type-to-confirm modal for destructive actions
│       │   │   ├── Markdown.tsx            # XSS-safe Markdown renderer (remark-gfm)
│       │   │   ├── RateLimitBanner.tsx     # Rate limit warning notification
│       │   │   └── GithubDegradedBanner.tsx# Status banner for degraded upstream
│       │   ├── features/                   # Domain features
│       │   │   ├── auth/LoginPage.tsx      # OAuth login button & PAT entry form
│       │   │   ├── repos/                  # RepoListPage, RepoDetailPage, NewRepoPage
│       │   │   ├── files/                  # FileBrowserPage (tree + blob viewer)
│       │   │   ├── branches/               # BranchesPage (create & delete branch)
│       │   │   ├── commits/                # CommitListPage, CommitDiffPage
│       │   │   ├── pulls/                  # PullListPage, PullDetailPage, NewPullPage
│       │   │   ├── issues/                 # IssueListPage, IssueDetailPage, NewIssuePage
│       │   │   ├── notifications/          # NotificationsPage
│       │   │   ├── audit/AuditLogPage.tsx  # Audit log viewer
│       │   │   └── ai/AiToolsPage.tsx      # AI Commit & PR summary tools
│       │   ├── lib/                        # Core client utilities
│       │   │   ├── http.ts                 # Fetch client with CSRF header injection
│       │   │   ├── queryClient.ts          # TanStack Query client configuration
│       │   │   ├── persister.ts            # IndexedDB sync storage persister
│       │   │   ├── optimistic.ts           # Optimistic update helper
│       │   │   ├── realtime.ts             # SSE event listener & query invalidator
│       │   │   └── errors.ts               # Typed API error classes
│       │   ├── providers/                  # React Context Providers
│       │   │   ├── AuthProvider.tsx        # Session state provider
│       │   │   ├── QueryProvider.tsx       # TanStack Query persister provider
│       │   │   └── RealtimeProvider.tsx    # Live SSE event listener
│       │   ├── router/AppRouter.tsx        # Application routing & navigation bar
│       │   ├── styles/globals.css          # GitHub light/dark design system styles
│       │   └── main.tsx                    # React DOM root mounting
│       ├── index.html
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── shared/                             # Shared Library (Types & Schemas)
│       ├── src/
│       │   ├── constants.ts                # Shared constants (PAGE_SIZE, TTL, etc.)
│       │   ├── permissions.ts              # Permission map & scope helpers
│       │   ├── schemas/                    # Zod schemas (Auth, Repos, Files, Pulls, etc.)
│       │   ├── types/                      # GitHub & Realtime TypeScript types
│       │   └── index.ts                    # Public API exports
│       ├── tsconfig.json
│       └── package.json
│
├── infra/
│   ├── docker-compose.yml                  # PostgreSQL (5432) & Redis (6379)
│   ├── Dockerfile.api                      # Multi-stage production API build
│   └── fly.toml                            # Fly.io production deploy config
│
├── docs/
│   ├── github-clone-plan.md                # Full Architecture & System Plan
│   ├── github-clone-file-structure.md      # Repository Blueprint & File Specs
│   └── runbooks/                           # Operational runbooks
│       ├── deploy.md                       # Production deployment guide
│       ├── token-rotation.md               # Secret & key rotation steps
│       └── incident-notes.md               # Troubleshooting & incident response
│
├── scripts/                                # Maintenance & Developer Scripts
│   ├── generate-key.ts                     # Generates AES encryption keys & secrets
│   ├── smoke-test.ts                       # Validates API endpoints & middleware
│   └── seed.ts                             # Database seed utility
│
├── .github/workflows/ci.yml                # GitHub Actions CI workflow
├── .env.example                            # Example workspace configuration
├── .gitignore                              # Git ignore rules
├── pnpm-workspace.yaml                     # Workspace package definitions
├── tsconfig.base.json                      # Monorepo TypeScript configuration
├── package.json                            # Root scripts & dev dependencies
└── README.md                               # Project overview and quickstart
```

---

## 3. Prerequisites & Quickstart Guide

### 3.1 Prerequisites

- **Node.js**: `v20.0.0` or higher (`v24.20.0` verified)
- **pnpm**: `v9.0.0` or higher (`v12.8.1` installed)
- **Docker & Docker Compose**: For local PostgreSQL and Redis instances

If `pnpm` is not yet installed on your machine, install it via:
```bash
npm install -g pnpm
```

### 3.2 Step-by-Step Setup

1. **Install Workspace Dependencies**:
   ```bash
   pnpm install
   ```

2. **Generate Cryptographic Keys**:
   ```bash
   pnpm generate:key
   ```
   *Output example:*
   - `TOKEN_ENCRYPTION_KEY`: 32-byte Base64 encoded string for AES-256-GCM token encryption.
   - `SESSION_SECRET`: 32-character random string for session signing.

3. **Configure Environment Variables**:
   Copy `.env.example` templates to `.env`:
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

   Fill in `apps/api/.env`:
   ```env
   NODE_ENV=development
   APP_URL=http://localhost:5173
   API_URL=http://localhost:8787
   PORT=8787
   SESSION_SECRET=<generated_session_secret>
   TOKEN_ENCRYPTION_KEY=<generated_base64_32byte_key>

   DATABASE_URL=postgres://gitclone:gitclone@localhost:5432/gitclone
   REDIS_URL=redis://localhost:6379

   # GitHub OAuth credentials (from GitHub Developer Settings)
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   GITHUB_WEBHOOK_SECRET=your_webhook_secret

   # AI integration (optional)
   FEATURE_AI=false
   AI_PROVIDER_API_KEY=
   ```

4. **Start PostgreSQL & Redis (Docker Compose)**:
   ```bash
   pnpm dev:infra
   # or: docker compose -f infra/docker-compose.yml up -d
   ```

5. **Run Database Migrations**:
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

---

## 4. How to Run, Test, and Build

All scripts are executed from the **repository root**:

| Command | Purpose |
|---|---|
| `pnpm dev` | Starts both Web (`http://localhost:5173`) and API (`http://localhost:8787`) concurrently |
| `pnpm dev:infra` | Launches PostgreSQL (5432) and Redis (6379) via Docker Compose |
| `pnpm db:generate` | Generates Drizzle SQL migrations from schema |
| `pnpm db:migrate` | Executes migrations against PostgreSQL |
| `pnpm typecheck` | Typechecks all workspaces (`packages/shared`, `apps/api`, `apps/web`) |
| `pnpm test` | Runs the Vitest unit and integration test suite |
| `pnpm build` | Compiles `packages/shared`, compiles `apps/api`, and builds the static React bundle in `apps/web/dist` |
| `pnpm generate:key` | Generates new AES encryption keys and session secrets |
| `pnpm smoke:test` | Runs endpoint health, CSRF protection, and auth guard verification |
| `pnpm seed` | Runs database health and seed check |

---

## 5. Test Suite & Verification Results

The automated test suite covers unit and integration checks across the entire security, caching, schema validation, and HTTP API routing matrix:

```
Test Files: 8 passed (8)
Tests:      36 passed (36)
Time:       11.51s
```

### Verified Test Breakdown:
- `src/test/unit/crypto.test.ts` (3 tests): AES-256-GCM encryption/decryption, random IV verification, key validity.
- `src/test/unit/redact.test.ts` (5 tests): Deep token & secret redaction in strings, objects, and error traces.
- `src/test/unit/webhookSignature.test.ts` (4 tests): Timing-safe HMAC-SHA256 signature verification and tamper detection.
- `src/test/unit/cacheKeys.test.ts` (2 tests): Consistent Redis cache key naming conventions.
- `src/test/unit/permissions.test.ts` (2 tests): Scope checking and permission matrix lookups.
- `src/test/unit/schemas.test.ts` (4 tests): Zod schema input validation for all API routes.
- `src/test/unit/githubErrors.test.ts` (6 tests): Upstream GitHub error mapping (401, 403, 404, 409, 422, 5xx).
- `src/test/integration/api.test.ts` (10 tests): Health check, unauthenticated guards (`/api/me`, `/api/repos`, `/api/stream`), CSRF validation on mutating POST verbs, webhook signature validation, security headers (CSP, HSTS, X-Frame-Options), OAuth start/callback flows.

---

## 6. Frontend Features & Routes

The frontend (`apps/web`) is built with React 18, Vite, React Router 6, TanStack Query 5, and IndexedDB sync storage.

| Route | Component | Description |
|---|---|---|
| `/login` | `LoginPage` | GitHub OAuth connect button & PAT token entry form |
| `/` | `RepoListPage` | Repositories list with search filter & link to create repo |
| `/repos/new` | `NewRepoPage` | Create public/private repository form |
| `/repos/:owner/:repo` | `RepoDetailPage` | Repository overview, README viewer, stats, quick navigation |
| `/repos/:owner/:repo/files/*` | `FileBrowserPage` | Directory file tree + file viewer with Markdown rendering |
| `/repos/:owner/:repo/branches` | `BranchesPage` | Branch listing, create branch, and delete branch dialog |
| `/repos/:owner/:repo/commits` | `CommitListPage` | Commit history listing with author & SHA chips |
| `/repos/:owner/:repo/commits/:sha` | `CommitDiffPage` | Commit diff breakdown with per-file additions/deletions and patch view |
| `/repos/:owner/:repo/pulls` | `PullListPage` | Pull requests list filtered by state (open / closed) |
| `/repos/:owner/:repo/pulls/new` | `NewPullPage` | Create pull request form (title, base, head, body) |
| `/repos/:owner/:repo/pulls/:number` | `PullDetailPage` | PR details, discussion, and atomic merge button |
| `/repos/:owner/:repo/issues` | `IssueListPage` | Issues list filtered by state (open / closed) |
| `/repos/:owner/:repo/issues/new` | `NewIssuePage` | Create issue form (title & Markdown body) |
| `/repos/:owner/:repo/issues/:number` | `IssueDetailPage` | Issue details and discussion viewer |
| `/notifications` | `NotificationsPage` | Notification inbox with mark-as-read actions |
| `/audit` | `AuditLogPage` | Audit log viewer for write and destructive operations |
| `/ai` | `AiToolsPage` | Claude AI-powered commit message suggester & PR summary generator |

---

## 7. Security & Compliance Checklist

- [x] **Zero Plaintext Tokens**: PAT and OAuth tokens encrypted at rest via AES-256-GCM.
- [x] **Zero Secret Leakage**: Redaction middleware strips tokens from logs, errors, and traces.
- [x] **Browser Isolation**: Tokens never returned to browser; authenticated via HttpOnly, Secure, SameSite cookies.
- [x] **CSRF Protection**: All mutating HTTP verbs (`POST`, `PUT`, `PATCH`, `DELETE`) require `x-csrf-token`.
- [x] **Webhook Verification**: Timing-safe `X-Hub-Signature-256` HMAC validation.
- [x] **Rate Limit Defense**: Redis ETag caching with `304 Not Modified` saves GitHub API quota.
- [x] **Audit Trail**: Every destructive action is logged with user ID, IP address, timestamp, and target entity.
