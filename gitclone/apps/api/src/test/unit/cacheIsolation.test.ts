import { describe, it, expect } from "vitest";
import { cacheKey, etagKey, userCachePattern } from "../../cache/keys.js";
import { ValidationError } from "../../errors.js";

describe("Cache Isolation and User Namespace Security", () => {
  it("generates user-prefixed cache keys ensuring strict cross-user isolation", () => {
    const aliceKey = cacheKey("user_alice_123", "repos", "list", "page-1");
    const bobKey = cacheKey("user_bob_456", "repos", "list", "page-1");

    expect(aliceKey).toBe("user:user_alice_123:repos:list:page-1");
    expect(bobKey).toBe("user:user_bob_456:repos:list:page-1");
    expect(aliceKey).not.toBe(bobKey);
  });

  it("generates user-prefixed etag keys", () => {
    const etag = etagKey("user_alice_123", "/repos/owner/repo");
    expect(etag).toBe("etag:user:user_alice_123:/repos/owner/repo");
  });

  it("generates scoped wildcard user cache invalidation patterns", () => {
    const pattern = userCachePattern("user_alice_123");
    expect(pattern).toBe("user:user_alice_123:*");
  });

  it("rejects cache key generation when userId is missing, empty, or whitespace", () => {
    expect(() => cacheKey("", "repos")).toThrow(ValidationError);
    expect(() => cacheKey("   ", "repos")).toThrow(ValidationError);
    expect(() => etagKey("", "endpoint")).toThrow(ValidationError);
    expect(() => userCachePattern("")).toThrow(ValidationError);
  });
});
