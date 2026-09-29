# GitHub Clone — System Plan

> A fast, GitHub-compatible client. GitHub stays the source of truth; every action in this app is a real GitHub API call and shows up on github.com immediately. Changes made on github.com show up here.

**Status:** Draft v1
**Guiding principles:** working core over fancy UI · perceived-zero latency · security of tokens first · demo reliability over feature count

---

## 1. Goals and Non-Goals

### Goals
- Use the app as a real GitHub account: browse, create, edit, delete, review, merge.
- Connect with **OAuth (GitHub App / device flow)** and **Personal Access Token (PAT)**, each acting as a fallback for the other.
- Feel instant: cached reads render in under 50 ms, writes are optimistic.
- Stay stateless about repo content. Our database holds only users, encrypted credentials, settings, cache metadata, and audit logs.

### Non-Goals (for MVP)
- Hosting git repositories ourselves.
- Replacing GitHub Actions, Packages, or Marketplace.
- Org and team administration beyond basic listing.
- Native mobile apps.

---

## 2. Core Concept

```
User ⇄ Our App (UI + backend + cache) ⇄ GitHub API ⇄ github.com
```

- **Source of truth:** GitHub. We never keep an authoritative copy of repos.
- **Our value:** speed (cache, optimistic UI, prefetch), a simpler UX, and an optional AI layer on top.
- **Sync model:** writes go straight to GitHub; reads come from cache and refresh in the background; webhooks push remote changes in real time.

---

## 3. Authentication and Credentials

### 3.1 Supported methods

| Method | Role | Notes |
|---|---|---|
| GitHub App / OAuth (device flow) | Primary for multi-user use | Short-lived tokens, one-click login, webhooks included |
| Fine-grained PAT | Fallback / quick MVP | User-created, per-repo scoping, expiry set by user |
| Classic PAT | Discouraged | Too broad; accept only if the user insists |

Each stored credential has an `auth_type` (`oauth` | `pat`). All code obtains a client through one function:

```ts
getGithubClient(userId): Promise<Octokit>  // hides auth_type from callers
```

### 3.2 Connect flow (PAT)
1. User creates a fine-grained token on GitHub and pastes it.
2. Backend validates with `GET /user` (200 = valid, 401 = reject).
3. Backend encrypts the token (AES-256-GCM, key from env/secrets manager) and stores it.
4. Backend issues an HttpOnly session cookie. The token is never sent back to the browser.

### 3.3 Connect flow (OAuth)
1. User clicks "Login with GitHub".
2. Backend runs the OAuth / device flow, receives the access token (and refresh token for a GitHub App).
3. Same encrypt-and-store path as PAT.

### 3.4 Fallback rules
- If OAuth fails or is unavailable, offer PAT entry.
- If a PAT is expired or revoked (401), prompt the user to reconnect via OAuth or a new PAT.
- On any 403 for a missing permission, show "Reconnect with the required permission" and name the permission.

### 3.5 Permissions matrix

| Feature | Classic scope / OAuth | Fine-grained / GitHub App |
|---|---|---|
| Read repos, profile | `repo`, `read:user` | Metadata: read, Contents: read |
| Edit / delete files, folders | `repo` | Contents: read & write |
| Pull requests | `repo` | Pull requests: read & write |
| Issues | `repo` | Issues: read & write |
| Notifications | `notifications` | (account-level, OAuth only) |
| **Delete repository** | **`delete_repo`** | **Administration: read & write** |
| Workflows (later) | `workflow` | Actions / Workflows: write |

Principle: request the minimum at connect time, and ask for elevated permissions (like `delete_repo`) only when the user tries the action.

### 3.6 Token security rules
- Encrypt at rest; never log tokens; never expose to the client.
- All GitHub calls are made server-side only.
- HTTPS everywhere; strict CSP; HttpOnly + Secure + SameSite cookies.
- "Disconnect" button deletes the stored credential.
- Minimum scopes and expiry recommended to PAT users.

---

## 4. Feature Scope

### MVP
1. Auth and profile (connect, avatar, repos, orgs)
2. Repositories: list, search, create, fork, star, archive, delete
3. File browser and editor: tree, viewer with syntax highlighting, edit and commit
4. Branches and commits: list, create, delete branch, history, diff
5. Pull requests: create, review, comment, merge (merge / squash / rebase)
6. Issues: create, label, assign, comment, close
7. Notifications inbox
8. Audit log of all write actions

### Later
- Actions / workflow runs, releases, gists, project boards
- AI assistant: PR summaries, commit messages, issue triage, review hints
- Multi-account dashboard
- Org and team management

---

## 5. Delete Operations (file, folder, repo)

### 5.1 Delete a file
`DELETE /repos/{owner}/{repo}/contents/{path}` with `message`, `sha` (fetch via `GET` on the same path), and optional `branch`. Produces a normal commit, so it is recoverable.

