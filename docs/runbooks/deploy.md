# Deployment Runbook

## Overview
GitClone consists of:
- **Frontend SPA**: Static assets served from CDN (Vercel, Cloudflare Pages, Fly.io, etc.)
- **Backend API**: Node.js + Hono server running on Fly.io / Railway / Container
- **Database**: PostgreSQL (managed e.g. Neon, Supabase, or self-hosted)
- **Cache & Queue**: Redis (Upstash or Redis Cloud)

---

## 1. Environment Preparation

Ensure the following secrets are configured in your deployment environment:

| Key | Description |
|---|---|
| `NODE_ENV` | `production` |
| `APP_URL` | Full URL of the frontend (e.g. `https://gitclone.app`) |
| `API_URL` | Full URL of the backend API (e.g. `https://api.gitclone.app`) |
| `PORT` | `8787` (or provided by host) |
| `DATABASE_URL` | Postgres connection string (`postgres://...`) |
| `REDIS_URL` | Redis connection string (`redis://...`) |
| `SESSION_SECRET` | 32+ character random string |
| `TOKEN_ENCRYPTION_KEY` | 32-byte Base64-encoded key |
| `GITHUB_CLIENT_ID` | OAuth GitHub App Client ID |
| `GITHUB_CLIENT_SECRET` | OAuth GitHub App Client Secret |
| `GITHUB_WEBHOOK_SECRET` | Secret configured in GitHub App / Webhooks |
| `FEATURE_AI` | `true` or `false` |
| `AI_PROVIDER_API_KEY` | Anthropic API key (if `FEATURE_AI=true`) |

---

## 2. Database Migration

Before deploying the new API version, run database migrations:

```bash
pnpm db:migrate
```

---

## 3. Fly.io Deployment

Deploying the API backend with Fly:

```bash
# 1. Authenticate with Fly
fly auth login

# 2. Launch or deploy
fly deploy --config infra/fly.toml
```

---

## 4. Frontend Static Build

```bash
# Build web app
pnpm --filter @gitclone/web build

# Deploy `apps/web/dist` to Cloudflare Pages / Vercel / Netlify / S3 + CloudFront
```
