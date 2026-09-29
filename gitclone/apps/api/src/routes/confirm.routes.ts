import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../middleware/requireAuth.js";
import { issueConfirmToken } from "../services/auth/confirm.service.js";

const app = new Hono();

const RequestConfirmSchema = z
  .object({
    action: z.enum(["delete_repo", "delete_branch", "delete_folder", "disconnect"]),
    target: z.string().min(1).max(500),
  })
  .strict();

app.post("/", requireAuth, zValidator("json", RequestConfirmSchema), async (c) => {
  const user = c.get("user");
  const { action, target } = c.req.valid("json");
  const result = await issueConfirmToken(user.id, action, target);
  return c.json(result);
});

export default app;
