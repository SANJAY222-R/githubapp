export function buildEtagKey(userId: string, endpoint: string, params?: string): string {
  return `etag:${userId}:${endpoint}:${params ?? ""}`;
}
