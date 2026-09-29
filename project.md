● Full Application Analysis, Setup Guide & Folder Structure
                                                                                                                         This repository is GitClone — a high-performance GitHub web client and API gateway built as a TypeScript monorepo
  with pnpm workspaces. The design adheres strictly to the specifications in github-clone-plan.md
  (/mnt/c/Users/HP/Desktop/GithubApp/gitclone/docs/github-clone-plan.md) and github-clone-file-structure.md
  (/mnt/c/Users/HP/Desktop/GithubApp/gitclone/docs/github-clone-file-structure.md).                                    
                                                                                                                         ---                                                                                                                  

  1. System Architecture & Core Concept

  User ⇄ Web App (React 18 + Vite SPA) ⇄ Backend API (Hono + Node.js) ⇄ GitHub API ⇄ github.com
               │                                   │
        IndexedDB Cache                    PostgreSQL + Redis

  Key Principles & Features:

  1. GitHub is the Sole Source of Truth:
     - The local database never stores repository code, branches, issues, or pull requests.
     - It only stores users, encrypted credentials (AES-256-GCM), session tokens, audit logs, and deduplicated webhook
       delivery IDs.                                                                                                     2. Perceived-Zero Latency:
     - Stale-While-Revalidate: Client reads render instantly from cache (IndexedDB via TanStack Query), refreshing in
       the background.
     - ETag & Conditional Requests: Redis caches API responses with ETags; 304 Not Modified responses preserve GitHub
       API rate limits.
     - Real-Time Webhooks & SSE: Remote changes on GitHub trigger webhooks, which invalidate cached keys and push      
       events via Server-Sent Events (/api/stream).
  3. Defense-in-Depth Token Security:
     - Personal Access Tokens (PAT) and OAuth tokens are encrypted at rest with AES-256-GCM.
     - Tokens are never logged, exposed in error traces, or returned to the browser.
     - The browser communicates via HttpOnly, Secure, SameSite session cookies + CSRF protection headers
       (x-csrf-token).
  4. Single-Commit Folder Deletions:                                                                                   
     - Deleting a folder executes an atomic tree commit via the GitHub Git Data API (GET /git/trees → filter → POST 
       /git/trees with sha: null → POST /git/commits → PATCH /git/refs/heads).
                                                                                                                         ---

  2. Complete Monorepo Folder Structure

  gitclone/
  ├── apps/
  │   ├── api/                                # Node.js + Hono Backend Service
  │   │   ├── src/
  │   │   │   ├── config/                     # Environment validation (Zod) & constants
  │   │   │   │   ├── env.ts                  # Safe process.env parsing & type inference
  │   │   │   │   └── constants.ts            # Cookie names, rate limits, timeouts
  │   │   │   ├── db/                         # Drizzle ORM setup & migrations
  │   │   │   │   ├── client.ts               # PostgreSQL connection pool & Drizzle client
  │   │   │   │   ├── schema.ts               # Database table schemas
  │   │   │   │   ├── schema/                 # Modular schema definitions
  │   │   │   │   │   ├── users.ts            # User accounts
  │   │   │   │   │   ├── credentials.ts      # Encrypted tokens (OAuth/PAT)
  │   │   │   │   │   ├── sessions.ts         # User active sessions                                                     │   │   │   │   │   ├── audit-log.ts        # Destructive & write action logs
  │   │   │   │   │   ├── settings.ts         # User preferences
  │   │   │   │   │   └── webhook-deliveries.ts # Webhook deduplication
  │   │   │   │   └── migrations/             # Generated SQL migration files                                            │   │   │   ├── github/                     # GitHub Gateway (Only layer calling GitHub)
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
  │   │   │   │   └── ai.routes.ts            # /api/ai (PR summary & commit generation)                                 │   │   │   ├── services/                   # Business logic layer
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
  │   │   ├── test/                           # Test suite (Unit & Integration)
  │   │   │   ├── unit/                       # Unit tests (crypto, schemas, HMAC, etc.)
  │   │   │   └── integration/                # API integration test suite
  │   │   ├── drizzle.config.ts               # Drizzle migration config
  │   │   ├── tsconfig.json
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
  │       │   ├── schemas/                    # Zod schemas (Auth, Repos, Files, etc.)
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
  ├── .gitignore
  ├── pnpm-workspace.yaml                     # Workspace package definitions
  ├── tsconfig.base.json                      # Monorepo TypeScript configuration
  ├── package.json                            # Root scripts & dev dependencies
  └── README.md                               # Project documentation

  ---
  
  3. Prerequisites & Installation Guide

  3.1 Prerequisites

  - Node.js: v20.0.0 or higher (v24.20.0 detected)
  - pnpm: v9.0.0 or higher (installed or run via npx pnpm / Corepack)
  - Docker & Docker Compose: For local PostgreSQL and Redis instances

  3.2 Installation Steps

  1. Clone the repository and enter directory:
  git clone <repo-url>
  cd gitclone
  2. Install all workspace dependencies:
  pnpm install
  # or: npx pnpm install
  3. Generate cryptographic secrets:
  pnpm generate:key
     This outputs a 32-byte Base64-encoded TOKEN_ENCRYPTION_KEY and a 32-character SESSION_SECRET.
  4. Configure Environment Variables:                                                                                       Copy the .env.example templates to .env:
  cp apps/api/.env.example apps/api/.env
  cp apps/web/.env.example apps/web/.env

     Ensure apps/api/.env contains your parameters:
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
  5. Start PostgreSQL & Redis (Docker Compose):
  pnpm dev:infra
  # or: docker compose -f infra/docker-compose.yml up -d
  6. Run Database Migrations:
  pnpm db:generate
  pnpm db:migrate

  ---

  4. How to Run, Test, and Build

  4.1 Development Mode

  Runs both the frontend (Vite at http://localhost:5173) and the backend (Hono at http://localhost:8787) concurrently:
  pnpm dev

  4.2 Running Tests
  
  Runs Vitest unit and integration test suites:
  pnpm test
  Current test suite: 8 test files, 36 tests passing covering crypto, token redaction, HMAC signatures, ETag/cache 
  keys, permissions, Zod schemas, and API routes.

  4.3 Smoke Testing

  With the API running on http://localhost:8787, test endpoint health, CSRF protections, and auth guards:
  pnpm smoke:test

  4.4 Production Build
  
  Builds the shared types, static React frontend bundle into apps/web/dist, and compiles the TypeScript API into
  apps/api/dist:
  pnpm build

  ---

  5. Summary of Enhancements & Refinements

  1. Standardized API Route Call Conventions:
     - Updated all frontend query hooks (CommitDiffPage, CommitListPage, BranchesPage, PullListPage, PullDetailPage,
       NewPullPage, IssueListPage, IssueDetailPage, NewIssuePage) to use standard /repos/${owner}/${repo}/... routes.
  2. Design System & Global Styling:
     - Added apps/web/src/styles/globals.css with GitHub-aligned typography, colors, borders, and input focus states.
  3. Operational Documentation & Runbooks:
     - Added docs/github-clone-plan.md and docs/github-clone-file-structure.md.
     - Created docs/runbooks/deploy.md, docs/runbooks/token-rotation.md, and docs/runbooks/incident-notes.md.
  4. Developer Tooling & Deployment Configurations:
     - Added scripts/generate-key.ts, scripts/smoke-test.ts, and scripts/seed.ts.                                           - Created infra/fly.toml for container deployment.

  pnpm test
  Current test suite: 8 test files, 36 tests passing covering crypto, token redaction, HMAC signatures, ETag/cache     
  keys, permissions, Zod schemas, and API routes.

  4.3 Smoke Testing

  With the API running on http://localhost:8787, test endpoint health, CSRF protections, and auth guards:
  pnpm smoke:test

  4.4 Production Build

  Builds the shared types, static React frontend bundle into apps/web/dist, and compiles the TypeScript API into       
  apps/api/dist:
  pnpm build

  ---

  5. Summary of Enhancements & Refinements

  1. Standardized API Route Call Conventions:
     - Updated all frontend query hooks (CommitDiffPage, CommitListPage, BranchesPage, PullListPage, PullDetailPage,   
       NewPullPage, IssueListPage, IssueDetailPage, NewIssuePage) to use standard /repos/${owner}/${repo}/... routes.  
  2. Design System & Global Styling:
     - Added apps/web/src/styles/globals.css with GitHub-aligned typography, colors, borders, and input focus states.  
  3. Operational Documentation & Runbooks:
     - Added docs/github-clone-plan.md and docs/github-clone-file-structure.md.
     - Created docs/runbooks/deploy.md, docs/runbooks/token-rotation.md, and docs/runbooks/incident-notes.md.
  4. Developer Tooling & Deployment Configurations:
     - Added scripts/generate-key.ts, scripts/smoke-test.ts, and scripts/seed.ts.
     - Created infra/fly.toml for container deployment.
     - Added generate:key and smoke:test scripts in package.json.
