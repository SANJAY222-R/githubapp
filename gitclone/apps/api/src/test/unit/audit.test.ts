import { describe, it, expect } from "vitest";
import {
  computeAuditEntryHash,
  GENESIS_HASH,
} from "../../services/audit.service.js";
import { redactSensitive } from "../../security/redact.js";

describe("Tamper-Evident Hash-Chained Audit Log (Unit Tests)", () => {
  it("computes deterministic SHA-256 canonical entry hashes", () => {
    const hash1 = computeAuditEntryHash(
      GENESIS_HASH,
      "user-1",
      "repo.create",
      "owner/repo",
      "success",
      { isPrivate: true },
      "corr-123"
    );
    const hash2 = computeAuditEntryHash(
      GENESIS_HASH,
      "user-1",
      "repo.create",
      "owner/repo",
      "success",
      { isPrivate: true },
      "corr-123"
    );
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("verifies hash-chain progression integrity", () => {
    // Simulate hash-chained sequence
    const entry1Prev = GENESIS_HASH;
    const entry1Hash = computeAuditEntryHash(
      entry1Prev,
      "user-1",
      "repo.create",
      "owner/repo1",
      "success",
      null
    );

    const entry2Prev = entry1Hash;
    const entry2Hash = computeAuditEntryHash(
      entry2Prev,
      "user-1",
      "file.put",
      "owner/repo1/README.md",
      "success",
      { message: "init" }
    );

    const entry3Prev = entry2Hash;
    const entry3Hash = computeAuditEntryHash(
      entry3Prev,
      "user-1",
      "branch.create",
      "owner/repo1#feature",
      "success",
      null
    );

    expect(entry1Hash).toMatch(/^[a-f0-9]{64}$/);
    expect(entry2Hash).toMatch(/^[a-f0-9]{64}$/);
    expect(entry3Hash).toMatch(/^[a-f0-9]{64}$/);
    expect(entry1Hash).not.toBe(entry2Hash);
    expect(entry2Hash).not.toBe(entry3Hash);
  });

  it("detects tampering when an entry payload in the chain is modified", () => {
    const entry1Hash = computeAuditEntryHash(
      GENESIS_HASH,
      "user-1",
      "repo.create",
      "owner/repo1",
      "success",
      null
    );

    const entry2HashOriginal = computeAuditEntryHash(
      entry1Hash,
      "user-1",
      "repo.delete",
      "owner/repo1",
      "success",
      null
    );

    // Tampered payload
    const entry2HashTampered = computeAuditEntryHash(
      entry1Hash,
      "user-1",
      "repo.delete",
      "owner/tampered-repo", // changed target
      "success",
      null
    );

    expect(entry2HashOriginal).not.toBe(entry2HashTampered);
  });

  it("redacts sensitive fields from audit metadata", () => {
    const rawMetadata = {
      token: "ghp_super_secret_token_123456789012345678",
      secret: "my-webhook-secret",
      apiKey: "sk-12345",
      safeField: "safeValue",
    };

    const redacted = redactSensitive(rawMetadata) as Record<string, unknown>;
    expect(redacted.token).toBe("[REDACTED]");
    expect(redacted.secret).toBe("[REDACTED]");
    expect(redacted.apiKey).toBe("[REDACTED]");
    expect(redacted.safeField).toBe("safeValue");
  });
});
