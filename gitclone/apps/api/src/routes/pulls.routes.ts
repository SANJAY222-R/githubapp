import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../middleware/requireAuth.js";
import { listPulls, getPull, createPull, mergePull } from "../services/pulls.service.js";
import { CreatePullSchema, MergePullSchema } from "@gitclone/shared";
import { writeAudit } from "../services/audit.service.js";

const app = new Hono();

app.get("/:owner/:repo/pulls", requireAuth, async (c) => {
  const user = c.get("user");
  const { owner, repo } = c.req.param();
  const state = (c.req.query("state") ?? "open") as "open" | "closed" | "all";
  const page = Number(c.req.query("page") ?? "1");
  return c.json(await listPulls(user.id, owner, repo, state, page));
});

app.get("/:owner/:repo/pulls/:number", requireAuth, async (c) => {
  const user = c.get("user");
  const { owner, repo, number } = c.req.param();
  return c.json(await getPull(user.id, owner, repo, Number(number)));
});

app.post("/:owner/:repo/pulls", requireAuth, zValidator("json", CreatePullSchema), async (c) => {
  const user = c.get("user");
  const { owner, repo } = c.req.param();
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
  const body = c.req.valid("json");
  try {
    const result = await mergePull(user.id, owner, repo, Number(number), body);
    await writeAudit(user.id, "pull.merge", `${owner}/${repo}#${number}`, "success", { method: body.mergeMethod });
    return c.json(result);
  } catch (err) {
    await writeAudit(user.id, "pull.merge", `${owner}/${repo}#${number}`, "failure");
    throw err;
  }
});

export default app;
