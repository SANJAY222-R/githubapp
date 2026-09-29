# Incident Response & Troubleshooting Notes

## Common Scenarios

### 1. GitHub API Rate Limiting (429 / 403 Secondary Rate Limits)
- **Symptoms:** Users see "Rate limit exceeded" or delayed responses.
- **Diagnostics:**
  - Check `RateLimitBanner` in UI.
  - Review `x-ratelimit-remaining` and `retry-after` in logs.
- **Resolution:**
  - Ensure Redis ETag caching is active (304 Not Modified responses do not count against rate limits).
  - Verify clients aren't aggressively polling without ETags.

### 2. Session Invalidation / Expired Credentials (401 Unauthorized)
- **Symptoms:** API calls fail with `401 Unauthorized` or redirect to login.
- **Diagnostics:**
  - Check if user PAT has expired or OAuth authorization was revoked on GitHub.
- **Resolution:**
  - User reconnects via PAT or OAuth.
  - Check `credentials.last_validated_at` in database.

### 3. Redis / SSE Disconnections
- **Symptoms:** Realtime updates do not stream to the client.
- **Diagnostics:**
  - Check `/api/stream` endpoint status in browser network tab.
  - Check Redis connection status in backend logs.
- **Resolution:**
  - Client will auto-reconnect via `EventSource`.
  - Check reverse proxy timeouts (ensure SSE connections are not terminated early by proxy timeouts like nginx/Cloudflare).
