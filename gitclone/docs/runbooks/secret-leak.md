# Runbook: Secret Leak Incident Response

## Severity: HIGH (P1)

## Trigger
A secret (e.g. GitHub Client Secret, KEK, Database Password, Session Secret) is detected in git history, issue tracker, public build logs, or client-side assets.

---

## 1. Immediate Invalidation & Rotation
1. **Revoke the Leaked Secret Immediately**:
   - Do NOT simply commit a deletion of the file—the secret remains in Git history.
   - Immediately regenerate the compromised credential in the respective provider (GitHub Developer Portal, Database host, Cloud Provider).
2. **Update Platform Secrets Manager**:
   - Update staging and production secrets managers with the newly generated value.
3. **Restart Application Services**:
   - Redeploy running instances with updated environment variables.

---

## 2. Git History Sanitization
1. **Purge Secret from Repository History**:
   - Use `git-filter-repo` or BFG Repo-Cleaner:
     ```bash
     git filter-repo --invert-paths --path <leaked-file-path>
     ```
2. **Force-Push Cleaned History**:
   - Coordinate with all contributors to re-clone the repository.

---

## 3. Post-Incident Hardening
1. Ensure Gitleaks and pre-commit hooks are active on all developer environments.
2. Confirm GitHub Secret Scanning and Push Protection are enabled on the repository settings.
