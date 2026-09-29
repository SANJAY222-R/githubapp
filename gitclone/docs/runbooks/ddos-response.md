# Runbook: DDoS and High-Volume Abuse Response

## Severity: HIGH (P1)

## Trigger
Spike in inbound requests overwhelming the API, elevated 429/504 errors, circuit breaker trips, or saturation of database/redis connections.

---

## 1. Edge Mitigation
1. **Enable WAF / Cloudflare "Under Attack" Mode**:
   - Challenges incoming traffic with JS/Managed Challenges at the CDN edge before reaching the origin.
2. **Apply IP / Geo Rate Limiting**:
   - Block top offending autonomous systems (ASNs) and source IP ranges identified in access metrics.
3. **Lock Origin Ingress**:
   - Verify that origin servers only accept traffic from CDN edge IP blocks.

---

## 2. Application-Level Throttling
1. **Engage Read-Only Cached Mode**:
   - Serve existing cache entries for repo trees and issues without executing upstream GitHub REST calls.
2. **Lower Rate-Limit Thresholds**:
   - Reduce per-IP limit from 300/min to 60/min via runtime configuration or environment variable.
3. **Circuit Breaker Inspection**:
   - Verify that the GitHub gateway circuit breaker is OPEN to protect the outbound 5,000 req/hr budget.

---

## 3. Post-Incident Review
1. Identify attack signature (path target, query pattern, user-agent).
2. Add permanent WAF rules blocking the identified pattern.
