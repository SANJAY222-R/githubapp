import { Hono } from "hono";
import { requireAuth } from "../middleware/requireAuth.js";
import { getGithubClient } from "../github/client.js";
import { db } from "../db/client.js";
import { auditLog } from "../db/schema/audit-log.js";
import { eq, desc } from "drizzle-orm";

const app = new Hono();

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const octokit = await getGithubClient(user.id);
  const { data } = await octokit.users.getAuthenticated();
  return c.json({
    id: user.id,
    githubId: user.githubId,
    login: user.login,
    avatarUrl: user.avatarUrl,
    name: data.name,
    bio: data.bio,
    company: data.company,
    location: data.location,
    publicRepos: data.public_repos,
    followers: data.followers,
    following: data.following,
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
