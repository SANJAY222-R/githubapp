import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { db } from "../db/client.js";
import { sessions } from "../db/schema/sessions.js";
import { users } from "../db/schema/users.js";
import { eq, and, gt } from "drizzle-orm";
import { COOKIE_NAME } from "../config/constants.js";

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
  const sessionId = getCookie(c, COOKIE_NAME);
  if (!sessionId) {
    await next();
    return;
  }

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
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
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
  }

  await next();
});
