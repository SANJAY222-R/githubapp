import { createMiddleware } from "hono/factory";

export const requireAuth = createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});
