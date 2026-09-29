import { describe, it, expect } from "vitest";
import { singleFlight, clearInFlight } from "../../cache/singleFlight.js";

describe("Single-Flight Cache Filling (Cache Stampede Defense)", () => {
  it("coalesces multiple concurrent fetches into a single upstream invocation", async () => {
    clearInFlight();
    let invocationCount = 0;

    const slowFetcher = async () => {
      invocationCount++;
      await new Promise((r) => setTimeout(r, 50));
      return { data: "fetched-repo-tree" };
    };

    // Trigger 5 concurrent requests for the exact same cache key
    const promises = [
      singleFlight("user:123:tree:main", slowFetcher),
      singleFlight("user:123:tree:main", slowFetcher),
      singleFlight("user:123:tree:main", slowFetcher),
      singleFlight("user:123:tree:main", slowFetcher),
      singleFlight("user:123:tree:main", slowFetcher),
    ];

    const results = await Promise.all(promises);

    expect(invocationCount).toBe(1);
    for (const res of results) {
      expect(res).toEqual({ data: "fetched-repo-tree" });
    }
  });

  it("runs a new fetch after the in-flight request has completed", async () => {
    clearInFlight();
    let invocationCount = 0;

    const fetcher = async () => {
      invocationCount++;
      return `result-${invocationCount}`;
    };

    const res1 = await singleFlight("key-1", fetcher);
    const res2 = await singleFlight("key-1", fetcher);

    expect(invocationCount).toBe(2);
    expect(res1).toBe("result-1");
    expect(res2).toBe("result-2");
  });

  it("propagates upstream errors to all concurrent waiters", async () => {
    clearInFlight();
    let invocationCount = 0;

    const failingFetcher = async () => {
      invocationCount++;
      await new Promise((r) => setTimeout(r, 20));
      throw new Error("Upstream GitHub 503");
    };

    const promises = [
      singleFlight("fail-key", failingFetcher),
      singleFlight("fail-key", failingFetcher),
    ];

    await expect(Promise.all(promises)).rejects.toThrow("Upstream GitHub 503");
    expect(invocationCount).toBe(1);
  });
});
