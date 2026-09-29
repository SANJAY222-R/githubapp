# GitHub Clone — Security Hardening Spec

Companion to `github-clone-plan.md` and `github-clone-file-structure.md`. This document defines how the app resists **crashing, token decryption, interruption, and intrusion**, and amends the plan where the plan is too weak.

**Status:** Draft v1
**Guiding principles:** assume breach · defense in depth · least privilege · fail closed for auth, fail soft for availability · every control is testable

> **Honest scope note.** No system is provably impossible to break. The goal here is to make every attack path expensive, contained, detectable, and recoverable. Where a control is a trade-off, it is called out. Treat this as the baseline, then pay for an external penetration test before any public launch.

---

## 1. What We Protect (Assets) and From Whom (Threats)

### 1.1 Assets, ranked by damage if lost

| # | Asset | Why it matters |
|---|---|---|
| 1 | Stored GitHub credentials (OAuth/PAT) | A leak gives an attacker write and delete power over users' real repos |
| 2 | Encryption keys / OAuth client secret / GitHub App private key | Compromise decrypts every credential or impersonates the app |
| 3 | User sessions | Session theft is equivalent to using the user's GitHub account |
| 4 | Private repo content in Redis cache and browser IndexedDB | Confidentiality of source code |
| 5 | Audit log | Needed to investigate incidents; must not be forgeable |
| 6 | Availability | Users and demo must keep working |

### 1.2 Threat actors

| Actor | Typical goal |
|---|---|
| Anonymous internet attacker | Find a bug, steal tokens, take the service down |
| Malicious authenticated user | Read or modify another user's data (IDOR), abuse our GitHub rate budget |
| Malicious repo content author | XSS via Markdown, filenames, diffs, or commit messages shown in our UI |
| Compromised dependency / CI | Supply-chain code execution |
| Insider or leaked database dump | Decrypt tokens offline |
| Network attacker | Sniff or replay traffic |

### 1.3 Attack surface → primary control

| Surface | Primary control | Section |
|---|---|---|
| Token database | Envelope encryption + KMS, key never beside data | 2 |
| Login / session | Opaque hashed sessions, `__Host-` cookie, CSRF, PKCE | 3 |
| API routes | Schema validation, per-user scoping, authorization tests | 4 |
| Rendered repo content | Sanitized Markdown, strict CSP, Trusted Types | 5 |
| Public endpoints | Layered rate limits, size and time limits, WAF | 6 |
| Webhook endpoint | HMAC on raw body, replay defense | 7 |
| Infra and pipeline | Secrets manager, private network, pinned CI, scanning | 8 |
| Detection and recovery | Redacted logs, tamper-evident audit, runbooks | 9 |

---

## 2. Token Vault: Making Decryption Infeasible

The plan says "AES-256-GCM, key from env/secrets manager." That is a good cipher with a weak key story: if the key sits in the same environment as the database, one server compromise decrypts everything. Replace it with **envelope encryption**.

### 2.1 Design

```
                     ┌───────────────────────────┐
                     │ KMS / secrets manager      │  Master key (KEK): never leaves KMS
                     │ (AWS KMS, GCP KMS, Vault)  │
                     └─────────────┬─────────────┘
                                   │ wrap / unwrap DEK (audited)
┌──────────────┐    ┌──────────────▼─────────────┐
│ Postgres     │◄───│ API server (vault.ts)      │
│ token_enc    │    │ per-credential DEK,        │
│ dek_wrapped  │    │ in memory only, briefly    │
│ key_version  │    └────────────────────────────┘
└──────────────┘
```

- **Per-credential data key (DEK).** Generate a random 256-bit DEK for each credential; encrypt the token with it; wrap the DEK with the KEK held in KMS; store `token_enc`, `dek_wrapped`, `key_version`. A stolen database dump alone is useless.
- **Bind ciphertext to its owner with AAD.** Pass `user_id || credential_id || auth_type || key_version` as GCM additional authenticated data. A ciphertext copied to another row fails to decrypt.
- **Nonces.** Random 96-bit nonce per encryption; never reuse a (key, nonce) pair. Because each DEK encrypts only one value (plus rotations), the GCM collision limit is a non-issue.
- **No KMS at MVP?** Acceptable fallback: a master key in the platform secrets manager (Fly/Railway secrets), **not** in `.env` files, not in the image, not in the repo, and loaded once at boot. Keep the same envelope format so moving to KMS later is a re-wrap, not a migration of user tokens.
- **Key rotation.** `key_version` on every row. Rotation job re-wraps DEKs under the new KEK without touching tokens. Support two active versions during rollover. Runbook lives in `docs/runbooks/key-rotation.md`.
- **Decrypt only where needed.** Only `github/client.ts` (via `vault.ts`) may decrypt. Decrypted tokens are held in a short-lived in-memory object, never cached in Redis, never placed in job payloads, never passed to logs or error objects.
- **Memory hygiene.** Keep tokens as `Buffer` where practical, zero them after use, disable core dumps and heap snapshots in production, and never attach tokens to request-scoped context that gets serialized.
- **Separation of duties.** The database role used by the API can read `credentials` but the KEK is only usable by the API's identity in KMS. A leaked DB credential and a leaked KMS grant are two independent failures.

