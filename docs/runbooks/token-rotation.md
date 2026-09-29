# Token & Key Rotation Runbook

## 1. `TOKEN_ENCRYPTION_KEY` Rotation

The `TOKEN_ENCRYPTION_KEY` is a 256-bit (32-byte) AES key encoded in Base64 used to encrypt user GitHub tokens in the `credentials` table.

### Rotation Procedure:
1. Generate a new key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
2. Run re-encryption migration script (decrypting with old key and encrypting with new key).
3. Update environment secret `TOKEN_ENCRYPTION_KEY`.
4. Restart backend servers.

---

## 2. GitHub OAuth Secret Rotation

1. Go to GitHub Settings → Developer Settings → GitHub Apps / OAuth Apps.
2. Generate a new Client Secret.
3. Update `GITHUB_CLIENT_SECRET` in backend environment variables.
4. Verify OAuth login flow.
5. Delete the old secret on GitHub.

---

## 3. GitHub Webhook Secret Rotation

1. Go to GitHub App / Webhook Settings.
2. Update the Webhook Secret.
3. Update `GITHUB_WEBHOOK_SECRET` in backend environment variables.
4. Verify incoming webhooks receive `200 OK` and HMAC signature validation passes.