### 5.2 Delete a folder
Git has no folder objects. Implement as a **single commit** via the Git Data API:
1. `GET /git/trees/{branch}?recursive=1` — list all paths.
2. Filter paths starting with `folder/`.
3. `POST /git/trees` with `base_tree` = current tree; set each path to `sha: null`.
4. `POST /git/commits` with the new tree and current commit as parent.
5. `PATCH /git/refs/heads/{branch}` to move the branch.

If the branch is protected and the write is rejected, fall back to: commit to a new branch and open a PR.

### 5.3 Delete a repository
`DELETE /repos/{owner}/{repo}` → 204. Requires the `delete_repo` scope or Administration permission (see 3.5). Org repos require org-owner or repo-admin rights.

### 5.4 Safeguards
- Type-the-name-to-confirm dialog for repo deletion.
- Offer **Archive** (`PATCH /repos/{o}/{r}` `archived: true`) as the reversible alternative.
- Show the list or diff of what will be removed before file/folder deletes.
- Optional cooldown or re-auth before repo deletion.
- Every destructive action is written to the audit log.

---

## 6. Architecture

```
┌──────────────────────────────┐
│ Frontend (React + Vite SPA)  │
│  TanStack Query + IndexedDB  │
└──────────────┬───────────────┘
               │ HTTPS / SSE or WebSocket
┌──────────────▼───────────────┐
│ Backend API (Node + Hono)    │
│  ├─ Auth service (OAuth/PAT) │
│  ├─ Token vault (encrypted)  │
│  ├─ GitHub gateway (GraphQL  │
│  │   reads, REST writes)     │
│  ├─ Cache layer (Redis+ETag) │
│  ├─ Webhook receiver         │
│  ├─ Realtime hub (SSE/WS)    │
│  ├─ Job queue (BullMQ)       │
│  └─ AI service (later)       │
└───────┬──────────────┬───────┘
        │              │
   Postgres          Redis
        │
   GitHub API ⇄ github.com
```

### Components
- **GitHub gateway:** wraps `octokit`; handles retries, secondary rate limits, pagination, ETags, and error mapping.
- **Cache layer:** Redis stores responses keyed by `user:endpoint:params` with their ETag. Sends `If-None-Match`; a `304` costs no rate limit.
- **Webhook receiver:** verifies `X-Hub-Signature-256`, maps events to affected cache keys, invalidates or patches them, and pushes updates to the client.
- **Realtime hub:** SSE (simple) or WebSocket streams cache updates to connected clients.
- **Job queue:** prefetch, periodic sync for PAT users (who have no automatic webhooks), and audit log writes.

---

## 7. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React + TypeScript + Vite (SPA) | App-like navigation, no per-page server round trip |
| Client data | TanStack Query + IndexedDB persistence | Instant loads, background refresh, optimistic updates |
| Editor / viewer | Monaco (lazy) + Shiki | Editor loads only on edit; Shiki for fast read-only highlighting |
| List rendering | `@tanstack/react-virtual` | Large trees, commit lists, diffs |
| Backend | Node + Hono (or Fastify) | Low overhead; latency is dominated by GitHub |
| GitHub access | `octokit`, GraphQL for reads, REST for writes | One query replaces many calls |
| Cache | Redis (local or Upstash) | Shared ETag and response cache |
| Database | Postgres (Neon/Supabase) or SQLite/Turso | Users, encrypted tokens, audit log, settings |
| Realtime | Webhooks → SSE / WebSocket | No polling |
| Jobs | BullMQ | Prefetch and sync |
| Hosting | Static frontend on a CDN; backend on Fly.io / Railway | CDN speed plus a warm, long-lived server |

Avoid for MVP: microservices, Kubernetes, heavy state-management libraries.

---

## 8. Latency Strategy

Zero *real* latency is impossible (GitHub API calls take roughly 100-400 ms). The goal is **zero perceived latency**.

1. **Stale-while-revalidate:** render cached data instantly, refresh in the background, persist cache to IndexedDB.
2. **Optimistic updates:** star, comment, close-issue update the UI first; roll back on failure.
3. **ETag / conditional requests** at both the server cache and gateway.
4. **Prefetch on intent:** start fetching on hover or focus.
5. **Webhooks over polling** for live updates.
6. **GraphQL batching** for multi-resource reads.
7. **Warm, well-placed backend:** persistent server, region chosen after measuring GitHub API round-trip time.
8. **Virtualization and lazy diffs.**
9. **Code-splitting and route preloading;** lazy-load Monaco.
10. **Brotli compression, HTTP/2 or 3, keep-alive.**

### Targets

| Interaction | Target |
|---|---|
| Revisit a cached view | < 50 ms |
| First view of a repo / PR / issue | < 300 ms |
| Write actions (perceived) | instant; confirmed within ~500 ms |

### Request flow

```
Click → client cache (0-10 ms)
      → server Redis (5-30 ms)
      → GitHub API with ETag (100-400 ms)
      → response or webhook patches cache → UI updates quietly
```