### 2.2 OAuth / GitHub App token handling

- Prefer a **GitHub App with user-to-server tokens**: they expire (8 hours) and come with a refresh token, so a leaked access token dies quickly.
- **Refresh tokens are single-use and rotate.** Two concurrent refreshes will invalidate the credential. Serialize refresh per credential with a Redis lock (`SET NX PX`) and re-read after acquiring it.
- Store the OAuth **client secret** and **App private key** in the secrets manager, not in the database.
- **PKCE and `state`** on every OAuth start (see 3.3).

### 2.3 PAT handling

- Accept **fine-grained PATs only by default.** For a classic PAT (prefix `ghp_`), show a warning and require an explicit acknowledgment.
- Validate with `GET /user`, read the `X-OAuth-Scopes` / permission headers, and store the granted scope set in `credentials.scopes` so features can check permissions before calling GitHub.
- The token is only ever accepted in a **POST body over TLS**. Never in a URL, query string, or header logged by a proxy. Do not echo it back in any response.
- Store a **fingerprint** (SHA-256 of the token, truncated) for support and dedupe; never store or display the token itself, not even a masked prefix beyond the standard `github_pat_…` type indicator.
- Recommend and, if the token exposes it, display the expiry. Warn before expiry via `credential-check.job.ts`.

### 2.3 Disconnect and revocation

- **Disconnect** deletes the row *and* calls GitHub to revoke where possible (`DELETE /applications/{client_id}/grant` for OAuth). PATs cannot be revoked by us; tell the user to delete them on GitHub.
- **Kill switch:** an admin script that revokes all OAuth grants and deletes all credentials, for a suspected breach.

---

## 3. Authentication, Sessions, and CSRF

### 3.1 Sessions

- **Opaque random session ID** (≥ 256 bits from a CSPRNG). Store only `SHA-256(session_id)` in `sessions`, so a database leak does not yield usable sessions.
- Cookie: `__Host-session; HttpOnly; Secure; SameSite=Lax; Path=/`. The `__Host-` prefix blocks subdomain overwrite. Use `Strict` if login-from-external-link flow allows it.
- **Rotate the session ID on login, privilege change, and reconnect.** This defeats session fixation.
- **Timeouts:** idle 30 min-24 h (choose per risk), absolute 7-30 days. Server-side revocation on logout and disconnect.
- **Concurrent session list** with "sign out everywhere" in settings.
- Bind loosely to device: store a hash of User-Agent class and coarse IP range; flag, do not hard-block, on large changes.

### 3.2 CSRF

Layered, because writes here delete real repositories:

1. `SameSite=Lax` cookie.
2. **Origin / Referer check** on every non-GET request: reject if `Origin` is not `APP_URL`.
3. **CSRF token** (double-submit or synchronizer) in a custom header, validated in `middleware/csrf.ts`.
4. Custom `Content-Type: application/json` required on writes, and CORS locked to a single origin with `credentials: true` only for that origin. **Never** `Access-Control-Allow-Origin: *`.
5. GET requests must never change state.

### 3.3 OAuth flow hardening

- Random `state` bound to the pre-login session, single-use, 10-minute TTL. Reject callbacks without a matching state (this stops login CSRF).
- **PKCE** (`code_challenge` S256) even though the app has a backend.
- Exact-match redirect URI; no wildcards; no open redirect after login (allow-list the `returnTo` path, relative paths only).
- Device flow: rate-limit polling, show the user code only in the initiating session.
- Do not put tokens or codes in URLs after the exchange completes; redirect to a clean path.

### 3.4 Brute force and abuse on auth

- PAT submit endpoint: 5 attempts / 15 min per user-or-IP, exponential backoff, and a global cap. Each failed `GET /user` costs us a GitHub call, so limit it.
- Generic error messages ("Token could not be verified"); do not reveal whether a token exists in our system.
- Constant-time comparison for any secret comparison (`crypto.timingSafeEqual`).

### 3.5 Step-up authentication for destructive actions

Deleting a repo, force-style branch deletion, and disconnecting an account require **recent authentication** (re-enter via OAuth reconnect, or a passkey/TOTP later) if the session's last strong auth is older than 10 minutes. Combine with the type-the-name confirmation from the plan.

---

