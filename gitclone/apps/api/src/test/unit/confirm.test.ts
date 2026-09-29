import { describe, it, expect } from "vitest";
import crypto from "crypto";

describe("Confirmation Tokens and Step-Up Authentication (Unit Tests)", () => {
  const STEP_UP_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
  const CONFIRM_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

  function isStepUpValid(lastStrongAuthAt: Date | null): boolean {
    if (!lastStrongAuthAt) return false;
    const age = Date.now() - new Date(lastStrongAuthAt).getTime();
    return age <= STEP_UP_MAX_AGE_MS;
  }

  function hashToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
  }

  function isTokenExpired(expiresAt: Date): boolean {
    return Date.now() >= expiresAt.getTime();
  }

  it("evaluates step-up authentication freshness correctly", () => {
    const recentAuth = new Date(Date.now() - 2 * 60 * 1000); // 2 mins ago
    const expiredAuth = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago

    expect(isStepUpValid(recentAuth)).toBe(true);
    expect(isStepUpValid(expiredAuth)).toBe(false);
    expect(isStepUpValid(null)).toBe(false);
  });

  it("hashes confirmation token deterministically with SHA-256", () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    expect(rawToken.length).toBe(64);

    const hash1 = hashToken(rawToken);
    const hash2 = hashToken(rawToken);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("validates token expiration TTL correctly", () => {
    const validExpiresAt = new Date(Date.now() + CONFIRM_TOKEN_TTL_MS);
    const pastExpiresAt = new Date(Date.now() - 1000);

    expect(isTokenExpired(validExpiresAt)).toBe(false);
    expect(isTokenExpired(pastExpiresAt)).toBe(true);
  });

  it("detects mismatched action or target in confirmation check", () => {
    const record = {
      action: "delete_repo",
      target: "octocat/hello-world",
      userId: "u-123",
    };

    const isMatch = (action: string, target: string, userId: string) =>
      record.action === action && record.target === target && record.userId === userId;

    expect(isMatch("delete_repo", "octocat/hello-world", "u-123")).toBe(true);
    expect(isMatch("delete_branch", "octocat/hello-world", "u-123")).toBe(false);
    expect(isMatch("delete_repo", "octocat/other-repo", "u-123")).toBe(false);
    expect(isMatch("delete_repo", "octocat/hello-world", "u-999")).toBe(false);
  });
});
