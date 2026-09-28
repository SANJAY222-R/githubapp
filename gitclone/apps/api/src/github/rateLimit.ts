export type RateLimitInfo = {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number | null;
};

export function parseRateLimitHeaders(headers: Record<string, string | undefined>): RateLimitInfo {
  return {
    limit: parseInt(headers["x-ratelimit-limit"] ?? "5000", 10),
    remaining: parseInt(headers["x-ratelimit-remaining"] ?? "5000", 10),
    reset: parseInt(headers["x-ratelimit-reset"] ?? "0", 10),
    retryAfter: headers["retry-after"] ? parseInt(headers["retry-after"], 10) : null,
  };
}