## 4. Authorization and API Input Safety

### 4.1 The rule that prevents IDOR

**The user ID never comes from the request.** `getGithubClient(userId)` receives `userId` only from `session.ts` middleware. No route parameter, header, or body field may select which user's token is used.

GitHub is also an authorization backstop: a user's token can only touch what GitHub allows them to touch. Still, our own layer must hold on its own because of caches (see 4.4).

### 4.2 Confirmation tokens for destructive routes

The plan requires a "confirm token in body." Define it precisely:

- Server-generated, **single-use**, **5-minute TTL**, bound to `(userId, action, target)` e.g. `(u1, delete_repo, owner/name)`.
- Issued by `POST /api/confirm` after the user completes the type-the-name dialog and step-up auth.
- Verified and burned in the same transaction as the action. A token for repo A cannot delete repo B; replaying fails.

### 4.3 Input validation (`packages/shared` Zod schemas, enforced in every route)

| Input | Rule |
|---|---|
| `owner`, `repo` | Regex `^[A-Za-z0-9_.-]{1,100}$`; reject `.` and `..` |
| `path` (file/folder) | Normalize; reject `..` segments, null bytes, backslashes, leading `/`; max length; max depth |
| `ref` / branch | Validate against Git ref rules (no `..`, `@{`, control chars, trailing `.lock`); max 255 |
| Commit message, issue/PR body | Max length (e.g. 64 KB); strip NUL |
| File content | Max size (GitHub limit is 100 MB, we cap far lower for editing, e.g. 1-5 MB); reject on exceed |
| Pagination | Clamp `per_page` (≤ 100) and `page`; cap total pages per request |
| JSON bodies | Max body size at the edge (e.g. 1 MB, larger only on file PUT); reject unknown fields (`.strict()`) |

- **No user-controlled URLs are ever fetched by the server.** The gateway talks only to `api.github.com` (allow-listed host, pinned in code) which removes the SSRF class.
- **GraphQL:** use variables, never string interpolation of user input into queries.
- **Never build shell commands** from user input; the API does not need to spawn processes.
- Parameterized queries only (Drizzle). No raw SQL with interpolation.
- Reject requests with duplicated or oversized headers; set header size limits at the server.

### 4.4 Cache isolation (cross-user leakage)

- Every Redis key **must** start with the authenticated user's ID (`user:{id}:endpoint:params`). A shared key for private-repo data would leak it across users. Enforce in `cache/keys.ts` so a key cannot be built without a `userId`.
- Never cache a response under a public key unless it came from an unauthenticated request for a public resource.
- Test: user A and user B request the same private endpoint; assert B never receives A's cached body.

### 4.5 Error handling

- `errorHandler.ts` returns typed, minimal errors. No stack traces, SQL, file paths, or upstream GitHub error bodies to the client in production.
- Assign each error a correlation ID; log the detail server-side only, redacted.

---

## 5. Client-Side and Rendered-Content Security (XSS is the top web risk here)

The app renders **attacker-controlled text**: Markdown in READMEs, issue and PR bodies, comments, file names, commit messages, and diffs. Any of these can carry XSS. Because the session is HttpOnly the cookie is safer, but XSS can still call `/api/*` as the user, including destructive endpoints.

### 5.1 Markdown and HTML

