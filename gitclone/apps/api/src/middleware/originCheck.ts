import { createMiddleware } from "hono/factory";
import { env } from "../config/env.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const originCheck = createMiddleware(async (c, next) => {
  if (SAFE_METHODS.has(c.req.method)) {
    await next();
    return;
  }

  const origin = c.req.header("origin");
  const referer = c.req.header("referer");

  // In production or when origin/referer is present, verify against APP_URL
  const appUrl = new URL(env.APP_URL);
  const allowedOrigin = appUrl.origin;

  if (origin) {
    if (origin !== allowedOrigin && origin !== "http://localhost:5173" && origin !== "http://127.0.0.1:5173") {
      return c.json({ error: "Invalid Origin header" }, 403);
    }
  } else if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (refererOrigin !== allowedOrigin && refererOrigin !== "http://localhost:5173" && refererOrigin !== "http://127.0.0.1:5173") {
        return c.json({ error: "Invalid Referer header" }, 403);
      }
    } catch {
      return c.json({ error: "Malformed Referer header" }, 403);
    }
  }

  await next();
});
