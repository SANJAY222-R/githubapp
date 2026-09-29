import { Hono } from "hono";
import { requireAuth } from "../middleware/requireAuth.js";
import { getAuthenticatedUserProfile } from "../services/auth/session.service.js";
import { db } from "../db/client.js";
import { auditLog } from "../db/schema/audit-log.js";
import { eq, desc } from "drizzle-orm";

const app = new Hono();

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const profile = await getAuthenticatedUserProfile(user.id);
  return c.json({
    id: user.id,
    githubId: user.githubId,
    login: user.login,
    avatarUrl: user.avatarUrl,
    name: profile.name,
    bio: profile.bio,
    company: profile.company,
    location: profile.location,
    publicRepos: profile.publicRepos,
    followers: profile.followers,
    following: profile.following,
  });
});

app.get("/audit", requireAuth, async (c) => {
  const user = c.get("user");
  const entries = await db.select().from(auditLog).where(eq(auditLog.userId, user.id)).orderBy(desc(auditLog.createdAt)).limit(100);
  return c.json(entries.map((e) => ({
    id: e.id,
    action: e.action,
    target: e.target,
    status: e.status,
    metadata: e.metadataJson ?? {},
    createdAt: e.createdAt,
  })));
});

export default app;
