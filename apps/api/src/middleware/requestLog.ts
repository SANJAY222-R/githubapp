import { createMiddleware } from "hono/factory";
import { redact } from "../security/redact.js";

export const requestLog = createMiddleware(async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const url = redact(c.req.url);
  console.log(
    JSON.stringify({
      method: c.req.method,
      url,
      status: c.res.status,
      ms,
      userId: c.get("user")?.id ?? null,
    })
  );
});
