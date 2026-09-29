import { Hono } from "hono";
import { requireAuth } from "../middleware/requireAuth.js";
import { listCommits, getCommitDiff } from "../services/commits.service.js";

const app = new Hono();

app.get("/:owner/:repo/commits", requireAuth, async (c) => {
  const user = c.get("user");
  const { owner, repo } = c.req.param();
  const ref = c.req.query("ref");
  const page = Number(c.req.query("page") ?? "1");
  return c.json(await listCommits(user.id, owner, repo, ref, page));
});

app.get("/:owner/:repo/commits/:sha", requireAuth, async (c) => {
  const user = c.get("user");
  const { owner, repo, sha } = c.req.param();
  return c.json(await getCommitDiff(user.id, owner, repo, sha));
});

export default app;
