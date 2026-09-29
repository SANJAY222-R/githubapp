export function cacheKey(userId: string, resource: string, ...parts: (string | number)[]) {
  return `cache:${userId}:${resource}:${parts.join(":")}`;
}

export function etagKey(userId: string, endpoint: string) {
  return `etag:${userId}:${endpoint}`;
}
