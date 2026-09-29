import { Hono } from "hono";
import { requireAuth } from "../middleware/requireAuth.js";
import { listCommits, getCommitDiff } from "../services/commits.service.js";
import { assertOwnerRepo, validateGitRef, validatePagination } from "../security/validators.js";
import { z } from "zod";

const app = new Hono();

const ShaParamSchema = z.string().regex(/^[a-f0-9]{1,40}$/i, "Invalid commit SHA");

app.get("/:owner/:repo/commits", requireAuth, async (c) => {
  const user = c.get("user");
  const { owner, repo } = c.req.param();
  assertOwnerRepo(owner, repo);
  const rawRef = c.req.query("ref");
  const ref = rawRef ? validateGitRef(rawRef) : undefined;
  const { page } = validatePagination(c.req.query("page"));
  return c.json(await listCommits(user.id, owner, repo, ref, page));
});

app.get("/:owner/:repo/commits/:sha", requireAuth, async (c) => {
  const user = c.get("user");
  const { owner, repo, sha } = c.req.param();
  assertOwnerRepo(owner, repo);
  ShaParamSchema.parse(sha);
  return c.json(await getCommitDiff(user.id, owner, repo, sha));
});

export default app;
