import { Hono } from "hono";
import { verifyWebhookSignature } from "../security/webhookSignature.js";
import { env } from "../config/env.js";
import { db } from "../db/client.js";
import { webhookDeliveries } from "../db/schema/webhook-deliveries.js";
import { broadcastToAll } from "../realtime/hub.js";
import type { RealtimePayload } from "../realtime/events.js";

const app = new Hono();

app.post("/github", async (c) => {
  const rawBody = await c.req.text();
  const sig = c.req.header("x-hub-signature-256") ?? "";
  const deliveryId = c.req.header("x-github-delivery") ?? "";
  const event = c.req.header("x-github-event") ?? "";

  if (!verifyWebhookSignature(rawBody, sig, env.GITHUB_WEBHOOK_SECRET)) {
    return c.json({ error: "invalid signature" }, 401);
  }

  await db.insert(webhookDeliveries).values({ deliveryId: deliveryId, event, receivedAt: new Date() }).onConflictDoNothing();

  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { return c.json({ ok: true }); }

  const p = payload as Record<string, unknown>;
  let realtimePayload: RealtimePayload | null = null;

  if (event === "push") {
    const repo = (p["repository"] as Record<string, unknown>);
    const owner = (repo["owner"] as Record<string, unknown>)["login"] as string;
    realtimePayload = { type: "push", owner, repo: repo["name"] as string, ref: p["ref"] as string, commits: (p["commits"] as unknown[]).length };
  } else if (event === "pull_request") {
    const repo = (p["repository"] as Record<string, unknown>);
    const owner = (repo["owner"] as Record<string, unknown>)["login"] as string;
    realtimePayload = { type: "pull_request", action: p["action"] as string, owner, repo: repo["name"] as string, number: (p["pull_request"] as Record<string, unknown>)["number"] as number };
  } else if (event === "issues") {
    const repo = (p["repository"] as Record<string, unknown>);
    const owner = (repo["owner"] as Record<string, unknown>)["login"] as string;
    realtimePayload = { type: "issues", action: p["action"] as string, owner, repo: repo["name"] as string, number: (p["issue"] as Record<string, unknown>)["number"] as number };
  } else if (event === "ping") {
    realtimePayload = { type: "ping", zen: p["zen"] as string };
  }

  if (realtimePayload) broadcastToAll(realtimePayload.type, realtimePayload);

  return c.json({ ok: true });
});

export default app;
