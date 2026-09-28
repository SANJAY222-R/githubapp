import { createMiddleware } from "hono/factory";
import { CSRF_HEADER } from "../config/constants.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const csrfMiddleware = createMiddleware(async (c, next) => {
  if (SAFE_METHODS.has(c.req.method)) {
    await next();
    return;
  }

  const csrfToken = c.req.header(CSRF_HEADER);
  if (!csrfToken) {
    return c.json({ error: "CSRF token required" }, 403);
  }

  await next();
});