- `components/Markdown.tsx`: render with a parser that outputs a tree, then sanitize (`rehype-sanitize` with a strict schema, or DOMPurify) with an **allow-list**: no `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, event-handler attributes, `javascript:` / `data:` URLs (except a vetted image case), or `style` attributes.
- Links: `rel="noopener noreferrer nofollow"`, `target="_blank"` only for external; validate the scheme (`https`, `http`, `mailto`).
- **Never** use `dangerouslySetInnerHTML` outside this one sanitized component. Add an ESLint rule (`react/no-danger`) and fail CI on violations.
- **Images:** remote images in user Markdown leak viewer IPs and enable tracking. Proxy them through our backend (like GitHub's Camo) with a signed URL, content-type check, size cap, and no redirects to private IP ranges, or block remote images by default with a click-to-load option. SVG served as image only, never inline.
- Diff and code rendering: escape by default; Shiki output is a token tree rendered as text nodes, not raw HTML strings.

### 5.2 Security headers (in `middleware/securityHeaders.ts` and the CDN)

```
Content-Security-Policy:
  default-src 'none';
  script-src 'self';                      # nonces/hashes if inline is unavoidable
  style-src 'self' 'unsafe-inline';       # tighten to nonces when possible
  img-src 'self' https://avatars.githubusercontent.com data:;
  font-src 'self';
  connect-src 'self';
  worker-src 'self' blob:;                # Monaco workers
  frame-ancestors 'none';
  form-action 'self';
  base-uri 'none';
  object-src 'none';
  require-trusted-types-for 'script';     # after the app is Trusted-Types clean
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Cache-Control: no-store        # on all /api/* responses that carry user data
```

Notes: Monaco needs workers, so test the CSP with it; load Monaco from your own origin, not a third-party CDN. Ship the CSP in **report-only** first, watch reports, then enforce.

### 5.3 Browser-side data at rest

The plan persists the TanStack Query cache to IndexedDB, which stores private repo content in the browser. Trade-off and controls:

- Namespace the database per user ID; **wipe on logout, disconnect, and session expiry.**
- Do not persist high-sensitivity responses (file contents of private repos, secrets scanning hits) unless the user opts in. Persist lists and metadata by default.
- Keep a short max age on persisted entries (e.g. 24 h).
- Never store tokens, CSRF tokens, or the confirm token in IndexedDB, localStorage, or sessionStorage.
- Consider a "shared computer" mode that disables persistence.

### 5.4 Supply chain in the browser

- Self-host all scripts; no third-party analytics or CDN scripts. If ever needed, use Subresource Integrity.
- Lockfile committed; `pnpm install --frozen-lockfile` in CI; review new dependencies.

---

## 6. Availability: Making the App Hard to Crash or Interrupt

### 6.1 Edge protection

- Put the app behind a **CDN/WAF** (Cloudflare or equivalent): DDoS absorption, bot rules, TLS termination, geo/ASN rules if needed. Only the CDN can reach the origin (restrict origin ingress to CDN ranges or use an authenticated origin pull).
- Static frontend on the CDN means most traffic never touches the API.

### 6.2 Rate limiting (layered, in `middleware/rateLimit.ts`)

| Layer | Limit (starting values) | Purpose |
|---|---|---|
| Per IP, all routes | 300 / min | Blunt abuse |
| Per user, reads | 600 / min | Fair use |
| Per user, writes | 60 / min | Slow accidental or malicious bulk actions |
| Auth endpoints (per IP + per account) | 5-10 / 15 min | Brute force |
| Destructive routes | 5 / hour / user | Limits blast radius of a hijacked session |
| Global concurrency cap | Tuned to instance size | Prevents overload |

- Use Redis-backed sliding-window or token bucket. **If Redis is down**, rate limiting falls back to an in-memory limiter per instance (fail *soft* on availability but still limited), while **auth checks fail closed**.
- Return `429` with `Retry-After`. Do not process the body of a rate-limited request.

### 6.3 Protect the GitHub budget (a shared resource)

- Each user's 5,000/hour REST budget is theirs, but abuse can trigger GitHub's **secondary rate limits** or get the OAuth app flagged. Enforce a per-user internal budget below GitHub's so we degrade before GitHub throttles.
- Track `X-RateLimit-Remaining`; when low, serve cache-only and queue background refresh.
- **Circuit breaker** around the gateway: after N consecutive 5xx/timeouts, open the circuit, serve read-only cache, show the "GitHub degraded" banner, probe with a single request until it recovers.
- Timeouts everywhere (connect 2 s, total 10 s for reads; longer, explicit for large writes). No unbounded waits.

### 6.4 Resource exhaustion controls

| Threat | Control |
|---|---|
| Huge request bodies | Body size limits per route; reject before parsing |
| Slowloris / slow bodies | Server header and body timeouts; drop idle connections |
| Cache stampede (many users, same key) | Single-flight: one in-flight fetch per key, others await it |
| Huge repo trees / diffs | Honor GitHub `truncated`, paginate, cap files per diff request, lazy per-file diffs (already planned), hard limits on response size we will buffer |
| Expensive GraphQL | Query cost cap; whitelist query documents server-side (clients never send raw GraphQL) |
| SSE connection floods | Max N SSE streams per user (e.g. 3), heartbeat every 15-30 s, close dead connections, cap total per instance |
| Job queue flooding | BullMQ concurrency and per-user job caps, dedupe by job ID, bounded queue depth, backoff and dead-letter queue |
| Regex DoS | No user-controlled regex; use linear-time patterns (or RE2) for validation |
| Memory leaks / crashes | Streaming for large responses, bounded caches (LRU), container memory limits, restart on OOM |
| Unhandled errors killing the process | Global `unhandledRejection` / `uncaughtException` handlers log and exit cleanly; process supervisor restarts; no crash on a single bad request |

### 6.5 Resilience

- **Health checks** (`/healthz` liveness, `/readyz` checks DB + Redis); at least 2 instances behind a load balancer once past the demo.
- **Graceful shutdown:** stop accepting requests, drain SSE, finish in-flight writes, then exit. Important so a deploy does not cut a folder-delete commit halfway. (The Git Data API sequence is safe: the ref move is the last, atomic step. If it never runs, nothing changed.)
- **Idempotency keys** on write endpoints so a retried request does not double-create.
- **Redis is a cache, not a source of truth.** The app must still function (slower) without it.
- **Backups:** automated Postgres backups with encryption, restore tested quarterly. Losing the DB only loses credentials and audit data, but that still matters.
- **Read-only cached mode** (already in the plan) doubles as the outage fallback.
- **Load test** before launch (k6): find the breaking point, confirm limits engage before the server falls over.

---

## 7. Webhook Security

`/api/webhooks/github` is a public, unauthenticated-by-cookie endpoint. Treat every request as hostile until proven otherwise.

1. Read the **raw body** (do not parse first); compute HMAC-SHA256 with `GITHUB_WEBHOOK_SECRET`; compare with `X-Hub-Signature-256` using `crypto.timingSafeEqual`. Reject on mismatch **before** any parsing or DB work.
2. Enforce a body size cap (GitHub's webhook payloads are ≤ 25 MB; cap lower unless needed).
3. **Dedupe** with `X-GitHub-Delivery` in `webhook_deliveries`; reject repeats (replay defense). Add a retention window (e.g. 7 days) and a cleanup job.
4. Reject events whose `installation.id` / repo does not map to a known user in our DB. **Never trust payload contents for authorization**; use them only to decide which cache keys to invalidate.
5. Respond `2xx` fast, then enqueue processing in BullMQ so slow work cannot cause GitHub timeouts or resource exhaustion.
6. Rate-limit by source IP as a backstop, and optionally allow-list GitHub's published hook IP ranges (`GET /meta`), refreshed periodically. Signature verification stays the primary control; IP filtering is extra.
7. Use a **separate secret per environment**, rotate periodically, and support two valid secrets during rotation.

---

## 8. Infrastructure and Pipeline Security

### 8.1 Secrets

- All secrets in the platform secrets manager. Zero secrets in the repo, Docker image layers, CI logs, or `.env` files that get committed.
- Different secrets for dev, staging, and prod. **Never** reuse the production `TOKEN_ENCRYPTION_KEY` locally.
- `env.ts` fails fast on missing/malformed values (already planned), and rejects weak values in production (e.g. `SESSION_SECRET` shorter than 32 bytes).
- Secret scanning in CI (gitleaks) and GitHub push protection enabled on the repo. Rotate immediately if anything leaks.

### 8.2 Network

- Postgres and Redis on a **private network only**, never on a public IP. TLS to both. Redis with `requirepass`/ACLs, and dangerous commands (`FLUSHALL`, `CONFIG`, `KEYS`) disabled or renamed.
- Egress restriction where the platform allows: the API only needs to reach `api.github.com`, the DB, Redis, and KMS.

### 8.3 Database

- Two roles: `app_rw` (CRUD on tables) and `migrator` (DDL). The running API never has DDL rights.
- `audit_log` grants: the app role has **INSERT and SELECT only** (no UPDATE/DELETE), so an attacker with app-level SQL access cannot quietly erase traces.
- Row-level security is a useful extra layer if using Postgres (policy: `user_id = current_setting('app.user_id')`).
- Encrypted disk / managed encryption at rest; TLS enforced.

### 8.4 Containers and runtime

- Minimal base image (distroless or alpine), **non-root user**, read-only root filesystem, dropped capabilities, no shell in the runtime image where feasible.
- Pin base image digests. Scan images (Trivy/Grype) in CI.
- Resource limits (CPU/memory) so one runaway process cannot starve the host.

### 8.5 Dependencies and CI (`.github/workflows/ci.yml`)

- Dependabot or Renovate; `pnpm audit` gate on high/critical; `--frozen-lockfile`.
- **Pin GitHub Actions to full commit SHAs**, and set workflow `permissions:` to read-only by default. Avoid `pull_request_target` with untrusted code.
- SAST: CodeQL or Semgrep on every PR. Add a custom rule banning `dangerouslySetInnerHTML`, `eval`, `new Function`, and string-built SQL.
- Protect `main`: required reviews, required checks, signed commits if practical.
- Prefer few dependencies; prefer well-maintained crypto (Node's built-in `crypto`, no home-grown crypto, no abandoned packages).
- Generate an SBOM and enable provenance for release builds.

### 8.6 Deployment

- Deploys via CI only; no manual production shell access by default. When needed, time-boxed, logged access.
- Staging environment that mirrors production for security tests.
- Publish `/.well-known/security.txt` with a contact for vulnerability reports.

---

## 9. Logging, Audit, Detection, and Response

### 9.1 Logging

- `requestLog.ts` writes structured logs with a **redaction pass** (`security/redact.ts`) over headers, bodies, and errors. Deny-list: `authorization`, `cookie`, `set-cookie`, anything matching `gh[pousr]_[A-Za-z0-9]{36,}` or `github_pat_[A-Za-z0-9_]{50,}`, plus fields named `token`, `secret`, `password`, `key`.
- **Log hygiene tests:** a unit test feeds fake tokens through the logger and error handler and asserts they never appear.
- Do not log request bodies for auth, file PUT, or vault routes at all.

### 9.2 Tamper-evident audit log

Upgrade `audit_log` from "records writes" to "hard to falsify":

- Add `prev_hash` and `entry_hash = SHA-256(prev_hash || canonical(entry))` (hash chain per user or global). A deleted or edited row breaks the chain, and a nightly job verifies it.
- Append-only DB permissions (8.3). Ship logs to an external sink (log service or object storage with write-once) so a server compromise cannot rewrite history.
- Record: actor, action, target, result, IP, user-agent class, correlation ID, and confirmation token ID for destructive actions. Never record the token or file contents.

### 9.3 Detection and alerting

Alert (page or notify) on:

- Spike in `401/403/429` responses, or many failed logins from one IP or against one account.
- A session used from a new country/ASN shortly after creation.
- Multiple destructive actions in a short window (delete repo/folder bursts).
- Any webhook signature failure burst.
- KMS unwrap volume anomalies (sudden mass decryption is the signature of a token-theft attempt).
- Circuit breaker open, queue depth growing, error-rate or latency SLO breaches, memory growth.
- Hash-chain verification failure.

Add **canary tokens**: a fake credential row with a distinctive token-like value that no code path should ever read; any access triggers a high-severity alert.

### 9.4 Incident response runbooks (`docs/runbooks/`)

| Runbook | Steps in brief |
|---|---|
| Suspected token-vault compromise | Enable kill switch → revoke OAuth grants → rotate KEK and app secrets → force logout all → notify users to rotate PATs on GitHub → review audit log and KMS logs |
| Leaked secret in repo/CI | Rotate immediately → purge history → check usage logs |
| Webhook secret leak | Rotate secret (dual-secret window) → review deliveries |
| DDoS / abuse | Tighten WAF rules → enable "under attack" mode → lower per-user limits |
| Data-loss (user) | Point to Git recoverability: files and folders are commits (revert), repos via archive-first policy |

Keep a user-notification template ready. Practice at least one drill before launch.

---

## 10. Destructive-Action Safeguards (extends plan section 5.4)

| Control | Applies to |
|---|---|
| Type-the-name confirmation | Repo delete |
| Single-use confirm token bound to target | Repo, folder, file delete |
| Step-up / recent re-auth (≤ 10 min) | Repo delete, disconnect |
| Diff/list preview of what is removed | File, folder |
| Archive offered first | Repo |
| Per-user destructive rate limit | All destructive routes |
| Optional cooldown for repo deletion (e.g. 60-second undo window before the API call is sent) | Repo |
| Audit entry on success **and** failure | All |
| Folder-delete as one commit, ref moved last | Folder |
| Refuse to delete the default branch through the branch route | Branches |

---

## 11. AI Layer Security (Week 5 / later)

The AI feature reads untrusted repo content, so it inherits **prompt injection** risk.

- The model may only produce **suggestions** (text). It can never call write endpoints; any action derived from AI output goes through the normal user-confirmed flow.
- Treat repository text as data. Delimit it clearly in prompts and instruct the model to ignore instructions inside it. Do not rely on that alone; the "no autonomous writes" rule is the real control.
- Do not send secrets to the AI provider: run a secret scanner over any content before it leaves (block on findings), and never include tokens or env values.
- Per-user AI rate limits and token budgets to prevent cost-exhaustion attacks.
- Keep the AI provider key in the secrets manager, behind the feature flag.
- Sanitize AI output like any other untrusted Markdown before rendering.

---

## 12. Changes to the Existing Docs

### 12.1 Amendments to `github-clone-plan.md`

| Plan section | Change |
|---|---|
| 3.2 step 3 | Replace "AES-256-GCM, key from env" with envelope encryption + KMS/secrets manager (2.1) |
| 3.2 step 4 | Session cookie becomes `__Host-` prefixed, opaque ID stored hashed (3.1) |
| 3.6 | Add refresh-token locking, PKCE, `state`, revocation on disconnect (2.2, 2.3, 3.3) |
| 5.4 | Add step-up auth, single-use bound confirm tokens, destructive rate limit (3.5, 4.2, 10) |
| 8 (latency) | Note that IndexedDB persistence is per-user and wiped on logout (5.3) |
| 9 (data model) | `credentials`: add `dek_wrapped`, `key_version`, `token_fingerprint`. `sessions`: store `id_hash`, `rotated_at`, `last_strong_auth_at`. `audit_log`: add `prev_hash`, `entry_hash`, `ip`, `correlation_id`. New tables: `confirm_tokens`, `oauth_states` (or Redis) |
| 11 | Add circuit breaker, per-user internal budget, timeouts (6.3) |
| 12 checklist | Replace with the expanded checklist in section 14 below |

### 12.2 Additions to `github-clone-file-structure.md`

```
apps/api/src/
├── middleware/
│   ├── originCheck.ts          # Origin/Referer validation on non-GET
│   ├── bodyLimit.ts            # Per-route body size limits
│   ├── timeout.ts              # Request-level timeouts
│   └── idempotency.ts          # Idempotency-Key handling for writes
├── security/
│   ├── kms.ts                  # KEK wrap/unwrap adapter (KMS, or secrets-manager fallback)
│   ├── confirmToken.ts         # Issue / verify / burn single-use confirm tokens
│   ├── stepUp.ts               # Recent-auth checks
│   ├── validators.ts           # Path, ref, owner/repo validators (shared regexes)
│   ├── imageProxy.ts           # Signed, size-capped image proxy
│   └── auditChain.ts           # Hash-chain append + verify
├── github/
│   └── circuitBreaker.ts       # Open/half-open/closed around the gateway
├── jobs/
│   ├── key-rotation.job.ts     # Re-wrap DEKs under a new KEK
│   ├── audit-verify.job.ts     # Nightly hash-chain verification
│   └── cleanup.job.ts          # Expire sessions, oauth states, confirm tokens, webhook deliveries
└── test/
    └── security/               # Abuse, IDOR, injection, log-redaction, crypto tests

