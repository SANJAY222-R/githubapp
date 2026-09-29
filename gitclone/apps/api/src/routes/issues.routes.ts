import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../middleware/requireAuth.js";
import { listIssues, getIssue, createIssue } from "../services/issues.service.js";
import { CreateIssueSchema } from "@gitclone/shared";
import { writeAudit } from "../services/audit.service.js";
import { assertOwnerRepo, validatePagination } from "../security/validators.js";
import { ValidationError } from "../errors.js";

const app = new Hono();

app.get("/:owner/:repo/issues", requireAuth, async (c) => {
  const user = c.get("user");
  const { owner, repo } = c.req.param();
  assertOwnerRepo(owner, repo);
  const rawState = c.req.query("state") ?? "open";
  if (rawState !== "open" && rawState !== "closed" && rawState !== "all") {
    throw new ValidationError("Invalid state filter (must be open, closed, or all)", "invalid_state");
  }
  const state = rawState as "open" | "closed" | "all";
  const { page } = validatePagination(c.req.query("page"));
  return c.json(await listIssues(user.id, owner, repo, state, page));
});

app.get("/:owner/:repo/issues/:number", requireAuth, async (c) => {
  const user = c.get("user");
  const { owner, repo, number } = c.req.param();
  assertOwnerRepo(owner, repo);
  const num = parseInt(number, 10);
  if (isNaN(num) || num < 1) {
    throw new ValidationError("Invalid issue number", "invalid_number");
  }
  return c.json(await getIssue(user.id, owner, repo, num));
});

app.post("/:owner/:repo/issues", requireAuth, zValidator("json", CreateIssueSchema), async (c) => {
  const user = c.get("user");
  const { owner, repo } = c.req.param();
  assertOwnerRepo(owner, repo);
  const body = c.req.valid("json");
  try {
    const issue = await createIssue(user.id, owner, repo, body);
    await writeAudit(user.id, "issue.create", `${owner}/${repo}#${issue.number}`, "success");
    return c.json(issue, 201);
  } catch (err) {
    await writeAudit(user.id, "issue.create", `${owner}/${repo}`, "failure");
    throw err;
  }
});

export default app;
