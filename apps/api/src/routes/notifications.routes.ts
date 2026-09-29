import { Hono } from "hono";
import { requireAuth } from "../middleware/requireAuth.js";
import { listNotifications } from "../services/notifications.service.js";

const app = new Hono();

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const page = Number(c.req.query("page") ?? "1");
  return c.json(await listNotifications(user.id, page));
});

export default app;