---

## 9. Data Model (own database only)

```
users
  id, github_id, login, avatar_url, created_at

credentials
  id, user_id, auth_type ('oauth'|'pat'), token_enc, refresh_token_enc,
  scopes, expires_at, last_validated_at

sessions
  id, user_id, expires_at

audit_log
  id, user_id, action, target (repo/path/pr/issue), status, metadata_json, created_at

settings
  user_id, preferences_json

webhook_deliveries   (dedupe)
  delivery_id, event, received_at
```

Repo content, PRs, and issues are **not** stored here; they live in GitHub and the Redis cache.

---

## 10. API Surface (our backend)

```
POST   /api/auth/pat               connect with PAT
GET    /api/auth/oauth/start       begin OAuth
GET    /api/auth/oauth/callback
POST   /api/auth/disconnect

GET    /api/me
GET    /api/repos                  list / search
POST   /api/repos                  create
DELETE /api/repos/:owner/:repo     delete (needs confirm token in body)
PATCH  /api/repos/:owner/:repo     archive, rename, visibility

GET    /api/repos/:o/:r/tree?ref=
GET    /api/repos/:o/:r/file?path=&ref=
PUT    /api/repos/:o/:r/file       create / update
DELETE /api/repos/:o/:r/file       delete file
DELETE /api/repos/:o/:r/folder     delete folder (single commit)

GET    /api/repos/:o/:r/branches
POST   /api/repos/:o/:r/branches
DELETE /api/repos/:o/:r/branches/:name

GET    /api/repos/:o/:r/commits
GET    /api/repos/:o/:r/pulls
POST   /api/repos/:o/:r/pulls
POST   /api/repos/:o/:r/pulls/:n/merge
GET    /api/repos/:o/:r/issues
POST   /api/repos/:o/:r/issues

GET    /api/notifications
GET    /api/stream                 SSE for realtime updates
POST   /api/webhooks/github        webhook receiver
```

---

## 11. Rate Limits and Reliability

- Authenticated REST limit is 5,000 requests/hour per user; GraphQL uses a separate point-based budget.
- Respect `X-RateLimit-*` headers and secondary rate limit responses (`Retry-After`).
- Show a graceful "limit reached, retrying" state instead of failing.
- Retry idempotent reads with backoff; never blindly retry writes.
- Keep a "GitHub degraded" banner if the API returns 5xx repeatedly.
- Demo fallback: a read-only cached mode so the UI still works if GitHub is unreachable.

---

## 12. Security and Compliance Checklist

- [ ] Tokens encrypted at rest, never logged, never sent to the browser
- [ ] Minimum scopes at connect; elevated scopes only on demand
- [ ] HttpOnly + Secure + SameSite session cookies; CSRF protection on writes
- [ ] Strict CSP; sanitize all rendered Markdown and diffs (XSS)
- [ ] Webhook signature verification (`X-Hub-Signature-256`)
- [ ] Confirmation and audit log for destructive actions
- [ ] "Disconnect" removes stored credentials
- [ ] Respect GitHub's API terms; do not use "GitHub" branding in the public product name or imply affiliation

---

## 13. Build Plan

| Week | Deliverable |
|---|---|
| 1 | Project setup, PAT + OAuth login, token vault, `getGithubClient`, list repos and profile |
| 2 | File browser, viewer, edit and commit, branches, commit history |
| 3 | Pull requests and issues (read + write), delete file / folder / repo with safeguards |
| 4 | Redis + ETag cache, IndexedDB persistence, optimistic updates, webhooks + SSE, notifications |
| 5 | AI assistant (PR summaries, commit messages), polish, demo flow, audit log UI |

### Definition of done for MVP
- Log in with OAuth and with a PAT, and fall back between them.
- Create, edit, and delete a file, a folder, and a repo, and see each reflected on github.com.
- Open, review, and merge a PR from the app.
- Revisited views render from cache in under 50 ms.
- A change made on github.com appears in the app without a manual refresh.

---

## 14. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Token leak | Encryption, server-side calls only, minimal scopes, CSP, no logging of secrets |
| Accidental data loss | Confirmations, archive-first option, audit log, previews before delete |
| Rate limiting | ETags, caching, GraphQL batching, webhooks over polling |
| PAT users lack webhooks | Periodic background sync via job queue; prompt to upgrade to OAuth/GitHub App |
| Large repos / diffs are slow | Pagination, virtualization, lazy per-file diffs |
| Protected branches block writes | Auto-fallback to branch + PR |
| GitHub API outage | Read-only cached mode, clear status banner |

---

## 15. Open Questions

1. Learning / portfolio project or a product to launch publicly? (Affects security depth and scale.)
2. Which differentiator leads: simplified UX, AI assistant, or unified multi-account dashboard?
3. Preferred backend language (Node/TypeScript assumed here)?
4. Target hosting region and budget?
5. Product name (avoid "GitHub" in the name for public launch).
