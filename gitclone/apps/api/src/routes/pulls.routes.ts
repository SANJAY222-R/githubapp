import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../middleware/requireAuth.js";
import { listPulls, getPull, createPull, mergePull } from "../services/pulls.service.js";
import { CreatePullSchema, MergePullSchema } from "@gitclone/shared";
import { writeAudit } from "../services/audit.service.js";
import { assertOwnerRepo, validatePagination } from "../security/validators.js";
import { ValidationError } from "../errors.js";

const app = new Hono();

app.get("/:owner/:repo/pulls", requireAuth, async (c) => {
  const user = c.get("user");
  const { owner, repo } = c.req.param();
  assertOwnerRepo(owner, repo);
  const rawState = c.req.query("state") ?? "open";
  if (rawState !== "open" && rawState !== "closed" && rawState !== "all") {
    throw new ValidationError("Invalid state filter (must be open, closed, or all)", "invalid_state");
  }
  const state = rawState as "open" | "closed" | "all";
  const { page } = validatePagination(c.req.query("page"));
  return c.json(await listPulls(user.id, owner, repo, state, page));
});

app.get("/:owner/:repo/pulls/:number", requireAuth, async (c) => {
  const user = c.get("user");
  const { owner, repo, number } = c.req.param();
  assertOwnerRepo(owner, repo);
  const num = parseInt(number, 10);
  if (isNaN(num) || num < 1) {
    throw new ValidationError("Invalid pull request number", "invalid_number");
  }
  return c.json(await getPull(user.id, owner, repo, num));
});

app.post("/:owner/:repo/pulls", requireAuth, zValidator("json", CreatePullSchema), async (c) => {
  const user = c.get("user");
  const { owner, repo } = c.req.param();
  assertOwnerRepo(owner, repo);
  const body = c.req.valid("json");
  try {
    const pr = await createPull(user.id, owner, repo, body);
    await writeAudit(user.id, "pull.create", `${owner}/${repo}#${pr.number}`, "success");
    return c.json(pr, 201);
  } catch (err) {
    await writeAudit(user.id, "pull.create", `${owner}/${repo}`, "failure");
    throw err;
  }
});

app.post("/:owner/:repo/pulls/:number/merge", requireAuth, zValidator("json", MergePullSchema), async (c) => {
  const user = c.get("user");
  const { owner, repo, number } = c.req.param();
  assertOwnerRepo(owner, repo);
  const num = parseInt(number, 10);
  if (isNaN(num) || num < 1) {
    throw new ValidationError("Invalid pull request number", "invalid_number");
  }
  const body = c.req.valid("json");
  try {
    const result = await mergePull(user.id, owner, repo, num, body);
    await writeAudit(user.id, "pull.merge", `${owner}/${repo}#${number}`, "success", { method: body.mergeMethod });
    return c.json(result);
  } catch (err) {
    await writeAudit(user.id, "pull.merge", `${owner}/${repo}#${number}`, "failure");
    throw err;
  }
});

export default app;
