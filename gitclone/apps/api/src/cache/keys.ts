import { ValidationError } from "../errors.js";

function assertValidUserId(userId: string): void {
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    throw new ValidationError(
      "Cache key requires a valid userId to enforce cross-user isolation",
      "missing_cache_user_id"
    );
  }
}

export function cacheKey(userId: string, resource: string, ...parts: (string | number)[]): string {
  assertValidUserId(userId);
  const resourcePart = resource ? `:${resource}` : "";
  const extraParts = parts.length > 0 ? `:${parts.join(":")}` : "";
  return `user:${userId}${resourcePart}${extraParts}`;
}

export function etagKey(userId: string, endpoint: string): string {
  assertValidUserId(userId);
  return `etag:user:${userId}:${endpoint}`;
}

export function userCachePattern(userId: string): string {
  assertValidUserId(userId);
  return `user:${userId}:*`;
}
