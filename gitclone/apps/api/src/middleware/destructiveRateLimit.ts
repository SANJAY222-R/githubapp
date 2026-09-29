import { createMiddleware } from "hono/factory";

const destructiveBuckets = new Map<string, { count: number; reset: number }>();
const DESTRUCTIVE_MAX = 5;
const DESTRUCTIVE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export const destructiveRateLimit = createMiddleware(async (c, next) => {
  const user = c.get("user");
  const key = `destructive:${user?.id ?? c.req.header("x-forwarded-for") ?? "anon"}`;
  const now = Date.now();

  let bucket = destructiveBuckets.get(key);
  if (!bucket || now > bucket.reset) {
    bucket = { count: 0, reset: now + DESTRUCTIVE_WINDOW_MS };
    destructiveBuckets.set(key, bucket);
  }

  bucket.count++;

  c.header("X-RateLimit-Destructive-Limit", String(DESTRUCTIVE_MAX));
  c.header("X-RateLimit-Destructive-Remaining", String(Math.max(0, DESTRUCTIVE_MAX - bucket.count)));

  if (bucket.count > DESTRUCTIVE_MAX) {
    const retryAfter = Math.ceil((bucket.reset - now) / 1000);
    c.header("Retry-After", String(retryAfter));
    return c.json(
      {
        error: "Too many destructive actions. Allowed: 5 per hour.",
        code: "destructive_rate_limited",
      },
      429
    );
  }

  await next();
});
