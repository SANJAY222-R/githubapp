import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { ConnectPatSchema } from "@gitclone/shared";
import { connectPat } from "../services/auth/pat.service.js";
import { getOAuthAuthorizationUrl, handleOAuthCallback } from "../services/auth/oauth.service.js";
import { deleteCredentials } from "../services/auth/session.service.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { db } from "../db/client.js";
import { sessions } from "../db/schema/sessions.js";
import { eq } from "drizzle-orm";
import { COOKIE_NAME } from "../config/constants.js";
import { SESSION_MAX_AGE_MS } from "@gitclone/shared";
import { randomUUID } from "crypto";
import { env } from "../config/env.js";

const app = new Hono();

async function createSession(userId: string): Promise<string> {
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
  await db.insert(sessions).values({ id: sessionId, userId, expiresAt });
  return sessionId;
}

app.post("/pat", zValidator("json", ConnectPatSchema), async (c) => {
  const { token } = c.req.valid("json");
  const { userId } = await connectPat(token);
  const sessionId = await createSession(userId);
  setCookie(c, COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: SESSION_MAX_AGE_MS / 1000,
    path: "/",
  });
  return c.json({ ok: true });
});

app.get("/oauth/start", async (c) => {
  const state = randomUUID();
  const url = await getOAuthAuthorizationUrl(state);
  return c.redirect(url);
});

app.get("/oauth/callback", async (c) => {
  const code = c.req.query("code");
  if (!code) return c.json({ error: "Missing code" }, 400);
  const { userId } = await handleOAuthCallback(code);
  const sessionId = await createSession(userId);
  setCookie(c, COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: SESSION_MAX_AGE_MS / 1000,
    path: "/",
  });
  return c.redirect(env.APP_URL);
});

app.post("/disconnect", requireAuth, async (c) => {
  const user = c.get("user");
  await deleteCredentials(user.id);
  const sessionId = getCookie(c, COOKIE_NAME);
  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }
  deleteCookie(c, COOKIE_NAME, { path: "/" });
  return c.json({ ok: true });
});

export default app;
