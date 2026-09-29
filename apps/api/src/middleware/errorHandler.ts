import type { ErrorHandler } from "hono";
import { AuthExpiredError, MissingPermissionError, RateLimitedError, GithubError } from "../github/errors.js";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof AuthExpiredError) {
    return c.json({ error: "GitHub authentication expired", code: "auth_expired" }, 401);
  }
  if (err instanceof MissingPermissionError) {
    return c.json({ error: err.message, code: "missing_permission", permission: err.permission }, 403);
  }
  if (err instanceof RateLimitedError) {
    c.header("Retry-After", String(err.retryAfter));
    return c.json({ error: err.message, code: "rate_limited" }, 429);
  }
  if (err instanceof GithubError) {
    const status = (err.status >= 400 && err.status < 600 ? err.status : 500) as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500;
    return c.json({ error: err.message }, status);
  }
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
};
