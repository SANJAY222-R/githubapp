# Runbook: Secret and Key Rotation

## Overview
This runbook describes the procedure for rotating Master Key Encryption Keys (KEK), GitHub Webhook Secrets, and Session Signing Secrets with zero downtime and minimal disruption.

---

## 1. Rotating the Key Encryption Key (KEK)

### Frequency
- Scheduled: Annually
- Unscheduled: Upon suspected compromise of infrastructure or secrets manager

### Procedure
1. **Generate New KEK (v2)**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
2. **Configure KMS / Environment**:
   - Add `TOKEN_ENCRYPTION_KEY_V2=<new_key>` and `CURRENT_KEY_VERSION=2` to Secrets Manager.
   - Keep `TOKEN_ENCRYPTION_KEY_V1=<old_key>` active to allow re-encryption of existing credentials.
3. **Run Batch Re-encryption**:
   - The KMS adapter decrypts credentials using their stored `key_version` and re-encrypts using `CURRENT_KEY_VERSION` with a freshly generated DEK.
4. **Retire Old KEK**:
   - Once all rows in `credentials` have `key_version = 2`, remove `TOKEN_ENCRYPTION_KEY_V1`.

---

## 2. Rotating the GitHub Webhook Secret (Zero-Downtime Dual-Secret Window)

### Procedure
1. **Generate New Secret**:
   ```bash
   openssl rand -hex 32
   ```
2. **Deploy Dual Secret**:
   - Set `GITHUB_WEBHOOK_SECRET=<new_secret>`
   - Set `GITHUB_WEBHOOK_SECRET_FALLBACK=<old_secret>`
   - Deploy the API. The API verifies incoming webhook signatures against both secrets.
3. **Update GitHub Webhook Settings**:
   - Go to GitHub App / Webhook Settings -> Update secret to `<new_secret>`.
4. **Remove Fallback Secret**:
   - Monitor webhook delivery logs. Once confirmed that all incoming requests use the new secret, remove `GITHUB_WEBHOOK_SECRET_FALLBACK`.

---

## 3. Rotating Session Secrets

### Procedure
1. Set new `SESSION_SECRET` in environment.
2. Existing active sessions will expire and require user re-authentication upon next request.
