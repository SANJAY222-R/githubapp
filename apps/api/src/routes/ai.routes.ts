import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { requireAuth } from "../middleware/requireAuth.js";
import { env } from "../config/env.js";
import { generatePrSummary } from "../services/ai/pr-summary.service.js";
import { generateCommitMessage } from "../services/ai/commit-message.service.js";

const app = new Hono();

const featureGuard = createMiddleware(async (c, next) => {
  if (!env.FEATURE_AI) return c.json({ error: "AI features disabled" }, 403);
  await next();
});

app.post("/pr-summary", requireAuth, featureGuard, async (c) => {
  const { title, diff } = await c.req.json<{ title: string; diff: string }>();
  return c.json({ summary: await generatePrSummary(title, diff) });
});

app.post("/commit-message", requireAuth, featureGuard, async (c) => {
  const { diff } = await c.req.json<{ diff: string }>();
  return c.json({ message: await generateCommitMessage(diff) });
});

export default app;
