import { createMiddleware } from "hono/factory";
import { getCookie, setCookie } from "hono/cookie";
import { db } from "../db/client.js";
import { sessions } from "../db/schema/sessions.js";
import { users } from "../db/schema/users.js";
import { eq, and, gt } from "drizzle-orm";
import { COOKIE_NAME } from "../config/constants.js";
import { hashSessionId, createSession } from "../services/auth/session.service.js";
import { getSharedUser } from "../services/auth/pat.service.js";
import { SESSION_MAX_AGE_MS } from "@gitclone/shared";

export type SessionUser = {
  id: string;
  githubId: number;
  login: string;
  avatarUrl: string;
  name: string | null;
};

declare module "hono" {
  interface ContextVariableMap {
    user: SessionUser;
  }
}

export const sessionMiddleware = createMiddleware(async (c, next) => {
  const isProd = c.env?.NODE_ENV === "production" || process.env.NODE_ENV === "production";
  const cookieName = isProd ? `__Host-${COOKIE_NAME}` : COOKIE_NAME;
  const sessionId = getCookie(c, cookieName) ?? getCookie(c, `__Host-${COOKIE_NAME}`) ?? getCookie(c, COOKIE_NAME);

  if (sessionId) {
    const idHash = hashSessionId(sessionId);

    const rows = await db
      .select({
        userId: sessions.userId,
        expiresAt: sessions.expiresAt,
        id: users.id,
        githubId: users.githubId,
        login: users.login,
        avatarUrl: users.avatarUrl,
        name: users.name,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.idHash, idHash), gt(sessions.expiresAt, new Date())))
      .limit(1);

    const row = rows[0];
    if (row) {
      c.set("user", {
        id: row.id,
        githubId: row.githubId,
        login: row.login,
        avatarUrl: row.avatarUrl,
        name: row.name,
      });
      await next();
      return;
    }
  }

  // Multi-User Shared Runtime PAT Fallback
  const sharedUser = await getSharedUser();
  if (sharedUser) {
    c.set("user", sharedUser);

    // Auto-issue session cookie if not present
    if (!sessionId) {
      try {
        const newSessionId = await createSession(sharedUser.id);
        setCookie(c, cookieName, newSessionId, {
          httpOnly: true,
          secure: isProd,
          sameSite: "Lax",
          maxAge: SESSION_MAX_AGE_MS / 1000,
          path: "/",
        });
      } catch {
        // ignore cookie write issues
      }
    }
  }

  await next();
});

