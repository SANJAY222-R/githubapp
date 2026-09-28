# GitClone

A high-performance GitHub web client and API layer built with TypeScript, Node.js (Hono), Drizzle ORM, React 18, Vite, and Tailwind CSS.

## Monorepo Structure

```
├── apps/
│   ├── api/          # Node.js + Hono backend API, GitHub gateway, auth, caching, SSE
│   └── web/          # React 18 + Vite + TanStack Query + Tailwind frontend
├── packages/
│   └── shared/       # Shared TypeScript types, Zod schemas, permissions, error types
└── infra/
    └── docker-compose.yml # PostgreSQL & Redis container setup
```

## Features

- **GitHub Gateway & Auth**:
  - OAuth and Personal Access Token (PAT) authentication.
  - AES-256-GCM token encryption at rest with random IVs and integrity checks.
  - Dual-scoped permissions matrix for public & private repository access.
  - Secret & token redaction in all application logs and error responses.
- **Repositories & Code Navigation**:
  - Full file tree & blob viewer with syntax highlighting.
  - Branch and commit history exploration.
  - Pull request diff viewer with file patch breakdowns and status tags.
  - Issue tracker with state filtering and Markdown rendering.
- **Performance & Real-Time**:
  - Intelligent Redis caching with GitHub ETag/304 conditional request validation.
  - GitHub Webhook handling with timing-safe HMAC-SHA256 signature verification.
  - Server-Sent Events (SSE) stream for real-time repository updates.
- **Optional AI Integrations**:
  - PR summary generation and commit message drafting via Anthropic Claude API.

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0 (or Corepack)
- Docker & Docker Compose (for local Postgres & Redis)

### Environment Setup

1. Copy the example environment files:
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

2. Configure `apps/api/.env` with your GitHub OAuth credentials and encryption key:
   ```env
   PORT=8787
   APP_URL=http://localhost:5173
   API_URL=http://localhost:8787
   SESSION_SECRET=<32+ char secret>
   TOKEN_ENCRYPTION_KEY=<32-byte base64 encoded key>
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/gitclone
   REDIS_URL=redis://localhost:6379
   GITHUB_CLIENT_ID=your_github_oauth_client_id
   GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
   GITHUB_WEBHOOK_SECRET=your_github_webhook_secret
   ```

### Running Locally

1. **Start Infrastructure Services**:
   ```bash
   pnpm dev:infra
   ```

2. **Run Database Migrations**:
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

3. **Start Development Servers** (Web + API concurrently):
   ```bash
   pnpm dev
   ```
   - Web App: `http://localhost:5173`
   - API Server: `http://localhost:8787`

### Testing and Building

- **Run All Tests**:
  ```bash
  pnpm test
  ```
- **Typecheck Workspace**:
  ```bash
  pnpm typecheck
  ```
- **Build All Packages**:
  ```bash
  pnpm build
  ```