apps/web/src/
├── lib/
│   ├── sanitize.ts             # Single sanitizer config used by Markdown.tsx
│   └── clearClientData.ts      # Wipe IndexedDB/query cache on logout
└── features/auth/
    └── StepUpDialog.tsx        # Re-auth prompt for destructive actions

infra/
├── csp-report-endpoint notes in docs/
docs/
└── runbooks/
    ├── key-rotation.md
    ├── token-compromise.md
    ├── secret-leak.md
    └── ddos-response.md
```

Also add rule to the API section: **only `security/kms.ts` and `security/vault.ts` may import decryption code.** Enforce with an ESLint `no-restricted-imports` rule.

---

## 13. Security Testing Plan

| Test | Tooling | When |
|---|---|---|
| Unit: crypto (round-trip, wrong AAD fails, tamper fails, nonce uniqueness) | Vitest | Every commit |
| Unit: validators (path traversal, ref names, oversized input, unicode tricks) | Vitest + property tests | Every commit |
| Integration: IDOR matrix (user A vs user B on every route and cache key) | Vitest + test Postgres/Redis | Every commit |
| Integration: CSRF (missing header, wrong origin, GET with side effect) | Vitest | Every commit |
| Integration: confirm token replay, wrong target, expired | Vitest | Every commit |
| Log redaction: tokens never appear in logs or errors | Vitest | Every commit |
| Webhook: bad signature, replay, oversize, unknown installation | Vitest | Every commit |
| XSS corpus: run known payloads through `Markdown.tsx`, assert no script execution | Playwright + payload list | Every PR touching rendering |
| Dependency and secret scans | pnpm audit, gitleaks, Trivy | Every PR |
| SAST | CodeQL / Semgrep | Every PR |
| DAST baseline | OWASP ZAP against staging | Weekly / before release |
| Fuzzing of route inputs | Schemathesis or similar against OpenAPI/Zod-derived schema | Before release |
| Load and soak (verify limits and breaker engage) | k6 | Before release |
| Chaos: kill Redis, block GitHub, kill an instance mid-write | Manual scripted drills | Before demo/launch |
| Penetration test | External tester or structured self-test against the OWASP ASVS Level 2 checklist | Before public launch |

Reference frameworks: **OWASP ASVS (L2)**, **OWASP Top 10**, **OWASP API Security Top 10**, and the **OWASP Cheat Sheets** for sessions, CSRF, XSS, and cryptographic storage.

---

## 14. Expanded Security Checklist (replaces plan section 12)

**Credentials and crypto**
- [ ] Envelope encryption; KEK outside the database and app filesystem
- [ ] AAD binds ciphertext to user and credential
- [ ] Key versioning and a tested rotation job
- [ ] Only `vault.ts` decrypts; lint rule enforces it
- [ ] OAuth refresh serialized with a lock
- [ ] Disconnect revokes at GitHub where possible and deletes the row
- [ ] Kill switch script exists and has been tested

**Sessions and auth**
- [ ] Hashed opaque session IDs; `__Host-` cookie; rotation on login
- [ ] Idle and absolute timeouts; server-side revocation
- [ ] OAuth `state` + PKCE; strict redirect URI; no open redirect
- [ ] CSRF: Origin check + token + SameSite; strict CORS
- [ ] Step-up auth on destructive actions
- [ ] Auth endpoints rate-limited; generic errors

**API and data**
- [ ] `userId` only from session; IDOR test matrix passing
- [ ] Zod `.strict()` validation on every route; path/ref validators
- [ ] No server-side fetch of user-supplied URLs
- [ ] Cache keys always prefixed by `userId`; cross-user test passing
- [ ] Single-use, target-bound confirm tokens
- [ ] Minimal error responses; correlation IDs

**Web**
- [ ] One sanitized Markdown component; `no-danger` lint rule
- [ ] CSP (report-only → enforced), Trusted Types, all headers in 5.2
- [ ] Image proxy or click-to-load remote images
- [ ] IndexedDB per user, wiped on logout, short TTL, no tokens
- [ ] Self-hosted scripts; lockfile; SRI if any external asset

**Availability**
- [ ] CDN/WAF in front; origin locked to the CDN
- [ ] Layered rate limits; Redis-down fallback
- [ ] Body limits, timeouts, SSE and queue caps
- [ ] Circuit breaker, single-flight cache fill, per-user GitHub budget
- [ ] Graceful shutdown; idempotency keys; health checks
- [ ] Global unhandled-error handlers; restart supervision
- [ ] Backups encrypted, restore tested

**Webhooks**
- [ ] HMAC on raw body, timing-safe; dedupe; installation mapping
- [ ] Fast 2xx then queue; dual-secret rotation

**Infra and pipeline**
- [ ] Secrets in a secrets manager; separate per environment
- [ ] DB and Redis private, TLS, least-privilege roles; audit table append-only
- [ ] Non-root minimal containers; image scanning
- [ ] Actions pinned by SHA; read-only workflow permissions; SAST; gitleaks; Dependabot
- [ ] Branch protection on `main`

**Detection and response**
- [ ] Redaction tests pass; no secrets in logs
- [ ] Hash-chained audit log, external sink, nightly verify
- [ ] Alerts configured (section 9.3); canary credential in place
- [ ] Runbooks written and one drill completed
- [ ] `security.txt` published

---

## 15. Rollout Priorities

Fit the security work into the existing 5-week build so nothing is bolted on at the end.

| Week | Security deliverables |
|---|---|
| 1 | Envelope-encryption vault + `kms.ts`, `env.ts` strict checks, hashed sessions and `__Host-` cookie, OAuth `state`/PKCE, CSRF + Origin middleware, security headers (CSP report-only), `redact.ts` + log tests, secret scanning + Dependabot + SHA-pinned CI |
| 2 | `validators.ts` on all file/branch routes, body limits and timeouts, sanitized `Markdown.tsx` + XSS test corpus, IDOR test matrix for each new route |
| 3 | Confirm tokens, step-up auth, destructive rate limits, `audit.service.ts` with hash chain, append-only DB role |
| 4 | User-prefixed cache keys + cross-user test, single-flight, circuit breaker, GitHub budgets, webhook hardening + replay tests, SSE caps, IndexedDB wipe on logout, graceful shutdown |
| 5 | WAF/CDN in front, load and chaos tests, ZAP scan, enforce CSP + Trusted Types, alerts + canary, runbooks and one drill, AI safeguards (suggest-only), pre-launch review against ASVS L2 |

**If time is short, do these first (highest risk reduction per hour):**
1. Envelope encryption and never logging or exposing tokens
2. `userId` only from session + cache key isolation
3. Sanitized Markdown + CSP
4. CSRF (Origin + token) and step-up/confirm tokens on destructive actions
5. Rate limits, body limits, timeouts, circuit breaker
6. Webhook signature verification on the raw body
7. Secrets management and CI scanning

---

## 16. Residual Risks (what this spec does not fully remove)

| Risk | Why it remains | Mitigation |
|---|---|---|
| Compromise of a user's GitHub account or PAT elsewhere | Outside our system | Encourage 2FA, fine-grained tokens with expiry |
| Zero-day in a dependency or Node runtime | Unknown by definition | Fast patch process, minimal dependencies, containment (least privilege) |
| Large-scale DDoS | Volumetric attacks need provider capacity | CDN/WAF, autoscaling, read-only cached mode |
| Insider with KMS and DB access | Both controls held by one person | Split access, KMS audit alerts, two-person rule for prod |
| User phishing (fake login page) | Social engineering | OAuth-only login for most users, clear domain, security.txt, education |
| Vulnerabilities in GitHub itself | Upstream | Monitor GitHub status and advisories |

Review this document after each audit pass and after any incident; update the checklist to match what was learned.
