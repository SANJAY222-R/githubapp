import { describe, it, expect } from "vitest";
import {
  encrypt,
  decrypt,
  encryptWithAad,
  decryptWithAad,
  generateDek,
  computeFingerprint,
} from "../../security/crypto.js";
import { kms, SecretsManagerKmsAdapter } from "../../security/kms.js";
import {
  encryptCredentialToken,
  decryptCredentialToken,
  buildCredentialAad,
} from "../../security/vault.js";
import { randomBytes, randomUUID } from "crypto";

describe("crypto (AES-256-GCM & Envelope Encryption)", () => {
  const key = randomBytes(32).toString("base64");

  it("encrypts and decrypts text round-trip", () => {
    const plain = "ghp_superSecretToken1234567890abcdef";
    const cipher = encrypt(plain, key);
    expect(cipher).not.toBe(plain);
    const decrypted = decrypt(cipher, key);
    expect(decrypted).toBe(plain);
  });

  it("produces different ciphertext each time for the same plaintext due to random IV", () => {
    const plain = "identical_token_value";
    const cipher1 = encrypt(plain, key);
    const cipher2 = encrypt(plain, key);
    expect(cipher1).not.toBe(cipher2);
    expect(decrypt(cipher1, key)).toBe(plain);
    expect(decrypt(cipher2, key)).toBe(plain);
  });

  it("fails decryption when ciphertext is tampered with", () => {
    const plain = "secret";
    const cipher = encrypt(plain, key);
    const tampered = Buffer.from(cipher, "base64");
    tampered[tampered.length - 1] = (tampered[tampered.length - 1] ?? 0) ^ 0x01; // flip one bit
    expect(() => decrypt(tampered.toString("base64"), key)).toThrow();
  });

  it("binds ciphertext to AAD and fails when AAD is changed", () => {
    const dek = generateDek();
    const token = "github_pat_11AAAAAAA0123456789";
    const aad1 = "user-1||cred-1||pat||1";
    const aad2 = "user-2||cred-1||pat||1";

    const cipher = encryptWithAad(token, dek, aad1);
    expect(decryptWithAad(cipher, dek, aad1)).toBe(token);
    expect(() => decryptWithAad(cipher, dek, aad2)).toThrow();
  });

  it("KMS adapter wraps and unwraps DEK with versioning", async () => {
    const testKms = new SecretsManagerKmsAdapter(randomBytes(32).toString("base64"));
    const dek = generateDek();

    const { dekWrapped, keyVersion } = await testKms.wrapKey(dek);
    expect(keyVersion).toBe(1);
    expect(dekWrapped).toBeDefined();

    const unwrapped = await testKms.unwrapKey(dekWrapped, keyVersion);
    expect(unwrapped.equals(dek)).toBe(true);
  });

  it("computes safe token fingerprints", () => {
    const pat = "github_pat_11ABC1234567890";
    const fp = computeFingerprint(pat);
    expect(fp.startsWith("github_pat_")).toBe(true);
    expect(fp).not.toContain(pat);
  });

  it("performs full envelope encryption round-trip via vault", async () => {
    const userId = randomUUID();
    const credentialId = randomUUID();
    const token = "ghp_TestSecretTokenValueForEnvelope999";

    const encrypted = await encryptCredentialToken({
      token,
      userId,
      credentialId,
      authType: "pat",
    });

    expect(encrypted.tokenEnc).not.toBe(token);
    expect(encrypted.dekWrapped).toBeDefined();
    expect(encrypted.keyVersion).toBe(1);
    expect(encrypted.tokenFingerprint).toBeDefined();

    const decrypted = await decryptCredentialToken({
      tokenEnc: encrypted.tokenEnc,
      dekWrapped: encrypted.dekWrapped,
      keyVersion: encrypted.keyVersion,
      userId,
      credentialId,
      authType: "pat",
    });

    expect(decrypted).toBe(token);
  });

  it("fails envelope decryption if copied to another user (AAD mismatch)", async () => {
    const userId1 = randomUUID();
    const userId2 = randomUUID();
    const credentialId = randomUUID();
    const token = "ghp_TestSecretTokenValueForEnvelope999";

    const encrypted = await encryptCredentialToken({
      token,
      userId: userId1,
      credentialId,
      authType: "pat",
    });

    await expect(
      decryptCredentialToken({
        tokenEnc: encrypted.tokenEnc,
        dekWrapped: encrypted.dekWrapped,
        keyVersion: encrypted.keyVersion,
        userId: userId2, // Wrong user
        credentialId,
        authType: "pat",
      })
    ).rejects.toThrow();
  });
});
