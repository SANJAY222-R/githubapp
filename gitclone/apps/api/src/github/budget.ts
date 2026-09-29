interface UserBudget {
  remaining: number;
  limit: number;
  resetAt: number;
  lastUpdated: number;
}

const userBudgets = new Map<string, UserBudget>();

export const BUDGET_MINIMUM_THRESHOLD = 50; // Threshold below which internal cache-only mode engages

export function updateGithubBudget(
  userId: string,
  headers: Record<string, string | undefined>
): void {
  if (!userId) return;

  const limit = parseInt(headers["x-ratelimit-limit"] ?? "5000", 10);
  const remaining = parseInt(headers["x-ratelimit-remaining"] ?? "5000", 10);
  const reset = parseInt(headers["x-ratelimit-reset"] ?? "0", 10);

  userBudgets.set(userId, {
    limit,
    remaining,
    resetAt: reset * 1000,
    lastUpdated: Date.now(),
  });
}

export function isBudgetDepleted(userId: string): boolean {
  const budget = userBudgets.get(userId);
  if (!budget) return false;

  // If reset time passed, budget is replenished
  if (budget.resetAt > 0 && Date.now() >= budget.resetAt) {
    return false;
  }

  return budget.remaining < BUDGET_MINIMUM_THRESHOLD;
}

export function getUserBudget(userId: string): UserBudget | null {
  return userBudgets.get(userId) ?? null;
}

export function clearUserBudgets(): void {
  userBudgets.clear();
}
