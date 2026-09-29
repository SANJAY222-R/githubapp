# Runbook: Suspected Token Vault Compromise

## Severity: CRITICAL (P0)

## Objective
Contain and neutralize suspected token decryption, database credential dumping, or unauthorized bulk token extraction.

---

## 1. Immediate Containment (T+0 to T+15 minutes)

1. **Enable App Kill Switch**:
   - Stop API traffic or toggle maintenance mode to halt further egress.
2. **Revoke Upstream OAuth Grants**:
   - Go to GitHub Developer Settings -> OAuth Applications -> Revoke all user tokens.
3. **Invalidate Active Sessions**:
   ```sql
   DELETE FROM sessions;
   ```
4. **Purge Cached Gateway Clients**:
   - Restart API pods to clear in-memory Octokit clients and token caches.

---

## 2. Investigation & Audit Review (T+15 to T+60 minutes)

1. **Verify Audit Hash Chain Integrity**:
   - Run verification script:
     ```ts
     import { verifyAuditChain } from "./services/audit.service.js";
     const result = await verifyAuditChain();
     console.log("Audit Chain Integrity:", result);
     ```
2. **Inspect KMS Decryption Logs**:
   - Review KMS access logs for anomaly spikes in decryption volume.
3. **Trace Compromise Vector**:
   - Inspect web server access logs for SQL injection, SSRF, or unauthorized shell execution.

---

## 3. Recovery & Notification (T+1 to T+24 hours)

1. **Rotate KEK**:
   - Follow [key-rotation.md](./key-rotation.md) to generate a new KEK and discard compromised keys.
2. **User Notification**:
   - Prompt users who connected via Personal Access Tokens (PATs) to revoke and rotate their PATs on GitHub immediately.
3. **Post-Mortem**:
   - Document timeline, root cause, impacted user accounts, and remediation actions.
