import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "../../security/crypto.js";
import { randomBytes } from "crypto";

describe("crypto (AES-256-GCM)", () => {
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
});
