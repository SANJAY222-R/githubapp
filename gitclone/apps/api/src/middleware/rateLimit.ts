import { createMiddleware } from "hono/factory";
import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from "../config/constants.js";

const buckets = new Map<string, { count: number; reset: number }>();

export const rateLimitMiddleware = createMiddleware(async (c, next) => {
  const user = c.get("user");
  const key = user?.id ?? c.req.header("x-forwarded-for") ?? "anon";
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket || now > bucket.reset) {
    bucket = { count: 0, reset: now + RATE_LIMIT_WINDOW_MS };
    buckets.set(key, bucket);
  }

  bucket.count++;

  c.header("X-RateLimit-Limit", String(RATE_LIMIT_MAX));
  c.header("X-RateLimit-Remaining", String(Math.max(0, RATE_LIMIT_MAX - bucket.count)));
  c.header("X-RateLimit-Reset", String(Math.floor(bucket.reset / 1000)));

  if (bucket.count > RATE_LIMIT_MAX) {
    return c.json({ error: "Too many requests" }, 429);
  }

  await next();
});
