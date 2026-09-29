import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { ConnectPatSchema, OAuthCallbackSchema } from "@gitclone/shared";
import { connectPat } from "../services/auth/pat.service.js";
import { createOAuthState, handleOAuthCallback } from "../services/auth/oauth.service.js";
import { deleteCredentials, createSession, rotateSession, deleteSession } from "../services/auth/session.service.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { destructiveRateLimit } from "../middleware/destructiveRateLimit.js";
import { COOKIE_NAME } from "../config/constants.js";
import { SESSION_MAX_AGE_MS } from "@gitclone/shared";
import { env } from "../config/env.js";

const app = new Hono();

function getEffectiveCookieName(): string {
  return env.NODE_ENV === "production" ? `__Host-${COOKIE_NAME}` : COOKIE_NAME;
}

app.post("/pat", zValidator("json", ConnectPatSchema), async (c) => {
  const { token } = c.req.valid("json");
  const { userId } = await connectPat(token);

  const cookieName = getEffectiveCookieName();
  const oldSessionId = getCookie(c, cookieName) ?? getCookie(c, COOKIE_NAME);
  const sessionId = oldSessionId ? await rotateSession(oldSessionId, userId) : await createSession(userId);

  setCookie(c, cookieName, sessionId, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: SESSION_MAX_AGE_MS / 1000,
    path: "/",
  });

  return c.json({ ok: true });
});

app.get("/oauth/start", async (c) => {
  const { url } = await createOAuthState();
  return c.redirect(url);
});

app.get("/oauth/callback", zValidator("query", OAuthCallbackSchema), async (c) => {
  const { code, state } = c.req.valid("query");
  if (!code) return c.json({ error: "Missing code" }, 400);

  const { userId } = await handleOAuthCallback(code, state);

  const cookieName = getEffectiveCookieName();
  const oldSessionId = getCookie(c, cookieName) ?? getCookie(c, COOKIE_NAME);
  const sessionId = oldSessionId ? await rotateSession(oldSessionId, userId) : await createSession(userId);

  setCookie(c, cookieName, sessionId, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: SESSION_MAX_AGE_MS / 1000,
    path: "/",
  });

  return c.redirect(env.APP_URL);
});

app.post("/disconnect", destructiveRateLimit, requireAuth, async (c) => {
  const user = c.get("user");
  await deleteCredentials(user.id);

  const cookieName = getEffectiveCookieName();
  const sessionId = getCookie(c, cookieName) ?? getCookie(c, COOKIE_NAME);
  if (sessionId) {
    await deleteSession(sessionId);
  }

  deleteCookie(c, cookieName, { path: "/" });
  deleteCookie(c, COOKIE_NAME, { path: "/" });

  return c.json({ ok: true });
});

export default app;
