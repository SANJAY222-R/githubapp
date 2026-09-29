import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../middleware/requireAuth.js";
import { listBranches, createBranch, deleteBranch } from "../services/branches.service.js";
import { writeAudit } from "../services/audit.service.js";

const app = new Hono();

const CreateBranchSchema = z.object({
  name: z.string().min(1),
  from: z.string().optional(),
  fromSha: z.string().optional(),
});

app.get("/:owner/:repo/branches", requireAuth, async (c) => {
  const user = c.get("user");
  const { owner, repo } = c.req.param();
  return c.json(await listBranches(user.id, owner, repo));
});

app.post("/:owner/:repo/branches", requireAuth, zValidator("json", CreateBranchSchema), async (c) => {
  const user = c.get("user");
  const { owner, repo } = c.req.param();
  const { name, from, fromSha } = c.req.valid("json");
  const result = await createBranch(user.id, owner, repo, name, from, fromSha);
  await writeAudit(user.id, "branch.create", `${owner}/${repo}#${name}`, "success");
  return c.json(result, 201);
});

app.delete("/:owner/:repo/branches/:name", requireAuth, async (c) => {
  const user = c.get("user");
  const { owner, repo, name } = c.req.param();
  try {
    await deleteBranch(user.id, owner, repo, name);
    await writeAudit(user.id, "branch.delete", `${owner}/${repo}#${name}`, "success");
    return c.body(null, 204);
  } catch (err) {
    await writeAudit(user.id, "branch.delete", `${owner}/${repo}#${name}`, "failure");
    throw err;
  }
});

export default app;
