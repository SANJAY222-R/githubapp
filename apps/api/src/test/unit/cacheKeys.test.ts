import { describe, it, expect } from "vitest";
import { cacheKey, etagKey } from "../../cache/keys.js";

describe("cache keys", () => {
  it("builds consistent cache keys", () => {
    expect(cacheKey("user-123", "repos", "page", 1)).toBe("cache:user-123:repos:page:1");
    expect(cacheKey("user-456", "tree", "owner", "repo", "main")).toBe("cache:user-456:tree:owner:repo:main");
  });

  it("builds consistent etag keys", () => {
    expect(etagKey("user-123", "/user/repos")).toBe("etag:user-123:/user/repos");
  });
});
