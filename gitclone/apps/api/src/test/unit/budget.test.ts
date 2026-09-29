import { describe, it, expect, beforeEach } from "vitest";
import {
  updateGithubBudget,
  isBudgetDepleted,
  getUserBudget,
  clearUserBudgets,
  BUDGET_MINIMUM_THRESHOLD,
} from "../../github/budget.js";

describe("GitHub Rate-Limit Budget Tracking", () => {
  beforeEach(() => {
    clearUserBudgets();
  });

  it("updates and retrieves user budget from response headers", () => {
    updateGithubBudget("u-1", {
      "x-ratelimit-limit": "5000",
      "x-ratelimit-remaining": "4500",
      "x-ratelimit-reset": "1800000000",
    });

    const budget = getUserBudget("u-1");
    expect(budget).toBeDefined();
    expect(budget?.remaining).toBe(4500);
    expect(budget?.limit).toBe(5000);
    expect(isBudgetDepleted("u-1")).toBe(false);
  });

  it("signals budget depletion when remaining requests fall below minimum threshold", () => {
    updateGithubBudget("u-2", {
      "x-ratelimit-limit": "5000",
      "x-ratelimit-remaining": String(BUDGET_MINIMUM_THRESHOLD - 5),
      "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 3600),
    });

    expect(isBudgetDepleted("u-2")).toBe(true);
  });

  it("clears budget depletion once reset timestamp has passed", () => {
    const pastReset = Math.floor(Date.now() / 1000) - 10;
    updateGithubBudget("u-3", {
      "x-ratelimit-limit": "5000",
      "x-ratelimit-remaining": "10",
      "x-ratelimit-reset": String(pastReset),
    });

    expect(isBudgetDepleted("u-3")).toBe(false);
  });
});
