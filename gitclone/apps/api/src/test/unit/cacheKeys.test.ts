import { describe, it, expect } from "vitest";
import { cacheKey, etagKey } from "../../cache/keys.js";

describe("cache keys", () => {
  it("builds consistent user-prefixed cache keys", () => {
    expect(cacheKey("user-123", "repos", "page", 1)).toBe("user:user-123:repos:page:1");
    expect(cacheKey("user-456", "tree", "owner", "repo", "main")).toBe("user:user-456:tree:owner:repo:main");
  });

  it("builds consistent user-prefixed etag keys", () => {
    expect(etagKey("user-123", "/user/repos")).toBe("etag:user:user-123:/user/repos");
  });
});
