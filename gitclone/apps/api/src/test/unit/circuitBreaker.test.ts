import { describe, it, expect } from "vitest";
import { CircuitBreaker, GithubDegradedError } from "../../github/circuitBreaker.js";

describe("GitHub Gateway Circuit Breaker", () => {
  it("starts in CLOSED state and executes successful calls normally", async () => {
    const cb = new CircuitBreaker();
    expect(cb.getState()).toBe("CLOSED");

    const result = await cb.execute(async () => "ok");
    expect(result).toBe("ok");
    expect(cb.getState()).toBe("CLOSED");
  });

  it("transitions from CLOSED to OPEN after consecutive server failures reach threshold", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 100 });

    const serverError = { status: 500, message: "Internal server error" };

    // 1st failure
    await expect(cb.execute(async () => { throw serverError; })).rejects.toBeDefined();
    expect(cb.getState()).toBe("CLOSED");

    // 2nd failure
    await expect(cb.execute(async () => { throw serverError; })).rejects.toBeDefined();
    expect(cb.getState()).toBe("CLOSED");

    // 3rd failure (reaches threshold)
    await expect(cb.execute(async () => { throw serverError; })).rejects.toBeDefined();
    expect(cb.getState()).toBe("OPEN");

    // Next call is fast-rejected without executing the function
    let called = false;
    await expect(
      cb.execute(async () => {
        called = true;
        return "data";
      })
    ).rejects.toThrow(GithubDegradedError);
    expect(called).toBe(false);
  });

  it("transitions to HALF_OPEN after cooldown and recovers to CLOSED upon successful probes", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 30, successThreshold: 2 });
    const serverError = { status: 502, message: "Bad gateway" };

    // Trip the breaker to OPEN
    await expect(cb.execute(async () => { throw serverError; })).rejects.toBeDefined();
    await expect(cb.execute(async () => { throw serverError; })).rejects.toBeDefined();
    expect(cb.getState()).toBe("OPEN");

    // Wait for cooldown
    await new Promise((r) => setTimeout(r, 40));
    expect(cb.getState()).toBe("HALF_OPEN");

    // 1st successful probe
    const res1 = await cb.execute(async () => "probe-1");
    expect(res1).toBe("probe-1");
    expect(cb.getState()).toBe("HALF_OPEN");

    // 2nd successful probe (reaches successThreshold -> recovers to CLOSED)
    const res2 = await cb.execute(async () => "probe-2");
    expect(res2).toBe("probe-2");
    expect(cb.getState()).toBe("CLOSED");
  });
});
